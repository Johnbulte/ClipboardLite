const api = window.clipboardLite;

const state = {
  data: null,
  selectedCategory: 'all',
  search: '',
  selectedId: null
};

const el = {
  statusText: document.getElementById('statusText'),
  categoryList: document.getElementById('categoryList'),
  historyList: document.getElementById('historyList'),
  statsLine: document.getElementById('statsLine'),
  searchInput: document.getElementById('searchInput'),
  copyLatestBtn: document.getElementById('copyLatestBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsOverlay: document.getElementById('settingsOverlay'),
  settingsCloseBtn: document.getElementById('settingsCloseBtn'),
  settingsCancelBtn: document.getElementById('settingsCancelBtn'),
  clearBtn: document.getElementById('clearBtn'),
  monitorToggle: document.getElementById('monitorToggle'),
  closeHideToggle: document.getElementById('closeHideToggle'),
  maxItemsInput: document.getElementById('maxItemsInput'),
  panelShortcutInput: document.getElementById('panelShortcutInput'),
  resetShortcutBtn: document.getElementById('resetShortcutBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  detailEmpty: document.getElementById('detailEmpty'),
  detailPanel: document.getElementById('detailPanel'),
  detailPreview: document.getElementById('detailPreview'),
  detailType: document.getElementById('detailType'),
  detailUpdated: document.getElementById('detailUpdated'),
  detailCreated: document.getElementById('detailCreated'),
  detailLength: document.getElementById('detailLength'),
  detailFavorite: document.getElementById('detailFavorite'),
  detailMedia: document.getElementById('detailMedia'),
  detailValue: document.getElementById('detailValue'),
  detailCopyBtn: document.getElementById('detailCopyBtn'),
  detailFavoriteBtn: document.getElementById('detailFavoriteBtn'),
  detailDeleteBtn: document.getElementById('detailDeleteBtn'),
  toast: document.getElementById('toast')
};

let toastTimer = null;
const HISTORY_ROW_HEIGHT = 86;
const HISTORY_OVERSCAN = 8;
let visibleHistoryItems = [];
let historyScrollFrame = null;
let historyRenderedStart = -1;
let historyRenderedEnd = -1;
let recordingShortcut = false;

function displayShortcut(value) {
  return String(value || 'Control+Shift+V')
    .replaceAll('Control', 'Ctrl')
    .replaceAll('+', ' + ');
}

function shortcutFromEvent(event) {
  const parts = [];
  const key = event.key;
  if (event.ctrlKey) parts.push('Control');
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');
  if (event.metaKey) parts.push('Super');
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return '';
  const normalizedKey = key.length === 1 ? key.toUpperCase() : key;
  parts.push(normalizedKey);
  return parts.length >= 2 ? parts.join('+') : '';
}

function openSettings() {
  renderSettings();
  el.settingsOverlay.classList.remove('hidden');
  el.panelShortcutInput.focus();
}

function closeSettings() {
  recordingShortcut = false;
  el.panelShortcutInput.classList.remove('recording');
  el.settingsOverlay.classList.add('hidden');
}

function showToast(message) {
  clearTimeout(toastTimer);
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 1700);
}

function typeLabel(key) {
  return {
    text: '文本',
    link: '链接',
    code: '代码',
    email: '邮箱',
    color: '颜色',
    image: '图片',
    file: '文件'
  }[key] || key;
}

function categoryLabel(key) {
  return {
    all: '全部',
    favorite: '收藏',
    text: '文本',
    link: '链接',
    code: '代码',
    email: '邮箱',
    color: '颜色',
    image: '图片',
    file: '文件'
  }[key] || key;
}

function formatTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getFilteredItems() {
  if (!state.data) return [];
  const query = state.search.trim().toLowerCase();
  return state.data.history.filter(item => {
    const categoryOk = state.selectedCategory === 'all'
      || (state.selectedCategory === 'favorite' ? item.favorite : item.type === state.selectedCategory);
    const searchOk = !query
      || String(item.value || '').toLowerCase().includes(query)
      || String(item.preview || '').toLowerCase().includes(query)
      || (Array.isArray(item.paths) && item.paths.some(filePath => filePath.toLowerCase().includes(query)));
    return categoryOk && searchOk;
  });
}

function getSelectedItem() {
  return state.data?.history.find(entry => entry.id === state.selectedId) || getFilteredItems()[0] || null;
}

function renderCategories() {
  const counts = {
    all: state.data.history.length,
    favorite: state.data.history.filter(item => item.favorite).length,
    text: state.data.history.filter(item => item.type === 'text').length,
    link: state.data.history.filter(item => item.type === 'link').length,
    code: state.data.history.filter(item => item.type === 'code').length,
    email: state.data.history.filter(item => item.type === 'email').length,
    color: state.data.history.filter(item => item.type === 'color').length,
    image: state.data.history.filter(item => item.type === 'image').length,
    file: state.data.history.filter(item => item.type === 'file').length
  };

  el.categoryList.innerHTML = Object.entries(counts).map(([key, count]) => `
    <div class="category-item ${state.selectedCategory === key ? 'active' : ''}" data-category="${key}">
      <span>${categoryLabel(key)}</span>
      <span>${count}</span>
    </div>
  `).join('');

  el.categoryList.querySelectorAll('.category-item').forEach(node => {
    node.addEventListener('click', () => {
      state.selectedCategory = node.dataset.category;
      state.selectedId = getFilteredItems()[0]?.id || null;
      render();
    });
  });
}

function attachHistoryItemEvents() {
  el.historyList.querySelectorAll('.history-item').forEach(node => {
    node.addEventListener('click', () => {
      state.selectedId = node.dataset.id;
      renderVirtualHistory(true);
      renderDetail();
    });
    node.addEventListener('dblclick', async () => {
      await api.copyItem(node.dataset.id);
      showToast('已复制到剪贴板');
    });
    node.addEventListener('contextmenu', async (event) => {
      event.preventDefault();
      await api.showItemMenu(node.dataset.id);
    });
  });
}

function renderVirtualHistory(force = false) {
  const items = visibleHistoryItems;
  if (!items.length) return;

  const viewportHeight = el.historyList.clientHeight || 520;
  const scrollTop = el.historyList.scrollTop || 0;
  const start = Math.max(0, Math.floor(scrollTop / HISTORY_ROW_HEIGHT) - HISTORY_OVERSCAN);
  const count = Math.ceil(viewportHeight / HISTORY_ROW_HEIGHT) + HISTORY_OVERSCAN * 2;
  const end = Math.min(items.length, start + count);
  if (!force && start === historyRenderedStart && end === historyRenderedEnd) return;
  historyRenderedStart = start;
  historyRenderedEnd = end;
  const offsetY = start * HISTORY_ROW_HEIGHT;
  const totalHeight = items.length * HISTORY_ROW_HEIGHT;

  el.historyList.innerHTML = `
    <div class="history-virtual-spacer" style="height:${totalHeight}px">
      <div class="history-virtual-window" style="transform:translateY(${offsetY}px)">
        ${items.slice(start, end).map(item => `
          <div class="history-item ${state.selectedId === item.id ? 'active' : ''} ${item.pinned ? 'pinned' : ''} ${item.type === 'image' ? 'image-item' : ''}" data-id="${item.id}">
            ${item.type === 'image' ? `
              <div class="history-thumb">
                <img src="${item.dataUrl}" alt="图片预览" loading="lazy" decoding="async" />
              </div>
            ` : ''}
            <div class="history-text">
              <div class="history-title">${escapeHtml(item.preview || String(item.value || '').slice(0, 80))}</div>
              <div class="history-meta">${item.pinned ? '置顶 · ' : ''}${typeLabel(item.type)} · ${formatTime(item.updatedAt)}${item.favorite ? ' · 已收藏' : ''}</div>
            </div>
            <div class="badge">${typeLabel(item.type)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  attachHistoryItemEvents();
}

function renderHistory() {
  const items = getFilteredItems();
  visibleHistoryItems = items;
  historyRenderedStart = -1;
  historyRenderedEnd = -1;
  if (!items.length) {
    const title = state.search ? '没有匹配内容' : '还没有剪贴板记录';
    const desc = state.search ? '换个关键词试试，或者清空搜索条件。' : '复制内容后会自动保存到这里。';
    el.historyList.innerHTML = `<div class="empty-state"><strong>${title}</strong><span>${desc}</span></div>`;
    return;
  }
  renderVirtualHistory();
  return;

  if (!items.length) {
    const title = state.search ? '没有找到匹配内容' : '还没有剪贴板记录';
    const desc = state.search ? '换个关键词试试，或者清空搜索条件。' : '复制一段文字、链接、代码或邮箱，轻剪会自动保存到这里。';
    el.historyList.innerHTML = `<div class="empty-state"><strong>${title}</strong><span>${desc}</span></div>`;
    return;
  }

  el.historyList.innerHTML = items.map(item => `
    <div class="history-item ${state.selectedId === item.id ? 'active' : ''} ${item.pinned ? 'pinned' : ''} ${item.type === 'image' ? 'image-item' : ''}" data-id="${item.id}">
      ${item.type === 'image' ? `
        <div class="history-thumb">
          <img src="${item.dataUrl}" alt="图片预览" loading="lazy" decoding="async" />
        </div>
      ` : ''}
      <div class="history-text">
        <div class="history-title">${escapeHtml(item.preview || String(item.value || '').slice(0, 80))}</div>
        <div class="history-meta">${item.pinned ? '置顶 · ' : ''}${typeLabel(item.type)} · ${formatTime(item.updatedAt)}${item.favorite ? ' · 已收藏' : ''}</div>
      </div>
      <div class="badge">${typeLabel(item.type)}</div>
    </div>
  `).join('');

  el.historyList.querySelectorAll('.history-item').forEach(node => {
    node.addEventListener('click', () => {
      state.selectedId = node.dataset.id;
      render();
    });
    node.addEventListener('dblclick', async () => {
      await api.copyItem(node.dataset.id);
      showToast('已复制到剪贴板');
    });
    node.addEventListener('contextmenu', async (event) => {
      event.preventDefault();
      await api.showItemMenu(node.dataset.id);
    });
  });
}

function renderDetail() {
  const item = getSelectedItem();
  if (!item) {
    el.detailEmpty.innerHTML = '<strong>等待复制内容</strong><span>复制任意文本后会自动出现在这里。所有数据仅保存在本机。</span>';
    el.detailEmpty.classList.remove('hidden');
    el.detailPanel.classList.add('hidden');
    return;
  }

  state.selectedId = item.id;
  el.detailEmpty.classList.add('hidden');
  el.detailPanel.classList.remove('hidden');
  el.detailType.textContent = typeLabel(item.type);
  el.detailUpdated.textContent = formatTime(item.updatedAt);
  el.detailPreview.textContent = item.preview;
  el.detailCreated.textContent = formatTime(item.createdAt);
  el.detailValue.value = item.value || '';
  el.detailFavorite.textContent = item.favorite ? '已收藏' : '未收藏';
  el.detailFavoriteBtn.textContent = item.favorite ? '取消收藏' : '收藏';
  el.detailMedia.classList.add('hidden');
  el.detailMedia.innerHTML = '';
  el.detailValue.classList.remove('hidden');

  if (item.type === 'image') {
    el.detailLength.textContent = `${item.width || '-'} × ${item.height || '-'} px`;
    el.detailMedia.innerHTML = `<img src="${item.dataUrl}" alt="剪贴板图片" />`;
    el.detailMedia.classList.remove('hidden');
    el.detailValue.classList.add('hidden');
  } else if (item.type === 'file') {
    const paths = Array.isArray(item.paths) ? item.paths : [];
    el.detailLength.textContent = `${paths.length} 个文件`;
    el.detailMedia.innerHTML = `
      <div class="file-list">
        ${paths.map(filePath => `<div class="file-row">📄 ${escapeHtml(filePath)}</div>`).join('')}
      </div>`;
    el.detailMedia.classList.remove('hidden');
  } else {
    el.detailLength.textContent = `${String(item.value || '').length} 字符`;
  }

  el.detailCopyBtn.onclick = async () => {
    await api.copyItem(item.id);
    showToast('已复制到剪贴板');
  };
  el.detailFavoriteBtn.onclick = async () => {
    await api.toggleFavorite(item.id);
    showToast(item.favorite ? '已取消收藏' : '已加入收藏');
  };
  el.detailDeleteBtn.onclick = async () => {
    await api.deleteItem(item.id);
    showToast('已删除');
  };

  el.detailPanel.oncontextmenu = async (event) => {
    event.preventDefault();
    await api.showItemMenu(item.id);
  };
}

function renderSettings() {
  el.monitorToggle.checked = !!state.data.settings.monitorClipboard;
  el.closeHideToggle.checked = !!state.data.settings.hideOnClose;
  el.maxItemsInput.value = state.data.settings.maxItems;
  el.panelShortcutInput.value = displayShortcut(state.data.settings.panelShortcut || 'Control+Shift+V');
  el.panelShortcutInput.dataset.shortcut = state.data.settings.panelShortcut || 'Control+Shift+V';
}

function renderStats() {
  const total = state.data.history.length;
  const favorites = state.data.history.filter(item => item.favorite).length;
  el.statsLine.textContent = `共 ${total} 条记录 · ${favorites} 条收藏 · 本地保存 · 监听 ${state.data.settings.monitorClipboard ? '开启' : '关闭'}`;
  el.statusText.textContent = state.data.settings.monitorClipboard
    ? '正在监听剪贴板，复制后自动保存到历史'
    : '剪贴板监听已暂停';
}

function render() {
  if (!state.data) return;
  renderCategories();
  renderHistory();
  renderDetail();
  renderSettings();
  renderStats();
}

async function bootstrap() {
  state.data = await api.getState();
  state.selectedId = state.data.history[0]?.id || null;
  render();
}

el.searchInput.addEventListener('input', () => {
  state.search = el.searchInput.value;
  el.historyList.scrollTop = 0;
  renderHistory();
  renderDetail();
});

el.historyList.addEventListener('scroll', () => {
  if (historyScrollFrame) return;
  historyScrollFrame = requestAnimationFrame(() => {
    historyScrollFrame = null;
    renderVirtualHistory();
  });
});

el.copyLatestBtn.addEventListener('click', async () => {
  const item = getFilteredItems()[0];
  if (item) {
    await api.copyItem(item.id);
    showToast('已复制最新内容');
  }
});

el.clearBtn.addEventListener('click', async () => {
  if (confirm('确定清空全部历史记录？')) {
    await api.clearHistory();
    state.selectedId = null;
    showToast('历史记录已清空');
  }
});

el.saveSettingsBtn.addEventListener('click', async () => {
  try {
    await api.updateSettings({
      monitorClipboard: el.monitorToggle.checked,
      hideOnClose: el.closeHideToggle.checked,
      maxItems: Number(el.maxItemsInput.value || 200),
      panelShortcut: el.panelShortcutInput.dataset.shortcut || 'Control+Shift+V'
    });
    closeSettings();
    showToast('设置已保存');
  } catch (error) {
    showToast(error?.message || '快捷键不可用');
  }
});

el.settingsBtn.addEventListener('click', openSettings);
el.settingsCloseBtn.addEventListener('click', closeSettings);
el.settingsCancelBtn.addEventListener('click', closeSettings);
el.settingsOverlay.addEventListener('click', (event) => {
  if (event.target === el.settingsOverlay) closeSettings();
});
el.resetShortcutBtn.addEventListener('click', () => {
  el.panelShortcutInput.dataset.shortcut = 'Control+Shift+V';
  el.panelShortcutInput.value = displayShortcut('Control+Shift+V');
});
el.panelShortcutInput.addEventListener('focus', () => {
  recordingShortcut = true;
  el.panelShortcutInput.classList.add('recording');
  el.panelShortcutInput.value = '请按下组合键...';
});
el.panelShortcutInput.addEventListener('keydown', (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (event.key === 'Escape') {
    recordingShortcut = false;
    el.panelShortcutInput.classList.remove('recording');
    el.panelShortcutInput.value = displayShortcut(el.panelShortcutInput.dataset.shortcut);
    return;
  }
  const shortcut = shortcutFromEvent(event);
  if (!shortcut) return;
  el.panelShortcutInput.dataset.shortcut = shortcut;
  el.panelShortcutInput.value = displayShortcut(shortcut);
  recordingShortcut = false;
  el.panelShortcutInput.classList.remove('recording');
  el.panelShortcutInput.blur();
});

document.addEventListener('keydown', (event) => {
  if (recordingShortcut) return;
  if (event.key === 'Escape' && !el.settingsOverlay.classList.contains('hidden')) {
    closeSettings();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    el.searchInput.focus();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'enter') {
    const item = getSelectedItem();
    if (item) {
      api.copyItem(item.id);
      showToast('已复制选中内容');
    }
  }
});

api.onStateChanged((nextState) => {
  state.data = nextState;
  if (!state.data.history.some(item => item.id === state.selectedId)) {
    state.selectedId = state.data.history[0]?.id || null;
  }
  render();
});

bootstrap();
