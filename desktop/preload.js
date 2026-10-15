/**
 * What IlmForge's pages may ask of the desktop app (window.ilmDesktop).
 * Only these calls cross over; the pages never get Node or the file system.
 * Other computers on the school network open the same pages in a browser
 * and do not have window.ilmDesktop, so desktop-only screens stay hidden
 * there.
 */
const { contextBridge, ipcRenderer } = require('electron');

const call = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('ilmDesktop', {
  isDesktop: true,
  info: call('app:info'),
  // licence
  licenseCheck: call('license:check'),
  licenseActivate: call('license:activate'),
  licenseFromFile: call('license:fromFile'),
  licenseOpen: call('license:open'),
  // first run
  setupCreate: call('setup:create'),
  setupImport: call('setup:import'),
  setupRestore: call('setup:restore'),
  setupDone: call('setup:done'),
  // forgotten passwords (no emailed code offline)
  adminsList: call('admins:list'),
  resetPassword: call('password:reset'),
  openPasswordReset: call('password:open'),
  // backups and data
  backupNow: call('backup:now'),
  backupSaveAs: call('backup:saveAs'),
  backupList: call('backup:list'),
  backupRestore: call('backup:restore'),
  openDataFolder: call('data:openFolder'),
  openLogsFolder: call('logs:openFolder'),
  // other computers on the school network
  setLan: call('lan:set'),
  copyText: call('clipboard:write'),
  quit: call('app:quit'),
  onStatus: (fn) => {
    const handler = (_e, text) => fn(text);
    ipcRenderer.on('status', handler);
    return () => ipcRenderer.removeListener('status', handler);
  },
});
