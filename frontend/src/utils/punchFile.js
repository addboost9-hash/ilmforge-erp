/**
 * IlmForge — a fingerprint or face machine's log file, read into punches.
 *
 * Every machine can put its attendance log on a USB stick, whatever its make.
 * The files differ; these are recognised by themselves:
 *
 *   ZKTeco / eSSL "attlog.dat"   "  1843<TAB>2026-11-28 08:01:02<TAB>1<TAB>0<TAB>1<TAB>0", no header
 *   ZKTeco / eSSL "GLG_001.TXT"  header "No Mchn EnNo Name Mode IOMd DateTime", ids zero-padded
 *   ZKTeco software exports      "AC-No.", "Name", "Time" (or "Date" + "Time"), "State"
 *   Hikvision exports            "Employee ID" / "Person ID", "Name", "Time" / "Authentication Time", "Attendance Status"
 *   Anything else in a table     a header with an id column and a time (or date and time) column,
 *                                or no header: the first id-like column and the first time column
 *
 * The office can change any column the guess got wrong. Dates in 28/11/2026
 * or 11/28/2026 order are told apart from the data (a day above 12); when
 * every date could be either, Pakistan's day/month order is the default and
 * the office can switch it.
 *
 * Cells may be strings, numbers (Excel serial dates) or Dates (Excel cells,
 * whose UTC parts are the time written in the sheet). Pure: no DOM, so it is
 * tested on its own.
 */

const pad = (n) => String(n).padStart(2, '0');
const norm = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/* ── Text into rows ── */

function csvLine(line, sep) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
    } else if (c === '"' && cur.trim() === '') { q = true; cur = ''; } else if (c === sep) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

/* A text or CSV file into rows of cells (tab, comma, semicolon, | or spaces). */
export function splitRows(text) {
  const lines = String(text ?? '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sample = lines.slice(0, 30);
  const count = (ch) => sample.filter((l) => l.includes(ch)).length;
  const sep = count('\t') >= sample.length * 0.6 ? '\t'
    : count(',') >= sample.length * 0.6 ? ','
      : count(';') >= sample.length * 0.6 ? ';'
        : count('|') >= sample.length * 0.6 ? '|' : null;
  if (sep === '\t') return lines.map((l) => l.split('\t').map((x) => x.trim()));
  if (sep) return lines.map((l) => csvLine(l, sep));
  // Columns lined up with spaces: two or more spaces part columns; a date and
  // its time (one space) stay together.
  return lines.map((l) => l.trim().split(/\s{2,}/).map((x) => x.trim()));
}

/* ── Dates and times ── */

/* An Excel serial date (46354.336…) into its written parts. */
function fromSerial(n) {
  if (!(n > 20000 && n < 80000)) return null;
  const ms = Math.round((n - 25569) * 864e5);
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), hasTime: n % 1 !== 0 };
}

const fromDate = (d) => ({ y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), hasTime: d.getUTCHours() + d.getUTCMinutes() + d.getUTCSeconds() > 0 });

/* "08:01", "8:01:02 PM", "20.01" → { h, mi, s } */
function readTime(t) {
  const m = /^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?(?:\.\d+)?\s*([ap])?\.?\s*m?\.?$/i.exec(String(t ?? '').trim());
  if (!m) return null;
  let h = +m[1];
  const mi = +m[2];
  const s = +(m[3] || 0);
  if (m[4]) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (m[4].toLowerCase() === 'p' ? 12 : 0);
  }
  return h <= 23 && mi <= 59 && s <= 59 ? { h, mi, s } : null;
}

/* The date part: 2026-11-28, 2026/11/28, 28/11/2026, 11/28/26, 28-Nov-2026, 28 Nov 2026, Nov 28 2026. */
function readDate(t, order = 'dmy') {
  const s = String(t ?? '').trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (m) return { y: +m[1], mo: +m[2], d: +m[3] };
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return order === 'mdy' ? { y, mo: +m[1], d: +m[2] } : { y, mo: +m[2], d: +m[1] };
  }
  m = /^(\d{1,2})[- ]([A-Za-z]{3})[A-Za-z]*\.?[- ](\d{2}|\d{4})$/.exec(s);
  if (m && MONTHS.includes(m[2].toLowerCase())) return { y: m[3].length === 2 ? 2000 + +m[3] : +m[3], mo: MONTHS.indexOf(m[2].toLowerCase()) + 1, d: +m[1] };
  m = /^([A-Za-z]{3})[A-Za-z]*\.? (\d{1,2}) (\d{4})$/.exec(s);
  if (m && MONTHS.includes(m[1].toLowerCase())) return { y: +m[3], mo: MONTHS.indexOf(m[1].toLowerCase()) + 1, d: +m[2] };
  return null;
}

/* A cell holding a date and a time ("2026-11-28 08:01:02", "28/11/2026 8:01 AM", "2026/11/28  08:01:02"). */
function splitDateTime(v) {
  const s = String(v ?? '').trim().replace(/T/, ' ').replace(/\s*(Z|[+-]\d{2}:?\d{2})$/, '').replace(/\s+/g, ' ');
  // The time is the last part with a colon (and its AM/PM).
  const m = /^(.*?)[ ](\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\.\d+)?(?:\s*[aApP]\.?\s*[mM]?\.?)?)$/.exec(s);
  return m ? { date: m[1], time: m[2] } : null;
}

const okParts = (p) => p && p.y >= 2000 && p.y <= 2100 && p.mo >= 1 && p.mo <= 12 && p.d >= 1 && p.d <= 31;
const stampOf = (p) => `${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`;

/**
 * A punch time as "YYYY-MM-DD HH:mm:ss" (the machine's own clock), from one
 * cell with date and time, or a date cell and a time cell. null if unreadable.
 */
export function readStamp(dateVal, timeVal, order = 'dmy') {
  let p = null;
  if (dateVal instanceof Date) p = fromDate(dateVal);
  else if (typeof dateVal === 'number') p = fromSerial(dateVal);
  else if (timeVal === undefined || timeVal === null || timeVal === '') {
    const parts = splitDateTime(dateVal);
    if (!parts) return null;
    const d = readDate(parts.date, order);
    const t = readTime(parts.time);
    if (!d || !t) return null;
    p = { ...d, ...t, hasTime: true };
  } else {
    const d = readDate(dateVal, order);
    p = d ? { ...d, h: 0, mi: 0, s: 0, hasTime: false } : null;
  }
  if (!p) return null;
  if (timeVal !== undefined && timeVal !== null && timeVal !== '') {
    let t = null;
    if (timeVal instanceof Date) t = { h: timeVal.getUTCHours(), mi: timeVal.getUTCMinutes(), s: timeVal.getUTCSeconds() };
    else if (typeof timeVal === 'number' && timeVal >= 0 && timeVal < 1) {
      const secs = Math.round(timeVal * 86400);
      t = { h: Math.floor(secs / 3600) % 24, mi: Math.floor(secs / 60) % 60, s: secs % 60 };
    } else t = readTime(timeVal);
    if (!t) return null;
    p = { ...p, ...t, hasTime: true };
  }
  return okParts(p) && p.hasTime ? stampOf(p) : null;
}

/**
 * Day/month order of a column of dates: 'ymd' (2026-11-28), 'dmy' or 'mdy'
 * when the data says so (a first part above 12 is a day), else
 * 'either' (every date fits both: the school chooses; day first by default).
 */
export function dateOrder(values) {
  let dmy = false;
  let mdy = false;
  let slashy = false;
  for (const v of values.slice(0, 2000)) {
    if (v instanceof Date || typeof v === 'number') continue;
    const parts = splitDateTime(v);
    const s = (parts ? parts.date : String(v ?? '')).trim();
    const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(s);
    if (!m) continue;
    slashy = true;
    if (+m[1] > 12) dmy = true;
    if (+m[2] > 12) mdy = true;
  }
  if (!slashy) return 'ymd';
  if (dmy && !mdy) return 'dmy';
  if (mdy && !dmy) return 'mdy';
  return 'either';
}

/* In or out, when the file says so; else undefined (decided by time, as the machines do). */
export function readDir(v) {
  const s = String(v ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  if (!s) return undefined;
  if (/^(in|i|0|check in|checkin|c\/in|entry|enter|duty on|on duty|clock in|time in|overtime in|ot in)$/.test(s)) return 'in';
  if (/^(out|o|1|check out|checkout|c\/out|exit|duty off|off duty|clock out|time out|overtime out|ot out)$/.test(s)) return 'out';
  return undefined;
}

/* ── Which column is which ── */

const ID_HEADS = ['enno', 'acno', 'userid', 'userno', 'pin', 'employeeid', 'employeeno', 'employeenumber', 'empcode', 'empid', 'empno', 'employeecode',
  'enrollnumber', 'enrollno', 'enrollid', 'badgenumber', 'badgeno', 'personid', 'personno', 'staffid', 'staffno', 'deviceid', 'deviceuserid', 'machineid', 'userid', 'id', 'code', 'cardno', 'no'];
const DT_HEADS = ['datetime', 'checktime', 'punchtime', 'authenticationtime', 'authtime', 'logtime', 'recordtime', 'attendancetime', 'eventtime', 'accessdatetime',
  'accesstime', 'timestamp', 'clocktime', 'verifytime', 'time'];
const DATE_HEADS = ['date', 'punchdate', 'logdate', 'attendancedate', 'accessdate', 'day'];
const TIME_HEADS = ['time', 'punchtime', 'logtime', 'clocktime', 'accesstime', 'checktime'];
const DIR_HEADS = ['state', 'status', 'inout', 'attendancestatus', 'checktype', 'punchstate', 'iomd', 'io', 'direction', 'type', 'checkinout', 'punchtype'];
const NAME_HEADS = ['name', 'username', 'employeename', 'personname', 'fullname', 'firstname', 'staffname'];

const isIdLike = (v) => /^[A-Za-z0-9]{1,24}$/.test(String(v ?? '').trim()) && !/^\d{4}-\d{2}-\d{2}/.test(String(v));
const looksDateTime = (v) => v instanceof Date || (typeof v === 'number' && v > 20000 && v < 80000) || !!readStamp(v, null, 'dmy') || !!readStamp(v, null, 'mdy');
const looksDate = (v) => v instanceof Date || (typeof v === 'number' && v > 20000 && v < 80000) || !!readDate(v, 'dmy');
const looksTime = (v) => (typeof v === 'number' && v >= 0 && v < 1) || v instanceof Date || !!readTime(v);
const share = (vals, test) => (vals.length ? vals.filter(test).length / vals.length : 0);

function findHead(cells, list, taken = []) {
  for (const want of list) {
    const i = cells.findIndex((c, k) => !taken.includes(k) && norm(c) === want);
    if (i >= 0) return i;
  }
  return -1;
}

/**
 * Guess the file's layout.
 *   { header: row index or -1, cols: { id, dateTime, date, time, dir, name }, kind, label, stripZeros }
 * dateTime is one column holding both; else date and time are two columns.
 */
export function detect(rows) {
  const width = Math.max(0, ...rows.slice(0, 50).map((r) => r.length));
  // A header: within the first 10 rows, a row of words naming an id and a time.
  let header = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const cells = rows[i].map(norm);
    const hasId = ID_HEADS.some((h) => cells.includes(h));
    const hasTime = [...DT_HEADS, ...DATE_HEADS].some((h) => cells.includes(h));
    if (hasId && hasTime && !rows[i].some(looksDateTime)) { header = i; break; }
  }
  const body = rows.slice(header + 1, header + 201);
  const col = (k) => body.map((r) => r[k]).filter((v) => v !== undefined && v !== null && String(v).trim() !== '');
  const cols = { id: -1, dateTime: -1, date: -1, time: -1, dir: -1, name: -1 };
  // The headings, lined up with the columns of the rows (for the page's choices).
  let heads = header >= 0 ? rows[header] : [];

  if (header >= 0) {
    // Some machines write empty headings between columns ("EnNo<TAB><TAB>Name")
    // that their rows do not have: dropped when that makes the two line up.
    const widths = body.map((r) => r.length);
    const usual = widths.sort((a, b) => widths.filter((x) => x === b).length - widths.filter((x) => x === a).length)[0];
    const named = heads.filter((h) => String(h ?? '').trim() !== '');
    if (usual && heads.length !== usual && named.length === usual) heads = named;
    // "No" in a GLG file is the record's number, not the person's.
    cols.id = findHead(heads, ID_HEADS.filter((h) => h !== 'no'));
    if (cols.id < 0) cols.id = findHead(heads, ['no']);
    // One column with date and time, else a date column and a time column.
    const dt = findHead(heads, DT_HEADS, [cols.id]);
    if (dt >= 0 && share(col(dt), looksDateTime) >= 0.6) cols.dateTime = dt;
    else {
      cols.date = findHead(heads, DATE_HEADS, [cols.id]);
      cols.time = findHead(heads, TIME_HEADS, [cols.id, cols.date]);
      if (cols.date >= 0 && cols.time < 0 && share(col(cols.date), looksDateTime) >= 0.6) { cols.dateTime = cols.date; cols.date = -1; }
      if (cols.date >= 0 && cols.time >= 0 && !(share(col(cols.date), looksDate) >= 0.6 && share(col(cols.time), looksTime) >= 0.6)) { cols.date = -1; cols.time = -1; }
    }
    cols.dir = findHead(heads, DIR_HEADS, [cols.id, cols.dateTime, cols.date, cols.time]);
    cols.name = findHead(heads, NAME_HEADS, [cols.id]);
    if (cols.id >= 0 && share(col(cols.id), isIdLike) < 0.8) cols.id = -1;
  }
  // No header, or the headings did not say: read the columns themselves. The
  // first column of times (or a date column followed by a time column), and
  // the first column of user numbers before it.
  if (cols.dateTime < 0 && (cols.date < 0 || cols.time < 0)) {
    cols.date = -1;
    cols.time = -1;
    for (let k = 0; k < width; k++) {
      if (k !== cols.id && share(col(k), looksDateTime) >= 0.8) { cols.dateTime = k; break; }
    }
    if (cols.dateTime < 0) {
      for (let k = 0; k < width - 1; k++) {
        if (k !== cols.id && share(col(k), looksDate) >= 0.8 && share(col(k + 1), looksTime) >= 0.8 && share(col(k), looksDateTime) < 0.5) { cols.date = k; cols.time = k + 1; break; }
      }
    }
  }
  if (cols.id < 0) {
    const before = cols.dateTime >= 0 ? cols.dateTime : cols.date;
    for (let k = 0; k < width; k++) {
      if (k === cols.dateTime || k === cols.date || k === cols.time) continue;
      if (share(col(k), isIdLike) >= 0.9 && (before < 0 || k < before)) { cols.id = k; break; }
    }
  }

  const ids = col(cols.id).map((v) => String(v).trim());
  // GLG files pad user numbers with zeros (000000123): taken off when every id is padded that way.
  const stripZeros = ids.length > 0 && ids.every((v) => /^0\d+$/.test(v)) && new Set(ids.map((v) => v.length)).size === 1 && ids[0].length >= 5;
  const H = header >= 0 ? rows[header].map(norm) : [];
  let kind = 'table';
  if (header < 0 && cols.id === 0 && cols.dateTime === 1 && width >= 4) kind = 'zk-attlog';
  else if (H.includes('enno') && H.includes('mchn')) kind = 'zk-glog';
  else if (H.includes('acno')) kind = 'zk-export';
  else if (H.some((h) => /^(employeeid|personid)$/.test(h)) && H.some((h) => /authentication|attendancestatus|cardreader|accessdatetime/.test(h))) kind = 'hikvision';
  const label = {
    'zk-attlog': 'ZKTeco / eSSL attendance log (attlog.dat)', 'zk-glog': 'ZKTeco / eSSL log (GLG)', 'zk-export': 'ZKTeco attendance export',
    hikvision: 'Hikvision attendance export', table: header >= 0 ? 'A table with headings' : 'A table without headings',
  }[kind];
  return { header, cols, kind, label, stripZeros, width, heads: heads.map((h) => cellText(h)) };
}

/* What a cell holds, as text (Excel numbers without ".0"). */
export function cellText(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return stampOf(fromDate(v));
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  return String(v).trim();
}

/**
 * Rows into punches with the chosen layout.
 *   layout: { header, cols, order, useDir, stripZeros }
 * → { punches: [{ pin, stamp, dir?, name? }] (oldest first, no repeats), bad: [{ row, why }],
 *     first, last, people }
 */
export function buildPunches(rows, layout) {
  const { header = -1, cols = {}, order = 'dmy', useDir = false, stripZeros = false } = layout || {};
  const punches = [];
  const bad = [];
  const seen = new Set();
  const people = new Set();
  for (let i = header + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    if (!r.some((c) => cellText(c))) continue;
    let pin = cellText(r[cols.id]);
    if (stripZeros) pin = pin.replace(/^0+(?=\d)/, '');
    if (!/^[A-Za-z0-9]{1,24}$/.test(pin)) { bad.push({ row: i + 1, why: pin ? `user number "${pin.slice(0, 20)}" not understood` : 'no user number' }); continue; }
    const stamp = cols.dateTime >= 0 ? readStamp(r[cols.dateTime], null, order) : readStamp(r[cols.date], r[cols.time], order);
    if (!stamp) { bad.push({ row: i + 1, why: `time not understood: "${cellText(cols.dateTime >= 0 ? r[cols.dateTime] : `${cellText(r[cols.date])} ${cellText(r[cols.time])}`).slice(0, 30)}"` }); continue; }
    const key = `${pin}|${stamp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    people.add(pin);
    const p = { pin, stamp };
    if (useDir && cols.dir >= 0) { const d = readDir(r[cols.dir]); if (d) p.dir = d; }
    if (cols.name >= 0) { const n = cellText(r[cols.name]); if (n) p.name = n.slice(0, 60); }
    punches.push(p);
  }
  punches.sort((a, b) => (a.stamp < b.stamp ? -1 : a.stamp > b.stamp ? 1 : 0));
  return { punches, bad, first: punches[0]?.stamp || null, last: punches[punches.length - 1]?.stamp || null, people: people.size };
}
