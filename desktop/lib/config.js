/**
 * This installation's settings (config.json in the school's data folder).
 * The secrets are made on first run and are different on every computer,
 * so a sign-in from one installation means nothing to another.
 */
const fs = require('fs');
const crypto = require('crypto');
const paths = require('./paths');

const DEFAULTS = {
  port: 8090,
  lan: false,            // other computers on the school network may connect
  schemaHash: null,      // the database matches this version of the schema
  lastAutoBackupAt: null,
  lastSeen: null,        // latest date this computer has shown (licence clock check)
  suspended: null,       // { reason, at } when the platform suspended the licence
  window: { width: 1360, height: 860, maximized: true },
};

let cache = null;

function load() {
  if (cache) return cache;
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(paths.configFile, 'utf8')); } catch { saved = {}; }
  cache = { ...DEFAULTS, ...saved };
  let changed = false;
  if (!cache.jwtSecret) { cache.jwtSecret = crypto.randomBytes(48).toString('base64url'); changed = true; }
  if (!cache.jwtRefreshSecret) { cache.jwtRefreshSecret = crypto.randomBytes(48).toString('base64url'); changed = true; }
  if (!cache.desktopToken) { cache.desktopToken = crypto.randomBytes(32).toString('base64url'); changed = true; }
  if (changed) save();
  return cache;
}

function save(patch = {}) {
  cache = { ...(cache || load()), ...patch };
  const tmp = `${paths.configFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, paths.configFile);
  return cache;
}

module.exports = { load, save };
