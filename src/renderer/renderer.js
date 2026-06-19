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
  templateTitleInput: document.getElementById('templateTitleInput'),
  templateContentInput: document.getElementById('templateContentInput'),
  saveTemplateBtn: document.getElementById('saveTemplateBtn'),
  templateList: document.getElementById('templateList'),
  historyList: document.getElementById('historyList'),
  statsLine: document.getElementById('statsLine'),
  searchInput: document.getElementById('searchInput'),
  copyLatestBtn: document.getElementById('copyLatestBtn'),
  planBtn: document.getElementById('planBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsOverlay: document.getElementById('settingsOverlay'),
  settingsCloseBtn: document.getElementById('settingsCloseBtn'),
  settingsCancelBtn: document.getElementById('settingsCancelBtn'),
  clearBtn: document.getElementById('clearBtn'),
  monitorToggle: document.getElementById('monitorToggle'),
  closeHideToggle: document.getElementById('closeHideToggle'),
  launchOnStartupToggle: document.getElementById('launchOnStartupToggle'),
  sensitiveProtectionToggle: document.getElementById('sensitiveProtectionToggle'),
  sensitiveActionSelect: document.getElementById('sensitiveActionSelect'),
  exportBackupBtn: document.getElementById('exportBackupBtn'),
  importBackupBtn: document.getElementById('importBackupBtn'),
  maxItemsInput: document.getElementById('maxItemsInput'),
  panelShortcutInput: document.getElementById('panelShortcutInput'),
  resetShortcutBtn: document.getElementById('resetShortcutBtn'),
  settingsUpgradeBtn: document.getElementById('settingsUpgradeBtn'),
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
  textTools: document.getElementById('textTools'),
  detailCopyBtn: document.getElementById('detailCopyBtn'),
  detailCopyTableBtn: document.getElementById('detailCopyTableBtn'),
  detailPasteTableBtn: document.getElementById('detailPasteTableBtn'),
  detailFavoriteBtn: document.getElementById('detailFavoriteBtn'),
  detailDeleteBtn: document.getElementById('detailDeleteBtn'),
  toast: document.getElementById('toast'),
  upgradeOverlay: document.getElementById('upgradeOverlay'),
  upgradeCloseBtn: document.getElementById('upgradeCloseBtn'),
  upgradeCancelBtn: document.getElementById('upgradeCancelBtn'),
  checkoutEmailInput: document.getElementById('checkoutEmailInput'),
  openCheckoutBtn: document.getElementById('openCheckoutBtn'),
  licenseKeyInput: document.getElementById('licenseKeyInput'),
  activateLicenseBtn: document.getElementById('activateLicenseBtn'),
  upgradeReason: document.getElementById('upgradeReason'),
  comparisonTable: document.getElementById('comparisonTable')
};

let toastTimer = null;
const HISTORY_ROW_HEIGHT = 86;
const HISTORY_OVERSCAN = 8;
let visibleHistoryItems = [];
let historyScrollFrame = null;
let historyRenderedStart = -1;
let historyRenderedEnd = -1;
let recordingShortcut = false;

function isPro() {
  return state.data?.subscription?.plan === 'pro';
}

function requiresProForItem(item, action) {
  if (!item) return '';
  if (action === 'table' || item.type === 'table') return '表格识别、复制为表格和粘贴为表格需要 Pro。';
  if (action === 'text-transform') return '文本增强需要 Pro。';
  if (item.type === 'image') return '图片剪贴板记录需要 Pro。';
  if (item.type === 'file') return '文件剪贴板记录需要 Pro。';
  return '';
}

async function openUpgrade(reason = '') {
  if (reason) {
    el.upgradeReason.textContent = reason;
    el.upgradeReason.classList.remove('hidden');
  } else {
    el.upgradeReason.classList.add('hidden');
  }
  const comparison = await api.getPlanComparison();
  el.comparisonTable.innerHTML = `
    <div class="comparison-head"><span>功能</span><span>普通版</span><span>Pro</span></div>
    ${comparison.map(row => `
      <div class="comparison-row">
        <span>${escapeHtml(row.feature)}</span>
        <span>${escapeHtml(row.free)}</span>
        <span>${escapeHtml(row.pro)}</span>
      </div>
    `).join('')}
  `;
  el.upgradeOverlay.classList.remove('hidden');
}

function closeUpgrade() {
  el.upgradeOverlay.classList.add('hidden');
}

function paymentErrorMessage(error) {
  const message = error?.message || String(error || '');
  if (message.includes('Payment service is not configured')) {
    return '请先配置 CLIPLY_PAYMENT_API_URL。';
  }
  return message || '支付服务暂时不可用。';
}

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
  if (key === 'table') return '表格';
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
  if (key === 'table') return '表格';
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
    ...(isPro() ? {
      code: state.data.history.filter(item => item.type === 'code').length,
      email: state.data.history.filter(item => item.type === 'email').length,
      color: state.data.history.filter(item => item.type === 'color').length,
      table: state.data.history.filter(item => item.type === 'table').length,
      image: state.data.history.filter(item => item.type === 'image').length,
      file: state.data.history.filter(item => item.type === 'file').length
    } : {})
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

function renderTablePreview(rows) {
  const safeRows = Array.isArray(rows) ? rows.slice(0, 20) : [];
  if (!safeRows.length) return '';
  return `
    <div class="table-preview">
      <table>
        <tbody>
          ${safeRows.map(row => `
            <tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
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
  el.detailCopyBtn.textContent = item.type === 'table' ? '复制表格' : '复制内容';
  el.detailMedia.classList.add('hidden');
  el.detailMedia.innerHTML = '';
  el.detailValue.classList.remove('hidden');
  el.textTools.classList.toggle('hidden', item.kind !== 'text' || item.type === 'table');
  el.textTools.classList.toggle('locked', !isPro());
  el.detailCopyTableBtn.classList.toggle('hidden', item.type !== 'table');
  el.detailPasteTableBtn.classList.toggle('hidden', item.type !== 'table');

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
  } else if (item.type === 'table') {
    el.detailLength.textContent = `${item.tableRowCount || item.tableRows?.length || '-'} 行 x ${item.tableColumnCount || '-'} 列`;
    el.detailMedia.innerHTML = renderTablePreview(item.tableRows);
    el.detailMedia.classList.remove('hidden');
  } else {
    el.detailLength.textContent = `${String(item.value || '').length} 字符`;
  }

  el.detailCopyBtn.onclick = async () => {
    const proReason = !isPro() ? requiresProForItem(item) : '';
    if (proReason) {
      await openUpgrade(proReason);
      return;
    }
    if (item.type === 'table') {
      if (!isPro()) {
        await openUpgrade(requiresProForItem(item, 'table'));
        return;
      }
      await api.copyItemAsTable(item.id);
      showToast('已复制为表格');
    } else {
      await api.copyItem(item.id);
      showToast('已复制到剪贴板');
    }
  };
  el.detailCopyTableBtn.onclick = async () => {
    if (!isPro()) {
      await openUpgrade(requiresProForItem(item, 'table'));
      return;
    }
    const ok = await api.copyItemAsTable(item.id);
    showToast(ok ? '已复制为表格' : '无法识别为表格');
  };
  el.detailPasteTableBtn.onclick = async () => {
    if (!isPro()) {
      await openUpgrade(requiresProForItem(item, 'table'));
      return;
    }
    const ok = await api.pasteItemAsTable(item.id);
    showToast(ok ? '已粘贴为表格' : '无法识别为表格');
  };
  el.textTools.querySelectorAll('[data-text-action]').forEach(button => {
    button.onclick = async () => {
      if (!isPro()) {
        await openUpgrade(requiresProForItem(item, 'text-transform'));
        return;
      }
      const ok = await api.copyItemTransformed(item.id, button.dataset.textAction);
      showToast(ok ? '已复制处理后的文本' : '无法处理该内容');
    };
  });
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

function renderTemplates() {
  const templates = state.data.templates || [];
  if (!isPro()) {
    el.templateList.innerHTML = '<div class="template-empty">升级 Pro 后可保存常用文案，点击复制后手动粘贴。</div>';
    el.saveTemplateBtn.disabled = true;
    return;
  }
  el.saveTemplateBtn.disabled = false;
  if (!templates.length) {
    el.templateList.innerHTML = '<div class="template-empty">还没有常用文案，先保存一条常用内容。</div>';
    return;
  }
  el.templateList.innerHTML = templates.map(template => [
    '<div class="template-item" data-id="' + escapeHtml(template.id) + '">',
    '<strong>' + escapeHtml(template.title) + '</strong>',
    '<span>' + escapeHtml(template.content.slice(0, 80)) + '</span>',
    '<div><button class="ghost" data-action="copy">复制</button><button class="danger" data-action="delete">删除</button></div>',
    '</div>'
  ].join('')).join('');
  el.templateList.querySelectorAll('.template-item button').forEach(button => {
    button.addEventListener('click', async () => {
      const id = button.closest('.template-item').dataset.id;
      if (button.dataset.action === 'copy') {
        const ok = await api.copyTemplate(id);
        showToast(ok ? '文案已复制，请手动粘贴' : '复制失败');
      } else {
        await api.deleteTemplate(id);
        showToast('文案已删除');
      }
    });
  });
}
function renderSettings() {
  el.monitorToggle.checked = !!state.data.settings.monitorClipboard;
  el.closeHideToggle.checked = !!state.data.settings.hideOnClose;
  el.launchOnStartupToggle.checked = !!state.data.settings.launchOnStartup;
  el.sensitiveProtectionToggle.checked = !!state.data.settings.sensitiveProtection;
  el.sensitiveProtectionToggle.disabled = !isPro();
  el.sensitiveActionSelect.value = state.data.settings.sensitiveAction || 'redact';
  el.sensitiveActionSelect.disabled = !isPro();
  el.closeHideToggle.disabled = !isPro();
  el.maxItemsInput.value = state.data.settings.maxItems;
  el.maxItemsInput.max = isPro() ? 2000 : 100;
  el.panelShortcutInput.value = displayShortcut(state.data.settings.panelShortcut || 'Control+Shift+V');
  el.panelShortcutInput.dataset.shortcut = state.data.settings.panelShortcut || 'Control+Shift+V';
  el.settingsUpgradeBtn.classList.toggle('hidden', isPro());
}

function renderStats() {
  const total = state.data.history.length;
  const favorites = state.data.history.filter(item => item.favorite).length;
  const planText = isPro() ? 'Pro 已激活' : '普通版';
  el.planBtn.textContent = planText;
  el.planBtn.classList.toggle('plan-pro', isPro());
  el.statsLine.textContent = `${planText} · 共 ${total} 条记录 · ${favorites} 条收藏 · 本地保存 · 监听 ${state.data.settings.monitorClipboard ? '开启' : '关闭'}`;
  el.statusText.textContent = state.data.settings.monitorClipboard
    ? '正在监听剪贴板，复制后自动保存到历史'
    : '剪贴板监听已暂停';
}

function render() {
  if (!state.data) return;
  renderCategories();
  renderTemplates();
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
    const proReason = !isPro() ? requiresProForItem(item) : '';
    if (proReason) {
      await openUpgrade(proReason);
      return;
    }
    if (item.type === 'table') {
      await api.copyItemAsTable(item.id);
      showToast('已复制最新表格');
    } else {
      await api.copyItem(item.id);
      showToast('已复制最新内容');
    }
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
      launchOnStartup: el.launchOnStartupToggle.checked,
      maxItems: Number(el.maxItemsInput.value || 200),
      panelShortcut: el.panelShortcutInput.dataset.shortcut || 'Control+Shift+V',
      sensitiveProtection: el.sensitiveProtectionToggle.checked,
      sensitiveAction: el.sensitiveActionSelect.value || 'redact'
    });
    closeSettings();
    showToast('设置已保存');
  } catch (error) {
    showToast(error?.message || '快捷键不可用');
  }
});

el.settingsBtn.addEventListener('click', openSettings);
el.saveTemplateBtn.addEventListener('click', async () => {
  if (!isPro()) {
    await openUpgrade('常用文案是 Pro 功能，可保存常用内容，点击复制后手动粘贴。');
    return;
  }
  const content = el.templateContentInput.value.trim();
  if (!content) {
    showToast('请先输入文案内容');
    return;
  }
  const ok = await api.saveTemplate({
    title: el.templateTitleInput.value.trim() || content.slice(0, 24),
    content
  });
  if (ok) {
    el.templateTitleInput.value = '';
    el.templateContentInput.value = '';
    showToast('文案已保存');
  }
});
el.exportBackupBtn.addEventListener('click', async () => {
  if (!isPro()) {
    await openUpgrade('备份导入导出是 Pro 功能，用于迁移和长期保存数据。');
    return;
  }
  const ok = await api.exportBackup();
  showToast(ok ? '备份已导出' : '已取消导出');
});
el.importBackupBtn.addEventListener('click', async () => {
  if (!isPro()) {
    await openUpgrade('备份导入导出是 Pro 功能，用于迁移和长期保存数据。');
    return;
  }
  const ok = await api.importBackup();
  showToast(ok ? '备份已导入' : '已取消导入');
});
el.planBtn.addEventListener('click', () => {
  if (!isPro()) openUpgrade();
});
el.settingsUpgradeBtn.addEventListener('click', () => openUpgrade());
el.settingsCloseBtn.addEventListener('click', closeSettings);
el.settingsCancelBtn.addEventListener('click', closeSettings);
el.settingsOverlay.addEventListener('click', (event) => {
  if (event.target === el.settingsOverlay) closeSettings();
});
el.resetShortcutBtn.addEventListener('click', () => {
  el.panelShortcutInput.dataset.shortcut = 'Control+Shift+V';
  el.panelShortcutInput.value = displayShortcut('Control+Shift+V');
});
el.upgradeCloseBtn.addEventListener('click', closeUpgrade);
el.upgradeCancelBtn.addEventListener('click', closeUpgrade);
el.upgradeOverlay.addEventListener('click', (event) => {
  if (event.target === el.upgradeOverlay) closeUpgrade();
});
el.openCheckoutBtn.addEventListener('click', async () => {
  try {
    const checkout = await api.createCheckout({
      email: el.checkoutEmailInput.value.trim()
    });
    if (!checkout?.checkoutUrl) {
      showToast('支付服务没有返回结账链接');
      return;
    }
    await api.openExternal(checkout.checkoutUrl);
    showToast('已打开支付页，完成后请粘贴授权码激活');
  } catch (error) {
    showToast(paymentErrorMessage(error));
  }
});
el.activateLicenseBtn.addEventListener('click', async () => {
  const licenseKey = el.licenseKeyInput.value.trim();
  if (!licenseKey) {
    showToast('请输入授权码');
    return;
  }
  try {
    const result = await api.activateLicense({ licenseKey });
    if (result?.subscription?.plan === 'pro') {
      closeUpgrade();
      showToast('Pro 已激活');
      return;
    }
    showToast('授权码未解锁 Pro');
  } catch (error) {
    showToast(paymentErrorMessage(error));
  }
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
      const proReason = !isPro() ? requiresProForItem(item) : '';
      if (proReason) {
        openUpgrade(proReason);
        return;
      }
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
