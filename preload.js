const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('modelShiftAPI', {
  getInitState: () => ipcRenderer.invoke('get-init-state'),
  setMode: (mode) => ipcRenderer.invoke('set-mode', mode),
  toggleAutoSendKeys: () => ipcRenderer.invoke('toggle-auto-send-keys'),
  launchOpenCodeApp: () => ipcRenderer.invoke('launch-opencode-app'),
  discoverOllama: (autoMap) => ipcRenderer.invoke('discover-ollama', autoMap),
  unloadOllamaModel: (payload) => ipcRenderer.invoke('unload-ollama-model', payload),
  ollamaChatStream: (payload) => ipcRenderer.invoke('ollama-chat-stream', payload),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  toggleGarage: (forceState) => ipcRenderer.invoke('toggle-garage', forceState),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
  shiftGear: (payload) => ipcRenderer.invoke('shift-gear', payload),
  openWTTab: (payload) => ipcRenderer.invoke('open-wt-tab', payload),
  sendTerminalInput: (payload) => ipcRenderer.invoke('send-terminal-input', payload),
  launchAgentInGarage: (payload) => ipcRenderer.invoke('launch-agent-in-garage', payload),
  updateGearConfig: (payload) => ipcRenderer.invoke('update-gear-config', payload),
  resetGearConfig: () => ipcRenderer.invoke('reset-gear-config'),
  windowControl: (action) => ipcRenderer.invoke('window-control', action),
  onGearOutput: (callback) => {
    ipcRenderer.on('gear-output', (_, data) => callback(data));
  },
  onGlobalShift: (callback) => {
    ipcRenderer.on('global-shift', (_, gear) => callback(gear));
  },
  onOllamaToken: (callback) => {
    ipcRenderer.on('ollama-token', (_, data) => callback(data));
  },
  onProxyActivity: (callback) => {
    ipcRenderer.on('proxy-activity', (_, data) => callback(data));
  },
  onTachPulse: (callback) => {
    ipcRenderer.on('tach-pulse', (_, data) => callback(data));
  }
});
