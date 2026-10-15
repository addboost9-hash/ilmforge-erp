/**
 * The IlmForge server as the desktop app runs it (desktop/main.js starts
 * this file in its own process). Everything comes from the environment the
 * app sets:
 *
 *   DATABASE_URL       file:<data folder>/ilmforge.db  (SQLite on this computer)
 *   PORT, HOST         127.0.0.1, or 0.0.0.0 when other computers may connect
 *   JWT_SECRET         made once per installation
 *   DESKTOP_TOKEN      lets the app (only) call /api/v1/desktop
 *   FRONTEND_DIST      the built web app, served from the same address
 *   FRONTEND_URL       the address in links (portal links, receipts)
 *
 * The web app and the API are served from one address, so the app works
 * with no internet at all; other computers on the school network can open
 * the same address in a browser when the app allows them.
 */
process.env.ILMFORGE_DESKTOP = '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const path = require('path');
const fs = require('fs');
const express = require('express');
const app = require('./app');
const prisma = require('./config/prisma');

const PORT = parseInt(process.env.PORT, 10) || 8090;
const HOST = process.env.HOST || '127.0.0.1';
const DIST = process.env.FRONTEND_DIST;

// SQLite for many readers and one writer at a time, safe on power loss.
const tune = async () => {
  for (const p of ['PRAGMA journal_mode=WAL', 'PRAGMA synchronous=NORMAL', 'PRAGMA busy_timeout=8000', 'PRAGMA temp_store=MEMORY']) {
    await prisma.$queryRawUnsafe(p).catch(() => {});
  }
};

const root = express();
root.disable('x-powered-by');
if (DIST && fs.existsSync(path.join(DIST, 'index.html'))) {
  // The web app first, as the online site serves it (the API's security
  // headers would block the print windows' own small scripts): files with
  // long caching (their names change every build), and index.html for
  // every page address so reloading any page works.
  root.use(express.static(DIST, { index: false, maxAge: '30d', setHeaders: (res, file) => { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
  root.get(/^(?!\/api\/|\/health).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST, 'index.html'));
  });
}
root.use(app);

tune().then(() => {
  const server = root.listen(PORT, HOST, () => {
    console.log(`[desktop] IlmForge server on http://${HOST}:${PORT}`);
    if (process.parentPort) process.parentPort.postMessage({ type: 'ready', port: PORT });
    // Reminders and daily reports run here as on the online server; the ones
    // that need the internet (SMS, email) simply skip when it is not there.
    try { require('./services/scheduler.service').initScheduler(); } catch (e) { console.error('[desktop] scheduler', e.message); }
  });
  server.on('error', (e) => {
    console.error('[desktop] server error', e.code, e.message);
    if (process.parentPort) process.parentPort.postMessage({ type: 'error', code: e.code, message: e.message });
    process.exit(1);
  });
  const stop = () => server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  if (process.parentPort) process.parentPort.on('message', (m) => { if (m?.data?.type === 'stop') stop(); });
});
