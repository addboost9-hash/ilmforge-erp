/**
 * Prepares what the installer ships, in desktop/app:
 *
 *   app/frontend   the web app, built for the desktop (served by the local
 *                  server, no service worker), with its fonts saved inside
 *                  it so nothing is fetched from the internet
 *   app/backend    the server: src, the Prisma schema for SQLite, and only
 *                  its production packages, with the Prisma engines for
 *                  Windows
 *
 * Needs internet once (npm packages, Prisma engines, fonts); the result
 * does not. Run: npm run stage  (npm run dist also makes the installer).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const DESKTOP = path.resolve(__dirname, '..');
const APP = path.join(DESKTOP, 'app');
const FRONT_SRC = path.join(ROOT, 'frontend');
const BACK_SRC = path.join(ROOT, 'backend');
const FRONT_OUT = path.join(APP, 'frontend');
const BACK_OUT = path.join(APP, 'backend');

const step = (t) => console.log(`\n▸ ${t}`);
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const npm = (args, cwd) => run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd, shell: process.platform === 'win32' });

function sizeOf(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    n += e.isDirectory() ? sizeOf(p) : fs.statSync(p).size;
  }
  return n;
}
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

/* ─── frontend ─────────────────────────────────────────────────── */
function buildFrontend() {
  step('Building the web app for the desktop');
  run(process.execPath, [path.join(FRONT_SRC, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--outDir', FRONT_OUT, '--emptyOutDir'], {
    cwd: FRONT_SRC,
    env: { ...process.env, VITE_API_URL: '/api/v1', VITE_DESKTOP: '1' },
  });
}

/* Google Fonts → files inside the app. Every fonts.googleapis.com stylesheet
   the built app links or imports is downloaded with the font files it names,
   and the app is pointed at the copies. */
async function localiseFonts() {
  step('Saving the fonts inside the app');
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
  const fontsDir = path.join(FRONT_OUT, 'fonts');
  fs.mkdirSync(fontsDir, { recursive: true });
  const files = [path.join(FRONT_OUT, 'index.html'), ...fs.readdirSync(path.join(FRONT_OUT, 'assets')).filter((f) => f.endsWith('.css')).map((f) => path.join(FRONT_OUT, 'assets', f))];
  const sheetUrl = /https:\/\/fonts\.googleapis\.com\/css2?\?[^"')\s]+/g;
  const done = new Map();
  let fontFiles = 0;
  for (const file of files) {
    let text = fs.readFileSync(file, 'utf8');
    const urls = [...new Set(text.match(sheetUrl) || [])];
    for (const raw of urls) {
      const url = raw.replace(/&amp;/g, '&');
      if (!done.has(url)) {
        const res = await fetch(url, { headers: { 'user-agent': UA } });
        if (!res.ok) throw new Error(`Font stylesheet ${url}: ${res.status}`);
        let css = await res.text();
        const fontUrls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || [])];
        for (const fu of fontUrls) {
          const name = `${crypto.createHash('sha1').update(fu).digest('hex').slice(0, 12)}${path.extname(new URL(fu).pathname) || '.woff2'}`;
          const target = path.join(fontsDir, name);
          if (!fs.existsSync(target)) {
            const r = await fetch(fu, { headers: { 'user-agent': UA } });
            if (!r.ok) throw new Error(`Font ${fu}: ${r.status}`);
            fs.writeFileSync(target, Buffer.from(await r.arrayBuffer()));
            fontFiles += 1;
          }
          css = css.split(fu).join(`/fonts/${name}`);
        }
        const sheet = `${crypto.createHash('sha1').update(url).digest('hex').slice(0, 12)}.css`;
        fs.writeFileSync(path.join(fontsDir, sheet), css);
        done.set(url, `/fonts/${sheet}`);
      }
      text = text.split(raw).join(done.get(url));
    }
    // No point asking the browser to connect to Google ahead of time.
    text = text.replace(/\s*<link rel="(preconnect|dns-prefetch)" href="https:\/\/[^"]+"( crossorigin)?\s*\/?>/g, '');
    fs.writeFileSync(file, text);
  }
  console.log(`  ${done.size} font stylesheets, ${fontFiles} font files (${mb(sizeOf(fontsDir))})`);
  const left = files.filter((f) => /fonts\.(googleapis|gstatic)\.com/.test(fs.readFileSync(f, 'utf8')));
  if (left.length) throw new Error(`Still pointing at Google Fonts: ${left.join(', ')}`);
}

/* ─── backend ──────────────────────────────────────────────────── */
function copyDir(from, to, skip = () => false) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (skip(a, e)) continue;
    if (e.isDirectory()) copyDir(a, b, skip);
    else fs.copyFileSync(a, b);
  }
}

function stageBackend() {
  step('Staging the server');
  copyDir(path.join(BACK_SRC, 'src'), path.join(BACK_OUT, 'src'), (p) => /\.(test|spec)\.[cm]?js$/.test(p));
  for (const f of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(BACK_SRC, f), path.join(BACK_OUT, f));
  fs.mkdirSync(path.join(BACK_OUT, 'prisma'), { recursive: true });
  // The desktop database is SQLite whatever the online schema says.
  const schema = fs.readFileSync(path.join(BACK_SRC, 'prisma', 'schema.prisma'), 'utf8')
    .replace(/(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"[^"]+"/, '$1"sqlite"');
  if (!/provider\s*=\s*"sqlite"/.test(schema)) throw new Error('Could not set the schema provider to sqlite');
  fs.writeFileSync(path.join(BACK_OUT, 'prisma', 'schema.prisma'), schema);

  step('Installing the server\'s packages (production only)');
  npm(['ci', '--omit=dev', '--no-audit', '--no-fund', '--loglevel=error'], BACK_OUT);

  step('Preparing the database engine (Prisma) for Windows');
  run(process.execPath, [path.join(BACK_OUT, 'node_modules', 'prisma', 'build', 'index.js'), 'generate', '--schema', path.join(BACK_OUT, 'prisma', 'schema.prisma')], {
    cwd: BACK_OUT,
    env: { ...process.env, DATABASE_URL: 'file:./build-check.db', PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1' },
  });
  // Make sure the engine `prisma db push` needs on the school's computer is here.
  const engines = path.join(BACK_OUT, 'node_modules', '@prisma', 'engines');
  if (!fs.readdirSync(engines).some((f) => /^schema-engine.*windows.*\.exe$/.test(f))) {
    throw new Error('The Prisma schema engine for Windows is missing from @prisma/engines');
  }

  step('Trimming files the server does not need');
  let removed = 0;
  const prune = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { prune(p); continue; }
      // (*.tmp<pid>: a copy npm's install of the Prisma engines left behind)
      if (/\.(md|markdown|map|d\.ts|d\.mts|d\.cts|tsbuildinfo)$/i.test(e.name) || /^(CHANGELOG|HISTORY|AUTHORS)(\..*)?$/i.test(e.name) || /\.tmp\d+$/.test(e.name)) {
        removed += fs.statSync(p).size;
        fs.unlinkSync(p);
      }
    }
  };
  prune(path.join(BACK_OUT, 'node_modules'));
  console.log(`  ${mb(removed)} removed`);
}

(async () => {
  const t0 = Date.now();
  if (fs.existsSync(APP)) fs.rmSync(APP, { recursive: true, force: true });
  fs.mkdirSync(APP, { recursive: true });
  buildFrontend();
  await localiseFonts();
  stageBackend();
  console.log(`\n✓ Ready in ${Math.round((Date.now() - t0) / 1000)}s — frontend ${mb(sizeOf(FRONT_OUT))}, backend ${mb(sizeOf(BACK_OUT))}`);
})().catch((e) => { console.error(`\n✗ ${e.stack || e.message}`); process.exit(1); });
