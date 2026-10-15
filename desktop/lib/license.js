/**
 * The licence: checked on this computer with the public key (no internet
 * needed), and, when the internet is there, with the IlmForge platform so a
 * suspended licence stops (the answer is remembered while offline).
 *
 * The checking code is the server's own (backend/src/utils/desktopLicense.js),
 * so the app and the platform always agree on what a valid licence is.
 */
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const path = require('path');
const paths = require('./paths');
const config = require('./config');

const { verifyLicense } = require(path.join(paths.backendDir, 'src', 'utils', 'desktopLicense.js'));
const PLATFORM = (process.env.ILMFORGE_PLATFORM_URL || 'https://ilmforge-erp.onrender.com').replace(/\/$/, '');

/* This computer's ID, shown to the school to get a licence for one computer:
   from Windows' own machine id, so it survives reinstalling IlmForge. */
let machineIdCache = null;
function machineId() {
  if (machineIdCache) return machineIdCache;
  let seed = '';
  try {
    const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { encoding: 'utf8', windowsHide: true });
    seed = (out.match(/MachineGuid\s+REG_SZ\s+(\S+)/) || [])[1] || '';
  } catch { seed = ''; }
  if (!seed) seed = `${os.hostname()}|${Object.values(os.networkInterfaces()).flat().map((n) => n.mac).filter((m) => m && m !== '00:00:00:00:00:00').sort()[0] || ''}`;
  const hex = crypto.createHash('sha256').update(`ilmforge:${seed}`).digest('hex').slice(0, 16).toUpperCase();
  machineIdCache = hex.match(/.{4}/g).join('-');
  return machineIdCache;
}

const publicKey = () => fs.readFileSync(paths.publicKeyFile, 'utf8').trim();
const readText = () => { try { return fs.readFileSync(paths.licenseFile, 'utf8').trim(); } catch { return ''; } };

const REASONS = {
  missing: 'Enter the licence for this computer to start IlmForge.',
  format: 'That is not an IlmForge desktop licence. Copy the whole licence text (it starts with ILMF1.).',
  signature: 'This licence was not issued by IlmForge, or it was changed. Copy it again exactly as you received it.',
  expired: 'This licence has expired. Ask IlmForge for a renewal and enter the new licence.',
  machine: 'This licence is for a different computer. Ask IlmForge for a licence for this computer\'s ID.',
  clock: 'This computer\'s date is earlier than when IlmForge last ran. Set the correct date and time, then start IlmForge again.',
  suspended: 'This licence has been suspended by IlmForge.',
};

/* The licence state now: { valid, reason, message, payload, daysLeft, machine } */
function check(text = readText()) {
  const cfg = config.load();
  const machine = machineId();
  if (!text) return { valid: false, reason: 'missing', message: REASONS.missing, machine };
  const now = new Date();
  const r = verifyLicense(text, publicKey(), { now, machine, lastSeen: cfg.lastSeen });
  const out = { ...r, machine, message: r.valid ? '' : REASONS[r.reason] || 'The licence could not be checked.' };
  if (r.valid && cfg.suspended && cfg.suspended.lid === r.payload.lid) {
    return { ...out, valid: false, reason: 'suspended', message: `${REASONS.suspended} ${cfg.suspended.reason || ''}`.trim() };
  }
  if (r.valid && (!cfg.lastSeen || now > new Date(cfg.lastSeen))) config.save({ lastSeen: now.toISOString() });
  return out;
}

/* Save a licence someone entered, if it is valid for this computer. */
function activate(text) {
  const clean = String(text || '').trim().replace(/\s+/g, '');
  const r = check(clean);
  if (!r.valid) return r;
  fs.writeFileSync(paths.licenseFile, clean);
  const cfg = config.load();
  if (cfg.suspended && cfg.suspended.lid !== r.payload.lid) config.save({ suspended: null });
  return r;
}

/* Ask the platform whether this licence is still in good standing. Quiet
   when there is no internet: the last answer stands. */
async function checkOnline() {
  const r = check();
  if (!r.payload?.lid) return r;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const res = await fetch(`${PLATFORM}/api/v1/platform/check-license`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: r.payload.lid }), signal: ctl.signal,
    });
    clearTimeout(t);
    const j = await res.json();
    if (j && j.suspended) config.save({ suspended: { lid: r.payload.lid, reason: j.reason || '', at: new Date().toISOString() } });
    else if (j && j.valid) config.save({ suspended: null });
  } catch { /* offline: keep the last answer */ }
  return check();
}

module.exports = { check, activate, checkOnline, machineId, REASONS };
