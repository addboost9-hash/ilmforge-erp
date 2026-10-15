/**
 * Where everything lives.
 *
 * The program (reinstalled or upgraded freely):
 *   <install folder>\resources\backend    the IlmForge server
 *   <install folder>\resources\frontend   the web app it serves
 *
 * The school's own files, never touched by installing, upgrading or
 * uninstalling (in the Windows user's AppData\Roaming\IlmForge):
 *   data\ilmforge.db      the database: every record of the school
 *   backups\              automatic and manual backups
 *   logs\                 what the server did, for support
 *   config.json           this installation's settings and secrets
 *   license.txt           the licence
 */
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const resources = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'app');
// ILMFORGE_DATA_DIR puts the school's files somewhere else (testing, or a
// second drive set up by support).
if (process.env.ILMFORGE_DATA_DIR) app.setPath('userData', path.resolve(process.env.ILMFORGE_DATA_DIR));
const userData = app.getPath('userData');

const p = {
  resources,
  userData,
  dataDir: path.join(userData, 'data'),
  dbFile: path.join(userData, 'data', 'ilmforge.db'),
  backupsDir: path.join(userData, 'backups'),
  autoBackupsDir: path.join(userData, 'backups', 'automatic'),
  logsDir: path.join(userData, 'logs'),
  configFile: path.join(userData, 'config.json'),
  licenseFile: path.join(userData, 'license.txt'),
  backendDir: path.join(resources, 'backend'),
  frontendDir: path.join(resources, 'frontend'),
  publicKeyFile: path.join(__dirname, '..', 'license-public.txt'),
};
p.schemaFile = path.join(p.backendDir, 'prisma', 'schema.prisma');
p.prismaCli = path.join(p.backendDir, 'node_modules', 'prisma', 'build', 'index.js');
p.serverEntry = path.join(p.backendDir, 'src', 'desktop-server.js');
// The database engines shipped with the app, named so Prisma never looks
// for (or tries to download) others.
p.schemaEngine = path.join(p.backendDir, 'node_modules', '@prisma', 'engines', 'schema-engine-windows.exe');
p.queryEngine = path.join(p.backendDir, 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node');

for (const d of [p.dataDir, p.backupsDir, p.autoBackupsDir, p.logsDir]) fs.mkdirSync(d, { recursive: true });

module.exports = p;
