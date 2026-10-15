/**
 * Licences for the IlmForge desktop app, signed so they cannot be made up.
 *
 * The platform owner's server signs a licence with an Ed25519 private key
 * (LICENSE_PRIVATE_KEY, kept only on the server). The desktop app carries
 * only the matching public key, so it can check a licence with no internet
 * but cannot create one. (The older ILM-xxxx keys used a shared secret that
 * shipped inside every install, so anyone could generate them.)
 *
 * A licence is one line of text:  ILMF1.<payload>.<signature>
 *   payload (base64url JSON): { v, lid, school, plan, issued, expires, machine? }
 *     lid      licence id, also stored on the school (School.licenseKey) so
 *              the platform can suspend it online
 *     machine  optional: the one computer it works on (see machineId())
 *
 * Keys are base64 DER (PKCS#8 private, SPKI public) so they fit in one
 * environment variable. backend/scripts/license-keys.js makes a pair.
 */
const crypto = require('crypto');

const PREFIX = 'ILMF1';
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const privateKeyFrom = (b64) => crypto.createPrivateKey({ key: Buffer.from(b64, 'base64'), format: 'der', type: 'pkcs8' });
const publicKeyFrom = (b64) => crypto.createPublicKey({ key: Buffer.from(b64, 'base64'), format: 'der', type: 'spki' });

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
    privateKey: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
  };
}

const dateOnly = (d) => {
  const t = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(t.getTime())) throw new Error('Invalid date.');
  return t.toISOString().slice(0, 10);
};

/** Sign a licence. privateKeyB64 defaults to process.env.LICENSE_PRIVATE_KEY. */
function signLicense({ lid, school, plan = 'standard', expires, machine = null, issued = new Date() }, privateKeyB64 = process.env.LICENSE_PRIVATE_KEY) {
  if (!privateKeyB64) {
    const e = new Error('Desktop licences cannot be issued: LICENSE_PRIVATE_KEY is not set on the server.');
    e.status = 503;
    throw e;
  }
  const payload = {
    v: 1,
    lid: String(lid),
    school: String(school || '').slice(0, 120),
    plan: String(plan || 'standard').slice(0, 20),
    issued: dateOnly(issued),
    expires: dateOnly(expires),
    ...(machine ? { machine: String(machine).trim().toUpperCase().slice(0, 40) } : {}),
  };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.sign(null, Buffer.from(`${PREFIX}.${body}`), privateKeyFrom(privateKeyB64));
  return `${PREFIX}.${body}.${b64url(sig)}`;
}

/**
 * Check a licence. Returns { valid, payload?, reason?, daysLeft? }.
 * reason: 'format' | 'signature' | 'expired' | 'machine' | 'clock'
 */
function verifyLicense(text, publicKeyB64, { now = new Date(), machine = null, lastSeen = null } = {}) {
  const t = String(text || '').trim().replace(/\s+/g, '');
  const parts = t.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return { valid: false, reason: 'format' };
  let ok = false;
  try {
    ok = crypto.verify(null, Buffer.from(`${PREFIX}.${parts[1]}`), publicKeyFrom(publicKeyB64), fromB64url(parts[2]));
  } catch { ok = false; }
  if (!ok) return { valid: false, reason: 'signature' };
  let payload;
  try { payload = JSON.parse(fromB64url(parts[1]).toString('utf8')); } catch { return { valid: false, reason: 'format' }; }
  // Turning the computer's date back does not extend a licence.
  if (lastSeen && now.getTime() < new Date(lastSeen).getTime() - 2 * 86400000) return { valid: false, reason: 'clock', payload };
  if (payload.machine && machine && payload.machine !== String(machine).toUpperCase()) return { valid: false, reason: 'machine', payload };
  // Valid to the end of its expiry day (Pakistan time).
  const end = new Date(`${payload.expires}T23:59:59+05:00`);
  if (now.getTime() > end.getTime()) return { valid: false, reason: 'expired', payload, daysLeft: 0 };
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  return { valid: true, payload, daysLeft };
}

module.exports = { generateKeyPair, signLicense, verifyLicense, PREFIX };
