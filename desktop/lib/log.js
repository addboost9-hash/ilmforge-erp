/* Logs in the data folder (logs\server.log, logs\app.log), kept small. */
const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const MAX = 5 * 1024 * 1024;

function write(name, text) {
  const file = path.join(paths.logsDir, `${name}.log`);
  try {
    if (fs.existsSync(file) && fs.statSync(file).size > MAX) fs.renameSync(file, `${file}.old`);
    fs.appendFileSync(file, text.endsWith('\n') ? text : `${text}\n`);
  } catch { /* logging must never break the app */ }
}

const app = (msg) => write('app', `${new Date().toISOString()} ${msg}`);

module.exports = { write, app };
