/**
 * Backups of the school's database.
 *
 *   automatic()   once a day while IlmForge runs; the last 14 are kept
 *   saveTo(file)  a copy wherever the user chooses (USB, another drive)
 *   restore(file) puts a backup back; the current data is kept first
 *   list()        what is in the backups folder
 *
 * A backup is the whole database in one file (.ilmbackup): every record,
 * photo and setting. While the server runs it is copied with SQLite's own
 * VACUUM INTO, so the copy is complete even mid-work.
 */
const fs = require('fs');
const path = require('path');
const paths = require('./paths');
const config = require('./config');
const server = require('./server');
const log = require('./log');

const KEEP = 14;
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

async function saveTo(file) {
  if (server.running) await server.api('/desktop/backup', { method: 'POST', body: { filePath: file } });
  else server.copyDb(paths.dbFile, file);
  log.app(`backup saved: ${file}`);
  return { file, size: fs.statSync(file).size };
}

async function automatic({ force = false } = {}) {
  const cfg = config.load();
  const last = cfg.lastAutoBackupAt ? new Date(cfg.lastAutoBackupAt) : null;
  if (!force && last && Date.now() - last.getTime() < 20 * 3600 * 1000) return null;
  if (!fs.existsSync(paths.dbFile)) return null;
  const file = path.join(paths.autoBackupsDir, `IlmForge-${stamp()}.ilmbackup`);
  const out = await saveTo(file);
  config.save({ lastAutoBackupAt: new Date().toISOString() });
  // Keep the newest ones.
  const old = fs.readdirSync(paths.autoBackupsDir).filter((f) => f.endsWith('.ilmbackup')).sort().reverse().slice(KEEP);
  for (const f of old) { try { fs.unlinkSync(path.join(paths.autoBackupsDir, f)); } catch { /* in use */ } }
  return out;
}

function list() {
  const rows = [];
  const add = (dir, kind) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      if (!/\.(ilmbackup|db)$/i.test(f)) continue;
      const st = fs.statSync(path.join(dir, f));
      rows.push({ file: path.join(dir, f), name: f, kind, size: st.size, at: st.mtime.toISOString() });
    }
  };
  add(paths.autoBackupsDir, 'automatic');
  add(paths.backupsDir, 'kept');
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

/* Is this file an SQLite database (an IlmForge backup)? */
function looksLikeBackup(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    return buf.toString('latin1') === 'SQLite format 3\u0000';
  } catch { return false; }
}

/* Put a backup back. The server is stopped, the current data kept as a
   backup, the file copied in, brought up to this version, and restarted. */
async function restore(file, onStatus = () => {}) {
  if (!looksLikeBackup(file)) throw new Error('That file is not an IlmForge backup (.ilmbackup).');
  onStatus('Stopping IlmForge…');
  await server.stop();
  const keep = path.join(paths.backupsDir, `before-restore-${stamp()}.ilmbackup`);
  if (fs.existsSync(paths.dbFile)) server.copyDb(paths.dbFile, keep);
  try {
    onStatus('Putting the backup back…');
    fs.copyFileSync(file, paths.dbFile);
    for (const ext of ['-wal', '-shm']) { if (fs.existsSync(paths.dbFile + ext)) fs.unlinkSync(paths.dbFile + ext); }
    config.save({ schemaHash: null }); // an older backup is brought up to date
    await server.prepareDatabase(onStatus);
  } catch (e) {
    if (fs.existsSync(keep)) server.copyDb(keep, paths.dbFile);
    config.save({ schemaHash: null });
    await server.prepareDatabase(onStatus).catch(() => {});
    await server.start();
    throw e;
  }
  onStatus('Starting IlmForge…');
  await server.start();
  log.app(`restored from ${file}; previous data kept in ${keep}`);
  return { kept: keep };
}

module.exports = { automatic, saveTo, restore, list, looksLikeBackup };
