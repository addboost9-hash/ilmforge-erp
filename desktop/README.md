# IlmForge desktop

The whole of IlmForge as a Windows app that runs on a school's own computer with no
internet. Electron runs the same backend (`backend/src`) and the same web app
(`frontend/src`) as the online version, with a SQLite database in the school's data
folder.

School-facing setup: `../OFFLINE_GUIDE.md`. Staff use: manual Part 14.

## How it fits together

```
IlmForge.exe (Electron main: main.js, lib/)
 ├─ licence check ............ lib/license.js  (Ed25519, public key in license-public.txt)
 ├─ database ready ........... lib/server.js prepareDatabase(): `prisma db push` when the
 │                             schema changed, after a safety copy
 ├─ server ................... utilityProcess → backend/src/desktop-server.js
 │                             (the Express app + the built web app, one origin,
 │                             127.0.0.1, or 0.0.0.0 when the school network is on)
 ├─ first run ................ pages/setup.html → /api/v1/desktop/setup | /import
 └─ window ................... http://127.0.0.1:<port>/
```

| Where | What |
|---|---|
| `%APPDATA%\IlmForge\data\ilmforge.db` | The school's records |
| `%APPDATA%\IlmForge\backups\` | Daily (14 kept), before-update, before-restore, saved |
| `%APPDATA%\IlmForge\logs\` | app.log, server.log, db.log |
| `%APPDATA%\IlmForge\config.json` | Port, network on/off, per-install JWT secrets and desktop token |
| `%APPDATA%\IlmForge\license.txt` | The licence |
| `<install>\resources\backend`, `frontend` | The program (replaced on update) |

`ILMFORGE_DATA_DIR` moves the data folder (tests, or a second drive).

Desktop-only server routes (`backend/src/routes/desktop.routes.js`) answer only when
`ILMFORGE_DESKTOP=1`, only to 127.0.0.1, and only with the per-install token the app
hands the server; other devices on the school network get 403.

## Build the installer

```
cd desktop
npm install
npm run dist        # → dist/IlmForge-Setup-<version>.exe
```

`npm run stage` alone prepares `app/` (web app built with `VITE_DESKTOP=1` and its
Google Fonts saved inside it; backend with production packages only, the schema
switched to SQLite, Prisma engines for Windows). The build needs internet; the result
does not. Bump `version` in `package.json` for each release.

`npm start` runs the staged app without packaging. In a VS Code terminal, unset
`ELECTRON_RUN_AS_NODE` first (VS Code sets it, and Electron then starts as plain Node).

The installer is not code-signed, so Windows SmartScreen warns on first run until it
is. With a code-signing certificate, set `CSC_LINK` and `CSC_KEY_PASSWORD` before
`npm run dist`.

## Licences

A licence is `ILMF1.<payload>.<signature>`: the payload (licence id, school, plan, issue
and expiry dates, and optionally one computer's ID) signed with Ed25519
(`backend/src/utils/desktopLicense.js`). The app holds only the public key, so a licence
cannot be made or changed without the private key.

- Keys: `node backend/scripts/license-keys.js <folder>` writes a pair once.
  `license-public.txt` goes in this folder (it ships in the app);
  `license-private.txt` is set as `LICENSE_PRIVATE_KEY` on the online server and kept
  somewhere safe. Never commit it. Changing the pair invalidates every licence issued.
- Issue: Platform Control → a school → **License** → **Make desktop licence**
  (`POST /api/v1/platform/schools/:id/desktop-license`). Optional Computer ID ties it to
  one computer.
- Suspend: Platform Control → **Revoke**. A desktop app that has internet checks
  `POST /api/v1/platform/check-license` on start and every 12 hours, and stops at the
  licence screen once suspended (remembered while offline).
- The app refuses a computer clock set earlier than the last date it ran.

## Moving a school from online

Online: Backup & Restore → **Download everything for the desktop app**
(`GET /api/v1/transfer/export`, admin only): every school-scoped table as gzipped JSON
(`.ilmforge`). Desktop first run → **Bring the school from IlmForge online** imports it
with the original ids in one transaction (`backend/src/services/transfer.service.js`).
Passwords are hashes, so everyone keeps their sign-in.

## Tests

- `backend/tests/desktop/license.test.mjs`: signing and checking licences.
- End-to-end (Playwright `_electron`): licence refusals and activation, new school,
  sign-in, restart, daily backup and restore, password reset, import of a `.ilmforge`
  file, school network on and off. Run against `dist/win-unpacked/IlmForge.exe` before a
  release.
