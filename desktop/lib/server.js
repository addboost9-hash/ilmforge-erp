/**
 * Runs the IlmForge server on this computer.
 *
 *   prepareDatabase()  first run: creates the database; after an upgrade:
 *                      brings it up to the new version (a backup is taken
 *                      first and put back if anything fails)
 *   start() / stop()   the server, in its own process, so a server error
 *                      never closes the window; it is restarted if it stops
 *   api(path, body)    calls the server's desktop-only routes
 */
const fs = require('fs');
const net = require('net');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { utilityProcess } = require('electron');
const paths = require('./paths');
const config = require('./config');
const log = require('./log');

let child = null;
let port = null;
let stopping = false;
let restarts = 0;
const listeners = new Set();
const dbUrl = () => `file:${paths.dbFile.replace(/\\/g, '/')}`;

const schemaHash = () => crypto.createHash('sha256').update(fs.readFileSync(paths.schemaFile)).digest('hex').slice(0, 16);

function baseEnv(extra = {}) {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/^(DATABASE_URL|PORT|HOST|NODE_OPTIONS|ELECTRON_RUN_AS_NODE)$/.test(k)) delete env[k];
  const engines = fs.existsSync(paths.schemaEngine) && fs.existsSync(paths.queryEngine)
    ? { PRISMA_SCHEMA_ENGINE_BINARY: paths.schemaEngine, PRISMA_QUERY_ENGINE_LIBRARY: paths.queryEngine }
    : {};
  return { ...env, DATABASE_URL: dbUrl(), PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1', NODE_ENV: 'production', ...engines, ...extra };
}

/* A Node script run to completion (the Prisma CLI). Run by this program's
   own executable as plain Node: under utilityProcess the Prisma CLI took a
   minute to exit after finishing in a second. */
function runNode(script, args, env) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [script, ...args], { env: { ...env, ELECTRON_RUN_AS_NODE: '1' }, cwd: paths.backendDir, windowsHide: true });
    let out = '';
    const take = (d) => { const s = d.toString(); out += s; log.write('db', s); };
    p.stdout.on('data', take);
    p.stderr.on('data', take);
    p.on('error', (e) => resolve({ code: -1, out: `${out}\n${e.message}` }));
    p.on('close', (code) => resolve({ code, out }));
  });
}

/* Create the database, or bring it up to this version's schema. */
async function prepareDatabase(onStatus = () => {}) {
  const cfg = config.load();
  const hash = schemaHash();
  const exists = fs.existsSync(paths.dbFile) && fs.statSync(paths.dbFile).size > 0;
  if (exists && cfg.schemaHash === hash) return { changed: false };
  let safety = null;
  if (exists) {
    onStatus('Keeping a copy of your data before the update…');
    safety = path.join(paths.backupsDir, `before-update-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.ilmbackup`);
    copyDb(paths.dbFile, safety);
  }
  onStatus(exists ? 'Updating your database for this version…' : 'Creating the school database on this computer…');
  const r = await runNode(paths.prismaCli, ['db', 'push', '--skip-generate', `--schema=${paths.schemaFile}`], baseEnv());
  if (r.code !== 0) {
    if (safety) { copyDb(safety, paths.dbFile); }
    const why = (r.out.match(/Error[^\n]*\n?[^\n]*/) || [r.out.slice(-400)])[0];
    const err = new Error(`The database could not be ${exists ? 'updated' : 'created'}. ${exists ? 'Your data was put back as it was. ' : ''}${why.trim()}`);
    err.details = r.out;
    throw err;
  }
  config.save({ schemaHash: hash });
  return { changed: true, safety };
}

/* A file copy of the database; only while the server is stopped. */
function copyDb(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  for (const ext of ['-wal', '-shm']) {
    if (fs.existsSync(from + ext)) fs.copyFileSync(from + ext, to + ext);
    else if (fs.existsSync(to + ext)) fs.unlinkSync(to + ext);
  }
}

const portFree = (p, host) => new Promise((resolve) => {
  const s = net.createServer();
  s.once('error', () => resolve(false));
  s.once('listening', () => s.close(() => resolve(true)));
  s.listen(p, host);
});
async function choosePort(host) {
  const cfg = config.load();
  for (let p = cfg.port; p < cfg.port + 60; p++) {
    if (await portFree(p, host)) { if (p !== cfg.port) config.save({ port: p }); return p; }
  }
  throw new Error('No free network port was found for IlmForge.');
}

function lanAddresses() {
  const os = require('os');
  return Object.values(os.networkInterfaces()).flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal && !/^169\.254\./.test(n.address))
    .map((n) => n.address);
}

async function start() {
  const cfg = config.load();
  const host = cfg.lan ? '0.0.0.0' : '127.0.0.1';
  port = await choosePort(host);
  const lan = cfg.lan ? lanAddresses()[0] : null;
  const env = baseEnv({
    PORT: String(port),
    HOST: host,
    JWT_SECRET: cfg.jwtSecret,
    JWT_REFRESH_SECRET: cfg.jwtRefreshSecret,
    JWT_EXPIRES_IN: '12h',
    JWT_REFRESH_EXPIRES_IN: '30d',
    PLATFORM_OWNER_KEY: '', // the platform owner's controls are not part of a school's app
    DESKTOP_TOKEN: cfg.desktopToken,
    FRONTEND_DIST: paths.frontendDir,
    FRONTEND_URL: `http://${lan || '127.0.0.1'}:${port}`,
    APP_URL: `http://127.0.0.1:${port}`,
    LICENSE_PRIVATE_KEY: '',
  });
  stopping = false;
  child = utilityProcess.fork(paths.serverEntry, [], { env, stdio: 'pipe', serviceName: 'IlmForge Server', cwd: paths.backendDir });
  child.stdout?.on('data', (d) => log.write('server', d.toString()));
  child.stderr?.on('data', (d) => log.write('server', d.toString()));
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The IlmForge server did not start in time. See the log (Help → Open logs folder).')), 60000);
    child.on('message', (m) => {
      if (m?.type === 'ready') { clearTimeout(timer); resolve(); }
      if (m?.type === 'error') { clearTimeout(timer); reject(new Error(`The IlmForge server could not start: ${m.message}`)); }
    });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`The IlmForge server stopped while starting (code ${code}). See the log.`)); });
  });
  child.on('exit', (code) => {
    log.write('server', `[exit ${code}]\n`);
    child = null;
    if (!stopping) {
      // It should never stop by itself: start it again (a few times).
      if (restarts < 3) { restarts += 1; setTimeout(() => start().then(() => emit('restarted')).catch((e) => emit('failed', e)), 1500); }
      else emit('failed', new Error('The IlmForge server keeps stopping. See the log (Help → Open logs folder).'));
    }
  });
  await ready;
  restarts = 0;
  return { port, host, lan: cfg.lan ? lanAddresses() : [] };
}

function stop() {
  return new Promise((resolve) => {
    if (!child) return resolve();
    stopping = true;
    const c = child;
    const t = setTimeout(() => { try { c.kill(); } catch { /* gone */ } resolve(); }, 6000);
    c.once('exit', () => { clearTimeout(t); resolve(); });
    try { c.postMessage({ type: 'stop' }); } catch { c.kill(); }
  });
}

async function api(route, { method = 'GET', body } = {}) {
  const res = await fetch(`http://127.0.0.1:${port}/api/v1${route}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-desktop-token': config.load().desktopToken },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.message || `Server answered ${res.status}`), { status: res.status, errors: json.errors });
  return json.data;
}

const emit = (type, payload) => listeners.forEach((fn) => fn(type, payload));
const on = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

module.exports = {
  prepareDatabase, start, stop, api, copyDb, lanAddresses, on,
  get port() { return port; },
  get running() { return !!child; },
  url: () => `http://127.0.0.1:${port}`,
};
