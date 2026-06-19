const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipboardLite', {
  getState: () => ipcRenderer.invoke('clipboard-lite:get-state'),
  copyItem: (id) => ipcRenderer.invoke('clipboard-lite:copy-item', id),
  togglePin: (id) => ipcRenderer.invoke('clipboard-lite:toggle-pin', id),
  showItemMenu: (id) => ipcRenderer.invoke('clipboard-lite:show-item-menu', id),
  pasteItem: (id) => ipcRenderer.invoke('clipboard-lite:paste-item', id),
  copyItemAsTable: (id) => ipcRenderer.invoke('clipboard-lite:copy-item-as-table', id),
  pasteItemAsTable: (id) => ipcRenderer.invoke('clipboard-lite:paste-item-as-table', id),
  copyItemTransformed: (id, action) => ipcRenderer.invoke('clipboard-lite:copy-item-transformed', id, action),
  pasteItemTransformed: (id, action) => ipcRenderer.invoke('clipboard-lite:paste-item-transformed', id, action),
  getPlanComparison: () => ipcRenderer.invoke('clipboard-lite:get-plan-comparison'),
  createCheckout: (payload) => ipcRenderer.invoke('clipboard-lite:create-checkout', payload),
  activateLicense: (payload) => ipcRenderer.invoke('clipboard-lite:activate-license', payload),
  refreshSubscription: () => ipcRenderer.invoke('clipboard-lite:refresh-subscription'),
  saveTemplate: (template) => ipcRenderer.invoke('clipboard-lite:save-template', template),
  deleteTemplate: (id) => ipcRenderer.invoke('clipboard-lite:delete-template', id),
  copyTemplate: (id) => ipcRenderer.invoke('clipboard-lite:copy-template', id),
  exportBackup: () => ipcRenderer.invoke('clipboard-lite:export-backup'),
  importBackup: () => ipcRenderer.invoke('clipboard-lite:import-backup'),
  copyText: (text) => ipcRenderer.invoke('clipboard-lite:copy-text', text),
  toggleFavorite: (id) => ipcRenderer.invoke('clipboard-lite:toggle-favorite', id),
  deleteItem: (id) => ipcRenderer.invoke('clipboard-lite:delete-item', id),
  clearHistory: () => ipcRenderer.invoke('clipboard-lite:clear-history'),
  updateSettings: (settings) => ipcRenderer.invoke('clipboard-lite:update-settings', settings),
  openExternal: (url) => ipcRenderer.invoke('clipboard-lite:open-external', url),
  hidePanel: () => ipcRenderer.invoke('clipboard-lite:hide-panel'),
  showMainWindow: () => ipcRenderer.invoke('clipboard-lite:show-main-window'),
  onStateChanged: (callback) => {
    ipcRenderer.removeAllListeners('clipboard-lite:state');
    ipcRenderer.on('clipboard-lite:state', (_event, state) => callback(state));
  },
  onPanelOpened: (callback) => {
    ipcRenderer.removeAllListeners('clipboard-lite:panel-opened');
    ipcRenderer.on('clipboard-lite:panel-opened', (_event, state) => callback(state));
  }
});
