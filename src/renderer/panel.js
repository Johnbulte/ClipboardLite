const api = window.clipboardLite;

const state = {
  data: null,
  search: '',
  selectedIndex: 0
};

const el = {
  summary: document.getElementById('summary'),
  searchInput: document.getElementById('searchInput'),
  historyList: document.getElementById('historyList'),
  openMainBtn: document.getElementById('openMainBtn')
};

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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function getItems() {
  if (!state.data) return [];
  const query = state.search.trim().toLowerCase();
  return state.data.history.filter(item => {
    if (!query) return true;
    return String(item.value || '').toLowerCase().includes(query)
      || String(item.preview || '').toLowerCase().includes(query)
      || (Array.isArray(item.paths) && item.paths.some(filePath => filePath.toLowerCase().includes(query)));
  });
}

function clampSelection(items) {
  if (!items.length) {
    state.selectedIndex = 0;
    return;
  }
  state.selectedIndex = Math.min(Math.max(state.selectedIndex, 0), items.length - 1);
}

function updateSelection(nextIndex, shouldScroll = false) {
  const items = getItems();
  if (!items.length) {
    state.selectedIndex = 0;
    return;
  }
  state.selectedIndex = Math.min(Math.max(nextIndex, 0), items.length - 1);
  el.historyList.querySelectorAll('.history-item').forEach(node => {
    node.classList.toggle('active', Number(node.dataset.index) === state.selectedIndex);
  });
  if (shouldScroll) {
    el.historyList.querySelector('.history-item.active')?.scrollIntoView({ block: 'nearest' });
  }
}

function render() {
  if (!state.data) return;
  const items = getItems();
  clampSelection(items);
  el.summary.textContent = `${state.data.history.length} 条历史`;

  if (!items.length) {
    el.historyList.innerHTML = `
      <div class="empty">
        <strong>${state.search ? '没有匹配内容' : '还没有记录'}</strong>
        <span>${state.search ? '换个关键词试试。' : '复制文本后会自动保存，重启后也会保留。'}</span>
      </div>`;
    return;
  }

  el.historyList.innerHTML = items.map((item, index) => `
    <button class="history-item ${index === state.selectedIndex ? 'active' : ''} ${item.type === 'image' ? 'image-item' : ''}" data-index="${index}" data-id="${item.id}">
      ${item.type === 'image' ? `
        <span class="quick-thumb">
          <img src="${item.dataUrl}" alt="图片预览" />
        </span>
      ` : ''}
      <span class="quick-text">
        <span class="preview">${escapeHtml(item.preview || String(item.value || '').slice(0, 100))}</span>
        <span class="meta">${typeLabel(item.type)} · ${formatTime(item.updatedAt)}${item.favorite ? ' · 已收藏' : ''}</span>
      </span>
    </button>
  `).join('');

  el.historyList.querySelectorAll('.history-item').forEach(node => {
    node.addEventListener('mouseenter', () => {
      updateSelection(Number(node.dataset.index));
    });
    node.addEventListener('click', (event) => {
      event.preventDefault();
      updateSelection(Number(node.dataset.index));
    });
    node.addEventListener('dblclick', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.selectedIndex = Number(node.dataset.index);
      await pasteSelected();
    });
    node.addEventListener('contextmenu', async (event) => {
      event.preventDefault();
      state.selectedIndex = Number(node.dataset.index);
      await api.showItemMenu(node.dataset.id);
    });
  });

  el.historyList.querySelector('.history-item.active')?.scrollIntoView({ block: 'nearest' });
}

async function pasteSelected() {
  const item = getItems()[state.selectedIndex];
  if (!item) return;
  await api.pasteItem(item.id);
}

async function bootstrap() {
  state.data = await api.getState();
  state.selectedIndex = 0;
  render();
}

el.searchInput.addEventListener('input', () => {
  state.search = el.searchInput.value;
  state.selectedIndex = 0;
  render();
});

el.openMainBtn.addEventListener('click', () => api.showMainWindow());

document.addEventListener('keydown', async (event) => {
  const items = getItems();
  if (event.key === 'Escape') {
    event.preventDefault();
    await api.hidePanel();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    await pasteSelected();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    updateSelection(Math.min(state.selectedIndex + 1, Math.max(items.length - 1, 0)), true);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    updateSelection(Math.max(state.selectedIndex - 1, 0), true);
  }
});

document.addEventListener('mousedown', (event) => {
  if (event.target === document.body) {
    api.hidePanel();
  }
});

api.onStateChanged((nextState) => {
  state.data = nextState;
  render();
});

api.onPanelOpened((nextState) => {
  state.data = nextState;
  state.search = '';
  state.selectedIndex = 0;
  el.searchInput.value = '';
  render();
  requestAnimationFrame(() => el.searchInput.focus());
});

bootstrap();
