/**
 * Make the key pair for desktop licences.
 *
 *   node scripts/license-keys.js <folder>
 *
 * Writes two files into <folder>:
 *   license-private.txt  → copy into Render as LICENSE_PRIVATE_KEY. Keep it
 *                          secret and keep a copy: without it no new licence
 *                          can be issued for apps built with the public key.
 *   license-public.txt   → put in desktop/license-public.txt before building
 *                          the desktop app.
 * Refuses to overwrite an existing pair.
 */
const fs = require('fs');
const path = require('path');
const { generateKeyPair } = require('../src/utils/desktopLicense');

const dir = path.resolve(process.argv[2] || '.');
const priv = path.join(dir, 'license-private.txt');
const pub = path.join(dir, 'license-public.txt');
if (fs.existsSync(priv) || fs.existsSync(pub)) {
  console.error(`A key pair already exists in ${dir}. Delete it first if you really want a new one (old licences will stop working in new builds).`);
  process.exit(1);
}
fs.mkdirSync(dir, { recursive: true });
const { publicKey, privateKey } = generateKeyPair();
fs.writeFileSync(priv, privateKey + '\n', { mode: 0o600 });
fs.writeFileSync(pub, publicKey + '\n');
console.log(`Private key: ${priv}\nPublic key:  ${pub}`);
