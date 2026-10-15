/**
 * IlmForge desktop app.
 *
 * Start-up: licence → database ready (created, or updated with a backup
 * first) → server on this computer → first-run setup if no school yet →
 * the IlmForge window. Everything works with no internet; the school's data
 * stays in its own folder, untouched by installing, upgrading or removing
 * the program.
 */
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, shell, clipboard, nativeImage } = require('electron');

app.setAppUserModelId('com.ilmforge.desktop');
// Before the single-instance lock, which belongs to the data folder.
if (process.env.ILMFORGE_DATA_DIR) app.setPath('userData', path.resolve(process.env.ILMFORGE_DATA_DIR));
// The browser's own caches in one sub-folder, apart from the school's files.
app.setPath('sessionData', path.join(app.getPath('userData'), 'browser'));
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  const paths = require('./lib/paths');
  const config = require('./lib/config');
  const license = require('./lib/license');
  const server = require('./lib/server');
  const backup = require('./lib/backup');
  const log = require('./lib/log');

  const ICON = path.join(__dirname, 'pages', 'icon.png');
  const PAGES = path.join(__dirname, 'pages');
  let splash = null;
  let mainWin = null;
  let pageWin = null;
  let tray = null;
  let quitting = false;
  const waits = new WeakMap(); // page window -> { resolve, quitOnClose }

  const status = (text) => { log.app(text); for (const w of [splash, pageWin]) { if (w && !w.isDestroyed()) w.webContents.send('status', text); } };

  /* ─── windows ──────────────────────────────────────────────── */
  function showSplash() {
    splash = new BrowserWindow({
      width: 520, height: 340, frame: false, resizable: false, show: false, center: true, icon: ICON,
      backgroundColor: '#0d2056', webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: true, contextIsolation: true },
    });
    splash.loadFile(path.join(PAGES, 'splash.html'));
    splash.once('ready-to-show', () => splash.show());
  }

  function showPage(name, { width = 880, height = 680, query = {}, wait = null } = {}) {
    if (pageWin && !pageWin.isDestroyed()) { waits.delete(pageWin); pageWin.close(); }
    const w = new BrowserWindow({
      width, height, show: false, center: true, icon: ICON, title: 'IlmForge', autoHideMenuBar: true,
      backgroundColor: '#F1F5F9', webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: true, contextIsolation: true },
    });
    if (wait) waits.set(w, wait);
    w.setMenuBarVisibility(false);
    w.loadFile(path.join(PAGES, `${name}.html`), { query });
    w.once('ready-to-show', () => { w.show(); if (splash && !splash.isDestroyed()) splash.hide(); });
    w.on('closed', () => {
      if (pageWin === w) pageWin = null;
      const pending = waits.get(w);
      waits.delete(w);
      if (!pending || quitting) return;
      // Closing the licence or setup window at start-up ends the app;
      // closing a licence renewal opened from the app just goes back.
      if (pending.quitOnClose) { quitting = true; app.quit(); } else pending.resolve(null);
    });
    pageWin = w;
    return w;
  }

  /* A page that something waits on: resolved by finishPage(), or by being
     closed (then the app quits, unless quitOnClose is false). */
  function waitForPage(name, opts = {}) {
    return new Promise((resolve) => showPage(name, { ...opts, wait: { resolve, quitOnClose: opts.quitOnClose !== false } }));
  }
  const waiting = () => !!(pageWin && waits.has(pageWin));
  function finishPage(value) {
    const w = pageWin;
    const pending = w && waits.get(w);
    if (!pending) return;
    waits.delete(w);
    w.close();
    pending.resolve(value);
  }

  function openMain() {
    const cfg = config.load();
    const w = cfg.window || {};
    mainWin = new BrowserWindow({
      width: w.width || 1360, height: w.height || 860, minWidth: 1000, minHeight: 640, show: false, icon: ICON, title: 'IlmForge',
      backgroundColor: '#F1F5F9',
      webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: true, contextIsolation: true, spellcheck: false },
    });
    const origin = server.url();
    mainWin.loadURL(`${origin}/`);
    mainWin.once('ready-to-show', () => {
      if (w.maximized !== false) mainWin.maximize();
      mainWin.show();
      if (splash && !splash.isDestroyed()) splash.close();
      warnSoonExpiring();
    });
    // Print windows (about:blank) open inside the app; web links in the browser.
    mainWin.webContents.setWindowOpenHandler(({ url }) => {
      if (!url || url === 'about:blank' || url.startsWith(server.url())) {
        return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, icon: ICON, width: 1000, height: 820 } };
      }
      if (/^(https?|mailto|tel|whatsapp):/i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    mainWin.webContents.on('will-navigate', (e, url) => {
      if (!url.startsWith(server.url())) { e.preventDefault(); if (/^(https?|mailto|tel):/i.test(url)) shell.openExternal(url); }
    });
    const keepBounds = () => {
      if (!mainWin || mainWin.isDestroyed()) return;
      const maximized = mainWin.isMaximized();
      const b = maximized ? (config.load().window || {}) : mainWin.getBounds();
      config.save({ window: { width: b.width, height: b.height, maximized } });
    };
    mainWin.on('resize', keepBounds);
    mainWin.on('close', (e) => {
      keepBounds();
      // Other computers are using this one: keep serving from the tray.
      if (config.load().lan && !quitting) {
        e.preventDefault();
        mainWin.hide();
        ensureTray();
        tray?.displayBalloon?.({ title: 'IlmForge is still running', content: 'Other computers in the school are using it. Right-click the IlmForge icon to quit.' });
      }
    });
    mainWin.on('closed', () => { mainWin = null; });
    buildMenu();
  }

  /* A small window over the main one (password reset). */
  function openTool(name, { width = 640, height = 560 } = {}) {
    const w = new BrowserWindow({
      width, height, parent: mainWin || undefined, modal: !!mainWin, show: false, icon: ICON, title: 'IlmForge', autoHideMenuBar: true,
      backgroundColor: '#F1F5F9', webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: true, contextIsolation: true },
    });
    w.setMenuBarVisibility(false);
    w.loadFile(path.join(PAGES, `${name}.html`));
    w.once('ready-to-show', () => w.show());
    return w;
  }

  function showMain(route) {
    if (!mainWin) return;
    if (route) mainWin.loadURL(`${server.url()}${route}`);
    mainWin.show();
    mainWin.focus();
  }

  function ensureTray() {
    if (tray) return;
    tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
    tray.setToolTip('IlmForge — school management');
    const addrs = () => server.lanAddresses().map((a) => `http://${a}:${server.port}`);
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open IlmForge', click: () => showMain() },
      { label: 'Address for other computers', enabled: false },
      ...addrs().map((a) => ({ label: `   ${a}`, click: () => clipboard.writeText(a) })),
      { type: 'separator' },
      { label: 'Quit IlmForge', click: () => { quitting = true; app.quit(); } },
    ]));
    tray.on('double-click', () => showMain());
  }

  /* ─── menu ─────────────────────────────────────────────────── */
  function buildMenu() {
    const cfg = config.load();
    const template = [
      {
        label: '&File',
        submenu: [
          { label: 'Back up now', accelerator: 'CmdOrCtrl+Shift+B', click: () => doBackupNow(mainWin) },
          { label: 'Save a backup copy to…', click: () => doBackupSaveAs(mainWin) },
          { label: 'Restore from a backup…', click: () => doRestore(mainWin) },
          { type: 'separator' },
          { label: 'Open the school data folder', click: () => shell.openPath(paths.userData) },
          { type: 'separator' },
          { label: 'Quit', accelerator: 'Alt+F4', click: () => { quitting = true; app.quit(); } },
        ],
      },
      {
        label: '&View',
        submenu: [
          { label: 'Home', accelerator: 'Alt+Home', click: () => showMain('/') },
          { role: 'reload' }, { type: 'separator' },
          { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: '&School network',
        submenu: [
          {
            label: 'Let other computers and phones in the school use IlmForge', type: 'checkbox', checked: !!cfg.lan,
            click: (item) => setLan(item.checked, mainWin),
          },
          { label: 'Show the address for other computers', enabled: !!cfg.lan, click: () => showLanAddresses(mainWin) },
        ],
      },
      {
        label: '&Help',
        submenu: [
          { label: 'This computer (backups, licence, network)', click: () => showMain('/settings/desktop') },
          { label: 'Reset a password…', click: () => openTool('reset') },
          { label: 'User manual', click: () => showMain('/manual') },
          { label: 'Licence…', click: () => showLicenseInfo(mainWin) },
          { label: 'Open the logs folder', click: () => shell.openPath(paths.logsDir) },
          { type: 'separator' },
          { label: 'Developer tools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWin?.webContents.toggleDevTools() },
          { label: `About IlmForge ${app.getVersion()}`, click: () => showAbout(mainWin) },
        ],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  /* ─── actions ──────────────────────────────────────────────── */
  async function doBackupNow(win) {
    try {
      const r = await backup.automatic({ force: true });
      dialog.showMessageBox(win, { type: 'info', title: 'Backup made', message: 'A complete backup of the school was made.', detail: r?.file || '' });
      return r;
    } catch (e) { dialog.showErrorBox('Backup failed', e.message); throw e; }
  }

  async function doBackupSaveAs(win) {
    const school = (await server.api('/desktop/status').catch(() => ({}))).school;
    const name = `${(school?.slug || 'school')}-${new Date().toISOString().slice(0, 10)}.ilmbackup`;
    const r = await dialog.showSaveDialog(win, {
      title: 'Save a backup of the school', defaultPath: path.join(app.getPath('documents'), name),
      filters: [{ name: 'IlmForge backup', extensions: ['ilmbackup'] }],
    });
    if (r.canceled || !r.filePath) return null;
    try {
      const out = await backup.saveTo(r.filePath);
      dialog.showMessageBox(win, { type: 'info', title: 'Backup saved', message: 'The backup was saved.', detail: `${r.filePath}\n\nKeep it somewhere safe, away from this computer (a USB drive, for example).` });
      return out;
    } catch (e) { dialog.showErrorBox('Backup failed', e.message); throw e; }
  }

  async function doRestore(win, file) {
    if (!file) {
      const r = await dialog.showOpenDialog(win, {
        title: 'Choose the backup to put back', defaultPath: paths.backupsDir, properties: ['openFile'],
        filters: [{ name: 'IlmForge backup', extensions: ['ilmbackup', 'db'] }],
      });
      if (r.canceled || !r.filePaths[0]) return null;
      file = r.filePaths[0];
    }
    const ok = await dialog.showMessageBox(win, {
      type: 'warning', buttons: ['Put this backup back', 'Cancel'], defaultId: 1, cancelId: 1, title: 'Restore a backup',
      message: 'Replace the school\'s current data with this backup?',
      detail: `${file}\n\nEverything entered after this backup was made will be replaced. The current data is kept as a backup first, so this can be undone.`,
    });
    if (ok.response !== 0) return null;
    try {
      const out = await backup.restore(file, (t) => log.app(t));
      // The restored data may have other users and roles: everyone signs in again.
      if (mainWin) {
        await mainWin.webContents.executeJavaScript("['accessToken', 'refreshToken', 'user', 'school', 'campusId'].forEach((k) => localStorage.removeItem(k))", true).catch(() => {});
        mainWin.loadURL(`${server.url()}/login`);
      }
      dialog.showMessageBox(win, { type: 'info', title: 'Backup restored', message: 'The backup was put back. Sign in again.', detail: `Your previous data was kept in:\n${out.kept}` });
      return out;
    } catch (e) { dialog.showErrorBox('Restore failed', `${e.message}\n\nThe school's data was left as it was.`); throw e; }
  }

  async function setLan(on, win) {
    config.save({ lan: !!on });
    const before = server.port;
    await server.stop();
    const s = await server.start();
    buildMenu();
    if (on) ensureTray(); else if (tray) { tray.destroy(); tray = null; }
    // This computer keeps using 127.0.0.1: only a new port needs a new page.
    if (mainWin && s.port !== before) mainWin.loadURL(`${server.url()}/`);
    if (on) showLanAddresses(win, s.lan);
    return { lan: !!on, addresses: s.lan.map((a) => `http://${a}:${s.port}`) };
  }

  function showLanAddresses(win, list = server.lanAddresses()) {
    const urls = list.map((a) => `http://${a}:${server.port}`);
    dialog.showMessageBox(win, {
      type: 'info', title: 'Other computers in the school',
      message: urls.length ? 'On another computer, tablet or phone on the same school Wi-Fi or network, open:' : 'This computer is not connected to a network.',
      detail: urls.length
        ? `${urls.join('\n')}\n\nKeep IlmForge running on this computer while others use it. If Windows asks about the firewall, choose "Allow" for private networks.`
        : 'Connect it to the school Wi-Fi or network cable, then try again.',
    });
  }

  function showLicenseInfo(win) {
    const r = license.check();
    const p = r.payload || {};
    dialog.showMessageBox(win, {
      type: r.valid ? 'info' : 'warning', title: 'IlmForge licence', buttons: ['OK', 'Enter a new licence'], defaultId: 0,
      message: r.valid ? `Licensed to ${p.school}` : r.message,
      detail: `${r.valid ? `Plan: ${p.plan}\nValid until: ${p.expires} (${r.daysLeft} days)\n` : ''}This computer's ID: ${r.machine}`,
    }).then((x) => { if (x.response === 1) waitForPage('license', { width: 840, height: 720, quitOnClose: false }).then(() => buildMenu()); });
  }

  function showAbout(win) {
    dialog.showMessageBox(win, {
      type: 'info', title: 'About IlmForge',
      message: `IlmForge School Management System ${app.getVersion()}`,
      detail: `Desktop edition: works on this computer without internet.\n\nSchool data: ${paths.dataDir}\nBackups: ${paths.backupsDir}\n\nSupport: WhatsApp 0346-5146609`,
    });
  }

  function warnSoonExpiring() {
    const r = license.check();
    if (r.valid && r.daysLeft <= 14 && mainWin) {
      dialog.showMessageBox(mainWin, {
        type: 'warning', title: 'Licence ending soon',
        message: `The IlmForge licence ends in ${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'} (${r.payload.expires}).`,
        detail: `Ask IlmForge for a renewal (WhatsApp 0346-5146609) and enter it in Help → Licence. Your data stays on this computer either way.\n\nThis computer's ID: ${r.machine}`,
      });
    }
  }

  /* ─── IPC from the pages ───────────────────────────────────── */
  ipcMain.handle('app:info', async () => {
    const cfg = config.load();
    const r = license.check();
    let dbSize = 0;
    try { dbSize = fs.statSync(paths.dbFile).size + (fs.existsSync(`${paths.dbFile}-wal`) ? fs.statSync(`${paths.dbFile}-wal`).size : 0); } catch { dbSize = 0; }
    return {
      version: app.getVersion(),
      dataDir: paths.userData, dbFile: paths.dbFile, dbSize, backupsDir: paths.backupsDir,
      lan: !!cfg.lan, port: server.port, addresses: cfg.lan ? server.lanAddresses().map((a) => `http://${a}:${server.port}`) : [],
      lastAutoBackupAt: cfg.lastAutoBackupAt,
      license: { valid: r.valid, message: r.message, machine: r.machine, ...(r.payload ? { school: r.payload.school, plan: r.payload.plan, expires: r.payload.expires, daysLeft: r.daysLeft, lid: r.payload.lid, boundToComputer: !!r.payload.machine } : {}) },
    };
  });
  ipcMain.handle('license:check', () => license.check());
  ipcMain.handle('license:activate', (_e, text) => {
    const r = license.activate(text);
    if (r.valid && waiting()) setTimeout(() => finishPage(r), 900);
    return r;
  });
  ipcMain.handle('license:open', async () => {
    await waitForPage('license', { width: 840, height: 720, quitOnClose: false });
    buildMenu();
    return license.check();
  });
  ipcMain.handle('license:fromFile', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const r = await dialog.showOpenDialog(win, { title: 'Choose the licence file', properties: ['openFile'], filters: [{ name: 'Licence', extensions: ['txt', 'ilmlicense', 'lic'] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    return fs.readFileSync(r.filePaths[0], 'utf8').trim();
  });
  ipcMain.handle('setup:create', async (_e, form) => server.api('/desktop/setup', { method: 'POST', body: form }).then((d) => ({ ok: true, ...d }), (err) => ({ ok: false, message: err.message, errors: err.errors })));
  ipcMain.handle('setup:import', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const r = await dialog.showOpenDialog(win, { title: 'Choose the file downloaded from IlmForge online', properties: ['openFile'], filters: [{ name: 'IlmForge transfer file', extensions: ['ilmforge'] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    e.sender.send('status', 'Bringing in the school\'s records… a large school can take a few minutes.');
    log.app(`importing ${r.filePaths[0]}`);
    return server.api('/desktop/import', { method: 'POST', body: { filePath: r.filePaths[0] } }).then((d) => {
      log.app(`imported ${d.school?.name}: ${d.total} records`);
      return { ok: true, ...d };
    }, (err) => ({ ok: false, message: err.message }));
  });
  ipcMain.handle('setup:restore', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const r = await dialog.showOpenDialog(win, { title: 'Choose an IlmForge backup', properties: ['openFile'], filters: [{ name: 'IlmForge backup', extensions: ['ilmbackup', 'db'] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    try {
      await backup.restore(r.filePaths[0], status);
      const st = await server.api('/desktop/status');
      if (!st.schools) return { ok: false, message: 'That backup has no school in it. Choose another backup, or start a new school.' };
      return { ok: true, school: st.school };
    } catch (err) { return { ok: false, message: err.message }; }
  });
  ipcMain.handle('admins:list', () => server.api('/desktop/admins').then((users) => ({ ok: true, users }), (err) => ({ ok: false, message: err.message })));
  ipcMain.handle('password:reset', (_e, userId, password) => server.api('/desktop/reset-password', { method: 'POST', body: { userId, password } })
    .then((d) => { log.app(`password reset for user ${userId}`); return { ok: true, ...d }; }, (err) => ({ ok: false, message: err.message })));
  ipcMain.handle('password:open', () => { openTool('reset'); return true; });
  ipcMain.handle('setup:done', () => { finishPage(true); return true; });
  ipcMain.handle('backup:now', (e) => doBackupNow(BrowserWindow.fromWebContents(e.sender)));
  ipcMain.handle('backup:saveAs', (e) => doBackupSaveAs(BrowserWindow.fromWebContents(e.sender)));
  ipcMain.handle('backup:list', () => backup.list());
  ipcMain.handle('backup:restore', (e, file) => doRestore(BrowserWindow.fromWebContents(e.sender), file));
  ipcMain.handle('data:openFolder', () => shell.openPath(paths.userData));
  ipcMain.handle('logs:openFolder', () => shell.openPath(paths.logsDir));
  ipcMain.handle('lan:set', (e, on) => setLan(on, BrowserWindow.fromWebContents(e.sender)));
  ipcMain.handle('clipboard:write', (_e, text) => { clipboard.writeText(String(text || '')); return true; });
  ipcMain.handle('app:quit', () => { quitting = true; app.quit(); });

  /* ─── start-up ─────────────────────────────────────────────── */
  async function boot() {
    showSplash();
    try {
      status('Checking the licence…');
      let lic = license.check();
      if (!lic.valid) {
        await waitForPage('license', { width: 840, height: 720 });
        if (quitting) return;
        lic = license.check();
        if (splash && !splash.isDestroyed()) splash.show();
      }
      status('Getting the school database ready…');
      await server.prepareDatabase(status);
      status('Starting IlmForge…');
      const s = await server.start();
      if (s.lan.length) ensureTray();
      const st = await server.api('/desktop/status');
      if (!st.schools) {
        await waitForPage('setup', { width: 980, height: 760 });
        if (quitting) return;
      }
      // The day's backup, once there is a school to back up.
      backup.automatic().catch((e) => log.app(`automatic backup failed: ${e.message}`));
      openMain();
    } catch (e) {
      log.app(`start-up failed: ${e.stack || e.message}`);
      showPage('error', { width: 640, height: 460, query: { message: e.message } });
      if (splash && !splash.isDestroyed()) splash.close();
      return;
    }

    // Keep checking: the licence each hour (and online twice a day), a
    // backup each day.
    setInterval(() => {
      const r = license.check();
      if (!r.valid && mainWin && !waiting()) {
        mainWin.hide();
        waitForPage('license', { width: 840, height: 720 }).then(() => showMain());
      }
      backup.automatic().catch(() => {});
    }, 60 * 60 * 1000);
    const online = () => license.checkOnline().then((r) => {
      if (!r.valid && r.reason === 'suspended' && mainWin && !waiting()) {
        mainWin.hide();
        waitForPage('license', { width: 840, height: 720 }).then(() => showMain());
      }
    }).catch(() => {});
    setTimeout(online, 20 * 1000);
    setInterval(online, 12 * 60 * 60 * 1000);
  }

  server.on((type, e) => {
    if (type === 'failed') {
      log.app(`server failed: ${e.message}`);
      dialog.showErrorBox('IlmForge stopped', `${e.message}\n\nClose IlmForge and open it again. If it keeps happening, contact support (WhatsApp 0346-5146609) and send the files in Help → Open the logs folder.`);
    }
    if (type === 'restarted' && mainWin) mainWin.reload();
  });

  app.on('second-instance', () => {
    const w = mainWin || pageWin || splash;
    if (w) { if (w.isMinimized()) w.restore(); w.show(); w.focus(); }
  });
  app.on('window-all-closed', () => {
    if (!config.load().lan || quitting) app.quit();
  });
  let finalised = false;
  app.on('before-quit', (e) => {
    quitting = true;
    if (finalised) return;
    e.preventDefault();
    finalised = true;
    (async () => {
      await server.stop();
      // A last backup when the day's work was not yet backed up.
      const last = config.load().lastAutoBackupAt;
      if (fs.existsSync(paths.dbFile) && (!last || Date.now() - new Date(last).getTime() > 4 * 3600 * 1000)) {
        try {
          const file = path.join(paths.autoBackupsDir, `IlmForge-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.ilmbackup`);
          server.copyDb(paths.dbFile, file);
          config.save({ lastAutoBackupAt: new Date().toISOString() });
        } catch (err) { log.app(`backup on quit failed: ${err.message}`); }
      }
    })().finally(() => app.quit());
  });

  app.whenReady().then(boot);
}
