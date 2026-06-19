const { app, BrowserWindow, Menu, Tray, clipboard, ipcMain, nativeImage, globalShortcut, shell, screen, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { parseTable, tableToTsv } = require('./tableParser');

app.disableHardwareAcceleration();

const STATE_FILE = 'clipboard-lite-state.json';
const INPUT_HELPER_VERSION = '2';
const DEFAULT_SETTINGS = {
  monitorClipboard: true,
  hideOnClose: true,
  maxItems: 200,
  panelShortcut: 'Control+Shift+V',
  launchOnStartup: false
};

let mainWindow = null;
let panelWindow = null;
let tray = null;
let clipboardTimer = null;
let clipboardWatcherPaused = false;
let suppressNextClipboardRead = false;
let lastClipboardSignature = '';
let pendingLinkPromptUrl = '';
let lastFocusedExternalWindow = null;
let lastFocusedExternalHwnd = '';
let inputHelperPath = '';
let state = {
  settings: { ...DEFAULT_SETTINGS },
  history: []
};

function sortHistoryItems(items) {
  return [...items].sort((a, b) => {
    const aPinned = a.pinned ? 1 : 0;
    const bPinned = b.pinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });
}

function getStatePath() {
  return path.join(app.getPath('userData'), STATE_FILE);
}

function getInputHelperSource() {
  return `
using System;
using System.Runtime.InteropServices;
using System.Threading;

public static class CliplyInputHelper {
  const int SW_RESTORE = 9;
  const uint INPUT_KEYBOARD = 1;
  const ushort VK_CONTROL = 0x11;
  const ushort VK_V = 0x56;
  const uint KEYEVENTF_KEYUP = 0x0002;

  [StructLayout(LayoutKind.Sequential)]
  struct INPUT {
    public int type;
    public INPUTUNION u;
  }

  [StructLayout(LayoutKind.Explicit)]
  struct INPUTUNION {
    [FieldOffset(0)] public MOUSEINPUT mi;
    [FieldOffset(0)] public KEYBDINPUT ki;
    [FieldOffset(0)] public HARDWAREINPUT hi;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct MOUSEINPUT {
    public int dx;
    public int dy;
    public uint mouseData;
    public uint dwFlags;
    public uint time;
    public IntPtr dwExtraInfo;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct KEYBDINPUT {
    public ushort wVk;
    public ushort wScan;
    public uint dwFlags;
    public uint time;
    public IntPtr dwExtraInfo;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct HARDWAREINPUT {
    public uint uMsg;
    public ushort wParamL;
    public ushort wParamH;
  }

  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

  static INPUT Key(ushort vk, bool up) {
    return new INPUT {
      type = (int)INPUT_KEYBOARD,
      u = new INPUTUNION {
        ki = new KEYBDINPUT {
        wVk = vk,
        dwFlags = up ? KEYEVENTF_KEYUP : 0
        }
      }
    };
  }

  static void Paste(IntPtr hWnd) {
    if (hWnd != IntPtr.Zero) {
      ShowWindow(hWnd, SW_RESTORE);
      BringWindowToTop(hWnd);
      SetForegroundWindow(hWnd);
      Thread.Sleep(80);
    }

    var inputs = new[] {
      Key(VK_CONTROL, false),
      Key(VK_V, false),
      Key(VK_V, true),
      Key(VK_CONTROL, true)
    };
    SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
  }

  public static void Main(string[] args) {
    if (args.Length > 0 && args[0] == "foreground") {
      Console.WriteLine(GetForegroundWindow().ToInt64());
      return;
    }

    if (args.Length > 1 && args[0] == "paste") {
      long hwndValue;
      long.TryParse(args[1], out hwndValue);
      Paste(new IntPtr(hwndValue));
      return;
    }
  }
}
`;
}

function findCscPath() {
  const candidates = [
    path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) || '';
}

function ensureInputHelper() {
  if (process.platform !== 'win32') return '';
  if (inputHelperPath && fs.existsSync(inputHelperPath)) return inputHelperPath;

  const helperDir = path.join(app.getPath('userData'), 'helpers');
  const sourcePath = path.join(helperDir, 'cliply-input-helper.cs');
  const exePath = path.join(helperDir, 'cliply-input-helper.exe');
  const versionPath = path.join(helperDir, 'cliply-input-helper.version');
  fs.mkdirSync(helperDir, { recursive: true });

  const currentVersion = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, 'utf8').trim() : '';
  if (!fs.existsSync(exePath) || currentVersion !== INPUT_HELPER_VERSION) {
    const cscPath = findCscPath();
    if (!cscPath) return '';
    fs.writeFileSync(sourcePath, getInputHelperSource(), 'utf8');
    const result = childProcess.spawnSync(cscPath, [
      '/nologo',
      '/target:exe',
      `/out:${exePath}`,
      sourcePath
    ], {
      windowsHide: true,
      encoding: 'utf8'
    });
    if (result.status !== 0 || !fs.existsSync(exePath)) return '';
    fs.writeFileSync(versionPath, INPUT_HELPER_VERSION, 'utf8');
  }

  inputHelperPath = exePath;
  return inputHelperPath;
}

function getForegroundWindowHandle() {
  const helperPath = ensureInputHelper();
  if (!helperPath) return '';

  try {
    return childProcess.execFileSync(helperPath, ['foreground'], {
      windowsHide: true,
      encoding: 'utf8',
      timeout: 1000
    }).trim();
  } catch {
    return '';
  }
}

function loadState() {
  try {
    const raw = fs.readFileSync(getStatePath(), 'utf8');
    const parsed = JSON.parse(raw);
    state.settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
    state.history = Array.isArray(parsed.history) ? sortHistoryItems(parsed.history.map(normalizeExistingItem)) : [];
  } catch {
    state.settings = { ...DEFAULT_SETTINGS };
    state.history = [];
  }
}

function saveState() {
  const statePath = getStatePath();
  const tmpPath = `${statePath}.tmp`;
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpPath, statePath);
}

function applySystemSettings() {
  app.setLoginItemSettings({
    openAtLogin: !!state.settings.launchOnStartup
  });
}

function createIcon() {
  const pngPath = path.join(__dirname, '..', 'assets', 'cliply-icon.png');
  if (fs.existsSync(pngPath)) {
    return nativeImage.createFromPath(pngPath);
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#ffbd35"/>
          <stop offset=".62" stop-color="#ff6b1a"/>
          <stop offset="1" stop-color="#ff3d7f"/>
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#g)"/>
      <text x="32" y="41" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="white">C</text>
    </svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function showMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function hidePanelWindow() {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.blur();
    panelWindow.hide();
  }
}

function positionPanelWindow() {
  if (!panelWindow) return;
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const { width, height } = panelWindow.getBounds();
  const area = display.workArea;
  const x = Math.min(Math.max(cursor.x - Math.floor(width / 2), area.x + 12), area.x + area.width - width - 12);
  const y = Math.min(Math.max(cursor.y + 14, area.y + 12), area.y + area.height - height - 12);
  panelWindow.setPosition(x, y, false);
}

function togglePanelWindow() {
  if (!panelWindow || panelWindow.isDestroyed()) return;
  if (panelWindow.isVisible()) {
    panelWindow.hide();
    return;
  }
  lastFocusedExternalWindow = BrowserWindow.getFocusedWindow();
  lastFocusedExternalHwnd = getForegroundWindowHandle();
  positionPanelWindow();
  panelWindow.show();
  panelWindow.focus();
  panelWindow.webContents.send('clipboard-lite:panel-opened', state);
}

function createAppMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '打开快捷面板', accelerator: state.settings.panelShortcut || DEFAULT_SETTINGS.panelShortcut, click: togglePanelWindow },
        { label: '打开完整窗口', click: showMainWindow },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'Alt+F4',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '关闭窗口' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { label: '关于轻剪', click: showMainWindow }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function detectType(text) {
  const value = text.trim();
  if (parseTable(value)) return 'table';
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return 'color';
  if (extractHyperlink(value)) return 'link';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
  if (/\b(const|let|var|function|class|import|export|=>|return|if|for|while)\b/.test(value) || /[{};]/.test(value)) return 'code';
  return 'text';
}

function extractHyperlink(text) {
  const value = String(text || '').trim();
  if (!value) return '';

  const candidates = [];
  const explicitUrlPattern = /https?:\/\/[^\s<>"'`]+|www\.[^\s<>"'`]+/ig;
  const bareDomainPattern = /(?:^|[^\w@.-])((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:[/:?#][^\s<>"'`]*)?)/ig;

  for (const match of value.matchAll(explicitUrlPattern)) {
    candidates.push(match[0]);
  }
  for (const match of value.matchAll(bareDomainPattern)) {
    candidates.push(match[1]);
  }

  for (const candidate of candidates) {
    const href = normalizeHyperlinkCandidate(candidate);
    if (href) return href;
  }

  return '';
}

function normalizeHyperlinkCandidate(candidate) {
  let value = String(candidate || '').trim();
  if (!value) return '';

  value = value.replace(/^[([<{]+/, '').replace(/[)\]}>.,;!?，。；：！？、]+$/, '');
  if (/^www\./i.test(value)) value = `https://${value}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(value)) value = `https://${value}`;

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function showOpenLinkPrompt(url) {
  if (!url || pendingLinkPromptUrl === url) return;
  pendingLinkPromptUrl = url;

  const parentWindow = BrowserWindow.getFocusedWindow() || panelWindow || mainWindow;
  dialog.showMessageBox(parentWindow, {
    type: 'question',
    title: '检测到超链接',
    message: '是否打开浏览器访问这个链接？',
    detail: url,
    buttons: ['打开浏览器', '取消'],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  }).then(({ response }) => {
    if (response === 0) shell.openExternal(url);
  }).finally(() => {
    pendingLinkPromptUrl = '';
  });
}

function previewOf(text) {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
}

function hashBuffer(buffer) {
  let hash = 2166136261;
  for (const byte of buffer) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function fileNameOf(filePath) {
  return path.basename(filePath) || filePath;
}

function readFilePathsFromClipboard() {
  if (process.platform !== 'win32') return [];

  const buffer = clipboard.readBuffer('FileNameW');
  if (!buffer || buffer.length < 22) return [];

  const offset = buffer.readUInt32LE(0);
  if (offset <= 0 || offset >= buffer.length) return [];

  const wide = buffer.readUInt32LE(16) !== 0;
  const raw = wide
    ? buffer.slice(offset).toString('utf16le')
    : buffer.slice(offset).toString('latin1');

  return raw
    .split('\u0000')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function createFileDropBuffer(filePaths) {
  const paths = filePaths.join('\u0000') + '\u0000\u0000';
  const pathsBuffer = Buffer.from(paths, 'utf16le');
  const header = Buffer.alloc(20);
  header.writeUInt32LE(20, 0);
  header.writeInt32LE(0, 4);
  header.writeInt32LE(0, 8);
  header.writeUInt32LE(0, 12);
  header.writeUInt32LE(1, 16);
  return Buffer.concat([header, pathsBuffer]);
}

function normalizeExistingItem(item) {
  if (!item.kind) item.kind = item.type === 'image' || item.type === 'file' ? item.type : 'text';
  if (item.kind === 'text' && typeof item.value !== 'string') item.value = '';
  if (item.kind === 'text' && item.type === 'table' && !Array.isArray(item.tableRows)) {
    const parsed = parseTable(item.value);
    if (parsed) {
      item.tableRows = parsed.rows;
      item.tableRowCount = parsed.rowCount;
      item.tableColumnCount = parsed.columnCount;
    }
  }
  if (item.kind === 'image' && !item.preview) item.preview = '图片';
  if (item.kind === 'file' && !Array.isArray(item.paths)) item.paths = [];
  if (typeof item.pinned !== 'boolean') item.pinned = false;
  return item;
}

function itemSignature(item) {
  if (item.kind === 'image') return `image:${item.hash || ''}:${item.dataUrl?.length || 0}`;
  if (item.kind === 'file') return `file:${(item.paths || []).join('\n')}`;
  return `text:${item.value || ''}`;
}

function matchesSameContent(entry, item) {
  normalizeExistingItem(entry);
  if (entry.kind !== item.kind) return false;
  if (item.kind === 'image') return entry.hash === item.hash;
  if (item.kind === 'file') return JSON.stringify(entry.paths || []) === JSON.stringify(item.paths || []);
  return entry.value === item.value;
}

function upsertClipboardItem(nextItem) {
  const item = { ...nextItem };
  if (item.kind === 'text') {
    item.value = String(item.value || '').replace(/\r\n/g, '\n').trimEnd();
    if (!item.value) return false;
    const parsedTable = parseTable(item.value);
    if (parsedTable) {
      item.type = 'table';
      item.tableRows = parsedTable.rows;
      item.tableRowCount = parsedTable.rowCount;
      item.tableColumnCount = parsedTable.columnCount;
      item.preview = `Table ${parsedTable.rowCount} rows x ${parsedTable.columnCount} cols`;
    } else {
      item.preview = previewOf(item.value);
      item.type = detectType(item.value);
    }
  } else if (item.kind === 'image') {
    if (!item.dataUrl) return false;
    item.type = 'image';
    item.preview = item.preview || '图片';
  } else if (item.kind === 'file') {
    item.paths = Array.isArray(item.paths) ? item.paths.filter(Boolean) : [];
    if (!item.paths.length) return false;
    item.type = 'file';
    item.value = item.paths.join('\n');
    item.preview = item.paths.length === 1
      ? fileNameOf(item.paths[0])
      : `${fileNameOf(item.paths[0])} 等 ${item.paths.length} 个文件`;
  } else {
    return false;
  }

  const existing = state.history[0];
  if (existing && matchesSameContent(existing, item)) {
    existing.updatedAt = new Date().toISOString();
    saveState();
    broadcastState();
    return false;
  }

  const now = new Date().toISOString();
  const historyItem = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    favorite: false,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    ...item
  };

  state.history = sortHistoryItems([historyItem, ...state.history.filter(entry => !matchesSameContent(entry, historyItem))]);
  state.history = state.history.slice(0, Math.max(20, Number(state.settings.maxItems) || DEFAULT_SETTINGS.maxItems));
  saveState();
  broadcastState();
  return true;
}

function sendStateTo(win) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('clipboard-lite:state', state);
  }
}

function broadcastState() {
  sendStateTo(mainWindow);
  sendStateTo(panelWindow);
}

function readClipboardLoop() {
  if (clipboardWatcherPaused) return;
  if (!state.settings.monitorClipboard) return;
  if (suppressNextClipboardRead) {
    suppressNextClipboardRead = false;
    lastClipboardSignature = readCurrentClipboardItem()?.signature || '';
    return;
  }

  const current = readCurrentClipboardItem();
  if (!current || current.signature === lastClipboardSignature) return;

  lastClipboardSignature = current.signature;
  upsertClipboardItem(current.item);

  if (current.item.kind === 'text') {
    showOpenLinkPrompt(extractHyperlink(current.item.value));
  }
}

function readCurrentClipboardItem() {
  const filePaths = readFilePathsFromClipboard();
  if (filePaths.length) {
    const item = { kind: 'file', paths: filePaths };
    return { item, signature: itemSignature(item) };
  }

  const text = clipboard.readText();
  if (text) {
    const item = { kind: 'text', value: text };
    return { item, signature: itemSignature(item) };
  }

  const image = clipboard.readImage();
  if (image && !image.isEmpty()) {
    const buffer = image.toPNG();
    if (buffer.length) {
      const item = {
        kind: 'image',
        dataUrl: image.toDataURL(),
        hash: hashBuffer(buffer),
        width: image.getSize().width,
        height: image.getSize().height,
        preview: `图片 ${image.getSize().width}x${image.getSize().height}`
      };
      return { item, signature: itemSignature(item) };
    }
  }
  return null;
}

function startClipboardWatcher() {
  stopClipboardWatcher();
  clipboardTimer = setInterval(readClipboardLoop, 1000);
}

function stopClipboardWatcher() {
  if (clipboardTimer) {
    clearInterval(clipboardTimer);
    clipboardTimer = null;
  }
}

function pauseClipboardWatcherBriefly() {
  clipboardWatcherPaused = true;
  clearTimeout(pauseClipboardWatcherBriefly.timer);
  pauseClipboardWatcherBriefly.timer = setTimeout(() => {
    clipboardWatcherPaused = false;
  }, 350);
}

function getPasteHelperPath() {
  const helperPath = path.join(app.getPath('userData'), 'send-paste.vbs');
  if (!fs.existsSync(helperPath)) {
    fs.mkdirSync(path.dirname(helperPath), { recursive: true });
    fs.writeFileSync(
      helperPath,
      'Set WshShell = WScript.CreateObject("WScript.Shell")\r\nWshShell.SendKeys "^v"\r\n',
      'utf8'
    );
  }
  return helperPath;
}

function copyHistoryItem(id) {
  const item = state.history.find(entry => entry.id === id);
  if (!item) return false;
  normalizeExistingItem(item);

  suppressNextClipboardRead = true;
  if (item.kind === 'image') {
    clipboard.writeImage(nativeImage.createFromDataURL(item.dataUrl));
  } else if (item.kind === 'file') {
    clipboard.clear();
    clipboard.writeBuffer('FileNameW', createFileDropBuffer(item.paths || []));
  } else {
    clipboard.writeText(item.value);
  }
  item.updatedAt = new Date().toISOString();
  state.history = sortHistoryItems([item, ...state.history.filter(entry => entry.id !== id)]);
  saveState();
  broadcastState();
  return true;
}

function copyHistoryItemAsTable(id) {
  const item = state.history.find(entry => entry.id === id);
  if (!item) return false;
  normalizeExistingItem(item);

  const parsed = Array.isArray(item.tableRows) && item.tableRows.length
    ? { rows: item.tableRows }
    : parseTable(item.value || '');
  if (!parsed) return false;

  suppressNextClipboardRead = true;
  clipboard.writeText(tableToTsv(parsed.rows));
  item.updatedAt = new Date().toISOString();
  item.type = 'table';
  item.tableRows = parsed.rows;
  item.tableRowCount = parsed.rows.length;
  item.tableColumnCount = Math.max(...parsed.rows.map(row => row.length));
  item.preview = `Table ${item.tableRowCount} rows x ${item.tableColumnCount} cols`;
  state.history = sortHistoryItems([item, ...state.history.filter(entry => entry.id !== id)]);
  saveState();
  broadcastState();
  return true;
}

function togglePinItem(id) {
  const item = state.history.find(entry => entry.id === id);
  if (!item) return false;
  normalizeExistingItem(item);

  item.pinned = !item.pinned;
  item.updatedAt = new Date().toISOString();
  state.history = sortHistoryItems(state.history);
  saveState();
  broadcastState();
  return item.pinned;
}

function showItemContextMenu(win, id) {
  const item = state.history.find(entry => entry.id === id);
  if (!item || !win || win.isDestroyed()) return false;
  normalizeExistingItem(item);

  const menu = Menu.buildFromTemplate([
    {
      label: '复制',
      click: () => copyHistoryItem(item.id)
    },
    {
      label: item.pinned ? '取消置顶' : '置顶',
      click: () => togglePinItem(item.id)
    },
    {
      label: item.favorite ? '取消收藏' : '收藏',
      click: () => {
        item.favorite = !item.favorite;
        item.updatedAt = new Date().toISOString();
        state.history = sortHistoryItems(state.history);
        saveState();
        broadcastState();
      }
    },
    ...(item.type === 'table' || parseTable(item.value || '') ? [
      { type: 'separator' },
      {
        label: 'Copy as table',
        click: () => copyHistoryItemAsTable(item.id)
      },
      {
        label: 'Paste as table',
        click: () => pasteHistoryItemAsTable(item.id)
      }
    ] : []),
    { type: 'separator' },
    {
      label: '删除',
      click: () => {
        state.history = state.history.filter(entry => entry.id !== item.id);
        saveState();
        broadcastState();
      }
    }
  ]);

  menu.popup({ window: win });
  return true;
}

function sendPasteShortcut() {
  if (process.platform !== 'win32') return;

  childProcess.spawn('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-WindowStyle',
    'Hidden',
    '-Command',
    '$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys("^v")'
  ], {
    windowsHide: true,
    stdio: 'ignore'
  }).unref();
}

function sendPasteToLastFocusedWindow() {
  const helperPath = ensureInputHelper();
  if (!helperPath || !lastFocusedExternalHwnd) {
    sendPasteShortcut();
    return;
  }

  childProcess.spawn(helperPath, ['paste', String(lastFocusedExternalHwnd)], {
    windowsHide: true,
    stdio: 'ignore'
  }).unref();
}

function pasteHistoryItem(id) {
  const copied = copyHistoryItem(id);
  if (!copied) return false;

  hidePanelWindow();
  if (lastFocusedExternalWindow && !lastFocusedExternalWindow.isDestroyed()) {
    lastFocusedExternalWindow.focus();
  }
  setTimeout(sendPasteToLastFocusedWindow, 60);
  return true;
}

function pasteHistoryItemAsTable(id) {
  const copied = copyHistoryItemAsTable(id);
  if (!copied) return false;

  hidePanelWindow();
  if (lastFocusedExternalWindow && !lastFocusedExternalWindow.isDestroyed()) {
    lastFocusedExternalWindow.focus();
  }
  setTimeout(sendPasteToLastFocusedWindow, 60);
  return true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#f6f3ff',
    icon: createIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('close', (event) => {
    if (state.settings.hideOnClose && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on('move', pauseClipboardWatcherBriefly);
}

function createPanelWindow() {
  panelWindow = new BrowserWindow({
    width: 430,
    height: 560,
    minWidth: 380,
    minHeight: 420,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#f8f5ff',
    icon: createIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panelWindow.loadFile(path.join(__dirname, 'renderer', 'panel.html'));
  panelWindow.on('blur', hidePanelWindow);
  panelWindow.on('move', pauseClipboardWatcherBriefly);
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: '打开快捷面板', click: togglePanelWindow },
    { label: '打开轻剪', click: showMainWindow },
    {
      label: state.settings.monitorClipboard ? '暂停监听' : '继续监听',
      click: () => {
        state.settings.monitorClipboard = !state.settings.monitorClipboard;
        if (state.settings.monitorClipboard) startClipboardWatcher();
        else stopClipboardWatcher();
        saveState();
        createTrayMenu();
        broadcastState();
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        saveState();
        app.quit();
      }
    }
  ]);
}

function createTray() {
  const trayIcon = createIcon().resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip('轻剪 Cliply');
  tray.setContextMenu(buildTrayMenu());
  tray.on('double-click', togglePanelWindow);
}

function createTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(buildTrayMenu());
}

function normalizeShortcut(value) {
  const parts = String(value || '')
    .split('+')
    .map(part => part.trim())
    .filter(Boolean);
  const modifiers = [];
  let key = '';

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (['ctrl', 'control', 'cmdorctrl', 'commandorcontrol'].includes(lower)) {
      if (!modifiers.includes('Control')) modifiers.push('Control');
    } else if (['shift'].includes(lower)) {
      if (!modifiers.includes('Shift')) modifiers.push('Shift');
    } else if (['alt', 'option'].includes(lower)) {
      if (!modifiers.includes('Alt')) modifiers.push('Alt');
    } else if (['meta', 'cmd', 'command', 'super'].includes(lower)) {
      if (!modifiers.includes('Super')) modifiers.push('Super');
    } else {
      key = part.length === 1 ? part.toUpperCase() : part;
    }
  }

  if (!key || !modifiers.length) return DEFAULT_SETTINGS.panelShortcut;
  return [...modifiers, key].join('+');
}

function registerShortcuts() {
  const shortcut = normalizeShortcut(state.settings.panelShortcut);
  globalShortcut.unregisterAll();
  const registered = globalShortcut.register(shortcut, togglePanelWindow);
  if (!registered && shortcut !== DEFAULT_SETTINGS.panelShortcut) {
    state.settings.panelShortcut = DEFAULT_SETTINGS.panelShortcut;
    globalShortcut.register(DEFAULT_SETTINGS.panelShortcut, togglePanelWindow);
  } else {
    state.settings.panelShortcut = shortcut;
  }
}

function setupIpc() {
  ipcMain.handle('clipboard-lite:get-state', () => state);
  ipcMain.handle('clipboard-lite:hide-panel', () => {
    hidePanelWindow();
    return true;
  });
  ipcMain.handle('clipboard-lite:show-main-window', () => {
    hidePanelWindow();
    showMainWindow();
    return true;
  });
  ipcMain.handle('clipboard-lite:copy-item', (_event, id) => {
    return copyHistoryItem(id);
  });
  ipcMain.handle('clipboard-lite:toggle-pin', (_event, id) => {
    return togglePinItem(id);
  });
  ipcMain.handle('clipboard-lite:show-item-menu', (event, id) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return showItemContextMenu(win, id);
  });
  ipcMain.handle('clipboard-lite:paste-item', (_event, id) => {
    return pasteHistoryItem(id);
  });
  ipcMain.handle('clipboard-lite:copy-item-as-table', (_event, id) => {
    return copyHistoryItemAsTable(id);
  });
  ipcMain.handle('clipboard-lite:paste-item-as-table', (_event, id) => {
    return pasteHistoryItemAsTable(id);
  });
  ipcMain.handle('clipboard-lite:copy-text', (_event, text) => {
    suppressNextClipboardRead = true;
    clipboard.writeText(String(text || ''));
    return true;
  });
  ipcMain.handle('clipboard-lite:toggle-favorite', (_event, id) => {
    const item = state.history.find(entry => entry.id === id);
    if (!item) return false;

    item.favorite = !item.favorite;
    item.updatedAt = new Date().toISOString();
    state.history = sortHistoryItems(state.history);
    saveState();
    broadcastState();
    return true;
  });
  ipcMain.handle('clipboard-lite:delete-item', (_event, id) => {
    state.history = state.history.filter(entry => entry.id !== id);
    saveState();
    broadcastState();
    return true;
  });
  ipcMain.handle('clipboard-lite:clear-history', () => {
    state.history = [];
    saveState();
    broadcastState();
    return true;
  });
  ipcMain.handle('clipboard-lite:update-settings', (_event, nextSettings) => {
    const previousShortcut = state.settings.panelShortcut || DEFAULT_SETTINGS.panelShortcut;
    const nextShortcut = normalizeShortcut(nextSettings.panelShortcut || previousShortcut);
    state.settings = {
      ...state.settings,
      ...nextSettings,
      panelShortcut: nextShortcut,
      maxItems: Math.min(2000, Math.max(20, Number(nextSettings.maxItems) || DEFAULT_SETTINGS.maxItems))
    };
    if (nextShortcut !== previousShortcut) {
      globalShortcut.unregister(previousShortcut);
      if (!globalShortcut.register(nextShortcut, togglePanelWindow)) {
        globalShortcut.register(previousShortcut, togglePanelWindow);
        state.settings.panelShortcut = previousShortcut;
        throw new Error(`快捷键 ${nextShortcut} 已被占用或不可用`);
      }
    }
    state.history = state.history.slice(0, state.settings.maxItems);
    applySystemSettings();
    createAppMenu();
    saveState();
    createTrayMenu();
    broadcastState();
    if (state.settings.monitorClipboard) startClipboardWatcher();
    else stopClipboardWatcher();
    return state.settings;
  });
  ipcMain.handle('clipboard-lite:open-external', (_event, url) => shell.openExternal(url));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', togglePanelWindow);

  app.whenReady().then(() => {
    loadState();
    applySystemSettings();
    createAppMenu();
    setupIpc();
    createWindow();
    createPanelWindow();
    createTray();
    registerShortcuts();
    startClipboardWatcher();
    broadcastState();
  });
}

app.on('before-quit', () => {
  app.isQuitting = true;
  stopClipboardWatcher();
  saveState();
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
