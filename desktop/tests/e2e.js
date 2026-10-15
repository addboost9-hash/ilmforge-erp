/**
 * IlmForge desktop, end to end, in throwaway data folders:
 *   1  fresh start: licence screen refuses bad licences, takes a good one
 *   2  first-run setup: a new school; sign in; This Computer page; add data
 *   3  restart: straight in, the data is still there; daily backup exists
 *   4  restore a backup (the data goes back to before it was added)
 *   5  fresh start: bring a school in from a .ilmforge file; sign in with
 *      its own password; every student is there
 *   6  school network on: another device can reach it; off again
 *
 * Needs: the app staged (npm run stage) or DESKTOP_EXE pointing at a built
 * IlmForge.exe (dist/win-unpacked/IlmForge.exe); the licence private key in
 * ILMFORGE_LICENSE_PRIVATE_KEY_FILE; the local SQLite database
 * backend/prisma/dev.db with a school in it (for the transfer step).
 * Data folders and screenshots go to %TEMP%\ilmforge-e2e.
 *
 *   npm run test:e2e
 */
const { _electron: electron } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const DESKTOP = path.resolve(__dirname, '..');
const BACKEND = path.resolve(DESKTOP, '..', 'backend');
const SP = path.join(os.tmpdir(), 'ilmforge-e2e');
const SHOTS = path.join(SP, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const INSTALLED = process.env.DESKTOP_EXE || '';
const KEY_FILE = process.env.ILMFORGE_LICENSE_PRIVATE_KEY_FILE;
if (!KEY_FILE) {
  console.error('Set ILMFORGE_LICENSE_PRIVATE_KEY_FILE to license-private.txt: the test licences are signed with it.');
  process.exit(2);
}
let LIC;
let DEMO;

/* This computer's ID, worked out as lib/license.js does. */
function machineId() {
  const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { encoding: 'utf8', windowsHide: true });
  const seed = (out.match(/MachineGuid\s+REG_SZ\s+(\S+)/) || [])[1] || '';
  return crypto.createHash('sha256').update(`ilmforge:${seed}`).digest('hex').slice(0, 16).toUpperCase().match(/.{4}/g).join('-');
}

/* A licence for each case the licence screen must handle. */
function makeLicences() {
  const { signLicense } = require(path.join(BACKEND, 'src', 'utils', 'desktopLicense.js'));
  const key = fs.readFileSync(KEY_FILE, 'utf8').trim();
  const day = 86400000;
  const lic = {
    bound: signLicense({ lid: 'DTEST-BOUND', school: 'Test School (this computer)', plan: 'standard', expires: new Date(Date.now() + 400 * day), machine: machineId() }, key),
    any: signLicense({ lid: 'DTEST-ANY', school: 'Demo School', plan: 'premium', expires: new Date(Date.now() + 10 * day) }, key),
    other: signLicense({ lid: 'DTEST-OTHER', school: 'Other', expires: new Date(Date.now() + 30 * day), machine: 'AAAA-BBBB-CCCC-DDDD' }, key),
    expired: signLicense({ lid: 'DTEST-OLD', school: 'Old', expires: new Date(Date.now() - 3 * day) }, key),
  };
  // The same licence with its expiry changed by hand.
  const [p, body, sig] = lic.any.split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url')), expires: '2099-12-31' })).toString('base64url');
  lic.forged = `${p}.${forged}.${sig}`;
  return lic;
}

/* A transfer file of the first school in the local SQLite database
   (backend/prisma/dev.db), as the online app makes it. */
async function makeTransfer() {
  process.env.DATABASE_URL = `file:${path.join(BACKEND, 'prisma', 'dev.db').replace(/\\/g, '/')}`;
  const { exportSchool } = require(path.join(BACKEND, 'src', 'services', 'transfer.service.js'));
  const prisma = require(path.join(BACKEND, 'src', 'config', 'prisma'));
  const school = await prisma.school.findFirst({ where: { deletedAt: null }, orderBy: { id: 'asc' }, select: { id: true } });
  const file = path.join(SP, 'demo.ilmforge');
  const out = fs.createWriteStream(file);
  const r = await exportSchool(school.id, out, { appVersion: 'e2e' });
  await new Promise((res) => out.on('close', res));
  const students = await prisma.student.count({ where: { schoolId: school.id } });
  const activeStudents = await prisma.student.count({ where: { schoolId: school.id, status: 'active', deletedAt: null } });
  await prisma.$disconnect();
  return { file, students, activeStudents, total: Object.values(r.counts).reduce((a, b) => a + b, 0) };
}

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '  ✓' : '  ✗'} ${msg}`); if (!cond) failures += 1; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch(dataDir) {
  const env = { ...process.env, ILMFORGE_DATA_DIR: dataDir, ILMFORGE_PLATFORM_URL: 'http://127.0.0.1:9' };
  delete env.ELECTRON_RUN_AS_NODE; // set by the editor this runs in; never on a school's computer
  const app = await electron.launch({
    executablePath: INSTALLED || path.join(DESKTOP, 'node_modules/electron/dist/electron.exe'),
    args: INSTALLED ? [] : [DESKTOP],
    env,
    timeout: 120000,
  });
  // Native message boxes would wait for a click: answer them like a user
  // who chooses the first button, and remember what they said.
  await app.evaluate(({ dialog }) => {
    global.__boxes = [];
    dialog.showMessageBox = async (_w, o) => { global.__boxes.push((o || _w).message); return { response: 0 }; };
    dialog.showErrorBox = (t, m) => { global.__boxes.push(`ERROR ${t}: ${m}`); };
  });
  return app;
}
const boxes = (app) => app.evaluate(() => global.__boxes);

async function waitWin(app, re, timeout = 150000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    for (const w of app.windows()) {
      try { if (re.test(w.url())) return w; } catch { /* closing */ }
    }
    await sleep(300);
  }
  throw new Error(`no window ${re}; open: ${app.windows().map((w) => w.url()).join(', ')}`);
}
const MAIN = /^http:\/\/127\.0\.0\.1:\d+\//;

async function signIn(win, email, password) {
  await win.waitForSelector('input[type="password"]', { timeout: 60000 });
  await win.fill('input[placeholder*="mail" i]', email);
  await win.fill('input[type="password"]', password);
  await win.click('button[type="submit"]');
  await win.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 60000 });
}
const api = (win, route, opts = {}) => win.evaluate(async ({ route, opts }) => {
  const t = localStorage.getItem('accessToken');
  const r = await fetch(`/api/v1${route}`, { ...opts, headers: { 'content-type': 'application/json', Authorization: `Bearer ${t}` } });
  return { status: r.status, body: await r.json().catch(() => null) };
}, { route, opts });

(async () => {
  LIC = makeLicences();
  DEMO = await makeTransfer();
  console.log(`Transfer file: ${DEMO.total} records, ${DEMO.activeStudents} current students`);
  const A = path.join(SP, 'dt-data-a');
  const B = path.join(SP, 'dt-data-b');
  for (const d of [A, B]) fs.rmSync(d, { recursive: true, force: true });

  /* 1 ─ licence */
  console.log('\n1. Fresh start: the licence');
  let app = await launch(A);
  let t0 = Date.now();
  const lic = await waitWin(app, /license\.html/);
  await lic.waitForFunction(() => !document.getElementById('machine').textContent.includes('·'));
  const machine = await lic.textContent('#machine');
  ok(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/.test(machine), `shows this computer's ID (${machine})`);
  await lic.screenshot({ path: path.join(SHOTS, '1-licence.png') });
  const tryLic = async (text) => {
    await lic.fill('#lic', text);
    await lic.click('#activate');
    await lic.waitForFunction(() => !document.getElementById('msg').hidden);
    return lic.textContent('#msg');
  };
  ok(/not an IlmForge desktop licence/.test(await tryLic('hello there')), 'refuses text that is not a licence');
  ok(/not issued by IlmForge, or it was changed/.test(await tryLic(LIC.forged)), 'refuses a licence whose expiry was changed');
  ok(/different computer/.test(await tryLic(LIC.other)), 'refuses a licence for another computer');
  ok(/expired/.test(await tryLic(LIC.expired)), 'refuses an expired licence');
  ok(/Activated for Test School/.test(await tryLic(LIC.bound)), 'accepts the licence for this computer');
  await lic.screenshot({ path: path.join(SHOTS, '1-licence-ok.png') });

  /* 2 ─ setup */
  console.log('\n2. First-run setup: a new school');
  const setup = await waitWin(app, /setup\.html/);
  console.log(`  (database created and server started in ${Math.round((Date.now() - t0) / 1000)}s)`);
  await setup.screenshot({ path: path.join(SHOTS, '2-setup.png') });
  await setup.click('[data-pick="new"]');
  await setup.click('#new button[type="submit"]');
  ok(await setup.isVisible('[data-f="schoolName"].bad'), 'an empty form is not sent; the fields say what is missing');
  await setup.fill('#schoolName', 'Al-Noor Public School');
  await setup.fill('#name', 'Ayesha Khan');
  await setup.fill('#phone', '0300-1234567');
  await setup.fill('#email', 'ayesha@alnoor.edu.pk');
  await setup.fill('#password', 'Noor@2026');
  await setup.fill('#confirm', 'Noor@2026x');
  await setup.click('#new button[type="submit"]');
  ok(/different/.test(await setup.textContent('[data-f="confirm"] .err')), 'passwords that differ are caught');
  await setup.fill('#confirm', 'Noor@2026');
  await setup.click('#new button[type="submit"]');
  await setup.waitForSelector('#done:not([hidden])', { timeout: 60000 });
  ok(/Al-Noor Public School is ready/.test(await setup.textContent('#doneTitle')), 'school created');
  await setup.screenshot({ path: path.join(SHOTS, '2-setup-done.png') });
  await setup.click('#open');

  let main = await waitWin(app, MAIN);
  await main.waitForLoadState('domcontentloaded');
  await main.waitForSelector('input[type="password"]', { timeout: 60000 });
  ok(/\/login/.test(main.url()), `the app opens on sign-in (${main.url()})`);
  const forgot = await main.locator('button:has-text("Forgot Password?")').count();
  ok(forgot === 1, 'Forgot Password opens the reset on this computer (no emailed code)');
  await main.screenshot({ path: path.join(SHOTS, '2-login.png') });
  await signIn(main, 'ayesha@alnoor.edu.pk', 'Noor@2026');
  await sleep(1500);
  await main.screenshot({ path: path.join(SHOTS, '2-after-login.png') });
  ok(!/\/login/.test(main.url()), `signed in (${new URL(main.url()).pathname})`);
  const origin = new URL(main.url()).origin;

  await main.goto(`${origin}/settings/desktop`);
  await main.waitForSelector('text=This computer', { timeout: 30000 });
  await main.waitForSelector('text=Licensed to', { timeout: 30000 });
  await sleep(800);
  await main.screenshot({ path: path.join(SHOTS, '2-this-computer.png'), fullPage: true });
  const pageText = await main.textContent('main, body');
  ok(/Test School \(this computer\)/.test(pageText), 'This Computer shows the licence');
  ok(/For this computer only/.test(pageText), '... bound to this computer');
  ok(/Daily backup/.test(pageText), 'a daily backup was made on the first start');
  ok(await main.locator('a[href="/settings/desktop"]').count() > 0, 'the sidebar has This Computer');
  ok(await main.locator('a[href="/settings/backup"]').count() === 0, 'the online JSON backup is not in the sidebar');

  const cls = await api(main, '/classes', { method: 'POST', body: JSON.stringify({ name: 'Grade 7 — added after the backup' }) });
  ok(cls.status === 201, 'a class can be added');
  const lic2 = await api(main, '/license/status');
  ok(lic2.body?.data?.mode === 'desktop', 'no online licence banner in the desktop app');

  // Print windows open inside the app.
  const popupOk = await main.evaluate(() => { const w = window.open('', '_blank'); const okk = !!w; if (w) w.close(); return okk; });
  ok(popupOk, 'print windows (window.open) are allowed');
  await app.close();
  ok(fs.readdirSync(path.join(A, 'backups', 'automatic')).length >= 1, 'automatic backups are in the data folder');

  /* 3 ─ restart */
  console.log('\n3. Restart: straight in, data kept');
  t0 = Date.now();
  app = await launch(A);
  main = await waitWin(app, MAIN);
  console.log(`  (opened in ${Math.round((Date.now() - t0) / 1000)}s)`);
  ok(!app.windows().some((w) => /license|setup/.test(w.url())), 'no licence or setup screen the second time');
  await main.waitForURL((u) => !/^\/$/.test(u.pathname), { timeout: 30000 });
  await sleep(1000);
  ok(/\/dashboard/.test(main.url()), `still signed in after closing and opening (${new URL(main.url()).pathname})`);
  const classes = await api(main, '/classes');
  const names = (classes.body?.data || []).map((c) => c.name);
  ok(names.includes('Grade 7 — added after the backup'), 'the class added before closing is still there');

  /* 4 ─ restore */
  console.log('\n4. Restore a backup');
  const list = await main.evaluate(() => window.ilmDesktop.backupList());
  const daily = list.find((b) => b.kind === 'automatic');
  ok(!!daily, `backup list (${list.length}) has the daily backup`);
  await main.evaluate((f) => window.ilmDesktop.backupRestore(f), daily.file);
  main = await waitWin(app, /\/login/);
  await signIn(main, 'ayesha@alnoor.edu.pk', 'Noor@2026');
  const after = (await api(main, '/classes')).body?.data || [];
  ok(!after.some((c) => c.name === 'Grade 7 — added after the backup'), 'after the restore, the class added later is gone (data is as in the backup)');
  ok(fs.readdirSync(path.join(A, 'backups')).some((f) => f.startsWith('before-restore-')), 'the data from before the restore was kept');
  ok((await boxes(app)).some((m) => /Replace the school's current data/.test(m)), 'the restore asked first');

  // Password reset on this computer.
  const admins = await main.evaluate(() => window.ilmDesktop.adminsList());
  ok(admins.ok && admins.users.length === 1, 'reset: lists the admin');
  const reset = await main.evaluate((id) => window.ilmDesktop.resetPassword(id, 'NewPass#2026'), admins.users[0].id);
  ok(reset.ok, 'reset: password changed');
  await main.evaluate(() => { localStorage.clear(); location.href = '/login'; });
  await signIn(main, 'ayesha@alnoor.edu.pk', 'NewPass#2026');
  ok(!/\/login/.test(main.url()), 'reset: signs in with the new password');
  await app.close();

  /* 5 ─ import */
  console.log('\n5. Fresh start: bring a school in from IlmForge online');
  app = await launch(B);
  const lic3 = await waitWin(app, /license\.html/);
  await lic3.fill('#lic', LIC.any);
  await lic3.click('#activate');
  const setupB = await waitWin(app, /setup\.html/);
  const file = DEMO.file;
  await app.evaluate(({ dialog }, f) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [f] }); }, file);
  await setupB.click('[data-pick="import"]');
  t0 = Date.now();
  await setupB.click('#import [data-go]');
  await setupB.waitForSelector('#done:not([hidden])', { timeout: 300000 });
  console.log(`  (imported in ${Math.round((Date.now() - t0) / 1000)}s)`);
  const doneText = await setupB.textContent('#done');
  ok(doneText.includes(`${DEMO.total.toLocaleString('en-US')} records were brought in`), `all records brought in (${doneText.match(/[\d,]+ records/)?.[0]})`);
  await setupB.screenshot({ path: path.join(SHOTS, '5-import-done.png') });
  await setupB.click('#open');
  main = await waitWin(app, MAIN);
  await signIn(main, 'admin@demo.com', 'Admin@123');
  ok(!/\/login/.test(main.url()), 'the online admin signs in with the same password');
  const st = await api(main, '/students?limit=500');
  const total = st.body?.pagination?.total ?? st.body?.total ?? st.body?.data?.length;
  ok(total === DEMO.activeStudents, `every current student is listed (${total} of ${DEMO.activeStudents}; ${DEMO.students} rows incl. removed)`);
  await main.goto(`${origin.replace(/:\d+$/, '')}:${new URL(main.url()).port}/dashboard`);
  await sleep(2500);
  await main.screenshot({ path: path.join(SHOTS, '5-dashboard.png') });

  /* 6 ─ school network */
  console.log('\n6. School network');
  const lan = await main.evaluate(() => window.ilmDesktop.setLan(true));
  ok(lan.lan === true, `network on; addresses: ${lan.addresses.join(', ') || '(none: no network)'}`);
  if (lan.addresses.length) {
    const r = await fetch(`${lan.addresses[0]}/health`).then((x) => x.status).catch((e) => e.message);
    ok(r === 200, `another device reaches ${lan.addresses[0]} (${r})`);
    const page = await fetch(`${lan.addresses[0]}/login`).then((x) => x.text()).catch(() => '');
    ok(/<div id="root">/.test(page), 'and gets the IlmForge sign-in page');
    const desk = await fetch(`${lan.addresses[0]}/api/v1/desktop/status`).then((x) => x.status).catch((e) => e.message);
    ok(desk === 403, `the desktop-only routes refuse other devices (${desk})`);
  }
  main = await waitWin(app, MAIN);
  const off = await main.evaluate(() => window.ilmDesktop.setLan(false));
  ok(off.lan === false, 'network off again');
  if (lan.addresses.length) {
    const r = await fetch(`${lan.addresses[0]}/health`, { signal: AbortSignal.timeout(3000) }).then((x) => x.status).catch(() => 'unreachable');
    ok(r === 'unreachable', `other devices can no longer reach it (${r})`);
  }
  const msgs = await boxes(app);
  ok(!msgs.some((m) => /^ERROR/.test(m)), `no error boxes${msgs.filter((m) => /^ERROR/.test(m)).join(' | ')}`);
  await app.close();

  console.log(failures ? `\n✗ ${failures} failed` : '\n✓ all passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('\n✗ crashed:', e); process.exit(1); });
