/**
 * Make an IlmForge desktop licence on this computer, without the online
 * server: for a school that uses only the desktop app and so is not in
 * Platform Control.
 *
 *   node scripts/desktop-licence.js --key <license-private.txt> --school "School name"
 *        [--days 365 | --expires 2027-03-31] [--plan standard] [--machine XXXX-XXXX-XXXX-XXXX]
 *
 * --machine ties the licence to the computer whose ID the app shows on its
 * licence screen; without it the licence works on any computer.
 * Prints the licence and saves it as IlmForge-licence-<school>.txt here.
 *
 * A licence made here is not in the online database, so Platform Control
 * cannot suspend it: it simply ends on its expiry date. Schools that also
 * exist online get their licence from Platform Control instead.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { signLicense, verifyLicense } = require('../src/utils/desktopLicense');

const args = {};
for (let i = 2; i < process.argv.length; i += 1) {
  const a = process.argv[i];
  if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1]; i += 1; }
}
const fail = (msg) => { console.error(msg); process.exit(1); };

if (!args.key || !args.school) {
  fail('Usage: node scripts/desktop-licence.js --key <license-private.txt> --school "School name" [--days 365 | --expires YYYY-MM-DD] [--plan standard] [--machine XXXX-XXXX-XXXX-XXXX]');
}
if (!fs.existsSync(args.key)) fail(`No key file at ${args.key}`);
const school = String(args.school).trim();
if (school.length < 3) fail('Give the school\'s full name.');
const plan = String(args.plan || 'standard').toLowerCase();
if (!['free', 'starter', 'standard', 'premium'].includes(plan)) fail('--plan must be free, starter, standard or premium.');
const machine = args.machine ? String(args.machine).trim().toUpperCase() : null;
if (machine && !/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/.test(machine)) fail('The computer ID looks like A684-640A-00FA-8899: copy it from the app\'s licence screen.');
const expires = args.expires ? new Date(`${args.expires}T12:00:00+05:00`) : new Date(Date.now() + (parseInt(args.days, 10) || 365) * 86400000);
if (Number.isNaN(expires.getTime()) || expires < new Date()) fail('The expiry must be a date in the future (YYYY-MM-DD).');

const lid = `L-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
const license = signLicense({ lid, school, plan, expires, machine }, fs.readFileSync(args.key, 'utf8').trim());

// Check it against the public key the app is built with, so a wrong key
// file is caught here and not at the school.
const pubFile = path.resolve(__dirname, '..', '..', 'desktop', 'license-public.txt');
if (fs.existsSync(pubFile)) {
  const v = verifyLicense(license, fs.readFileSync(pubFile, 'utf8').trim(), { machine: machine || undefined });
  if (!v.valid) fail(`This key does not match the desktop app's public key (${v.reason}). Use the license-private.txt made with it.`);
}

const file = path.resolve(`IlmForge-licence-${school.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}.txt`);
fs.writeFileSync(file, `${license}\n`);
console.log(`
School:      ${school}
Plan:        ${plan}
Valid until: ${expires.toISOString().slice(0, 10)}
Computer:    ${machine || 'any computer'}
Licence no.: ${lid}

${license}

Saved: ${file}
Send the file (or the text above) to the school. They open or paste it on IlmForge's licence screen.`);
