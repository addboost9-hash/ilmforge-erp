/**
 * IlmForge — what a ZKTeco machine in Cloud server (ADMS / push) mode says,
 * and what we say back, without the database.
 *
 * Machines upload records one per line, "TYPE key=value<TAB>key=value…":
 *   USER PIN=1843	Name=Ali Raza	Pri=0	Passwd=	Card=	Grp=1	TZ=…      someone on the machine
 *   FP PIN=1843	FID=6	Size=1184	Valid=1	TMP=<base64>                    a fingerprint (push 1-2)
 *   FACE PIN=1843	FID=0	SIZE=2048	VALID=1	TMP=<base64>                  a face template (push 2)
 *   BIODATA Pin=1843	No=6	Index=0	Valid=1	Duress=0	Type=1	MajorVer=10	MinorVer=0	Format=0	Tmp=…   (push 3)
 *   user uid=1	pin=1843	name=Ali …  /  templatev10 pin=1843	fingerid=6	template=…     (query answers, push 3)
 * Keys are read without regard to capitals.
 *
 * A machine reports itself on every poll: INFO=firmware,users,fingers,punches,ip,
 * finger version,face version,faces needed,faces,functions.
 */

const int = (v, d = null) => (/^-?\d+$/.test(String(v ?? '').trim()) ? parseInt(v, 10) : d);
const cleanPin = (v) => {
  const p = String(v ?? '').trim();
  return /^[A-Za-z0-9]{1,24}$/.test(p) ? p : '';
};
// eslint-disable-next-line no-control-regex
const cleanText = (v, n = 60) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const B64 = /^[A-Za-z0-9+/=_-]+$/;
const b64Bytes = (s) => Math.floor((String(s).replace(/=+$/, '').length * 3) / 4);
const MAX_TEMPLATE = 64000; // characters: a face set is a few KB, a finger 1-2 KB

/** One line: { type: 'USER', f: { pin: '1843', name: 'Ali' } }, keys in small letters. */
function parseRecord(line) {
  const s = String(line ?? '').replace(/\r$/, '');
  if (!s.trim()) return null;
  let type = '';
  let rest = s;
  const m = /^([A-Za-z][A-Za-z0-9_]*)[ \t]+(.*)$/.exec(s);
  if (m) { type = m[1]; rest = m[2]; }
  const f = {};
  for (const part of rest.split('\t')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    f[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return { type: type.toUpperCase(), f };
}

const BIO_KIND = (t) => (t === 1 ? 'finger' : t === 2 || t === 9 ? 'face' : t === 8 ? 'palm' : null);

/**
 * What a line is about, ready to save:
 *   { what: 'user', pin, name, card }
 *   { what: 'template', pin, kind: finger|face|palm, slot, format, bioType, majorVer, minorVer, size, valid, data }
 * or null for anything else (operation log, photos, unreadable lines).
 * The slot is the finger number (0-9) plus ten times the template's index.
 */
function readRecord(line) {
  const r = parseRecord(line);
  if (!r) return null;
  const { type, f } = r;
  const pin = cleanPin(f.pin);
  if (!pin) return null;

  if (['USER', 'USERINFO'].includes(type)) {
    return { what: 'user', pin, name: cleanText(f.name, 40), card: cleanText(f.card ?? f.cardno, 20).replace(/^0+$/, '') };
  }
  const template = (data) => (data && B64.test(data) && data.length <= MAX_TEMPLATE ? data : null);
  if (['FP', 'FINGERTMP', 'TEMPLATEV10', 'FINGERPRINT'].includes(type)) {
    const data = template(f.tmp ?? f.template);
    const no = int(f.fid ?? f.fingerid ?? f.no);
    if (!data || no === null || no < 0 || no > 9) return null;
    return { what: 'template', pin, kind: 'finger', slot: no, format: 'fp', bioType: 1, majorVer: null, minorVer: null, size: int(f.size) || b64Bytes(data), valid: int(f.valid, 1), data };
  }
  if (type === 'FACE') {
    const data = template(f.tmp);
    const index = int(f.fid ?? f.no, 0);
    if (!data || index < 0 || index > 99) return null;
    return { what: 'template', pin, kind: 'face', slot: index * 10, format: 'fp', bioType: 2, majorVer: null, minorVer: null, size: int(f.size) || b64Bytes(data), valid: int(f.valid, 1), data };
  }
  if (type === 'BIODATA') {
    const data = template(f.tmp);
    const bioType = int(f.type);
    const kind = BIO_KIND(bioType);
    const no = int(f.no, 0);
    const index = int(f.index, 0);
    if (!data || !kind || no < 0 || no > 9 || index < 0 || index > 99) return null;
    return {
      what: 'template', pin, kind, slot: no + index * 10, format: 'bio', bioType,
      majorVer: cleanText(f.majorver, 8) || null, minorVer: cleanText(f.minorver, 8) || null,
      size: b64Bytes(data), valid: int(f.valid, 1), data,
    };
  }
  return null;
}

/** INFO=… sent with every poll. */
function parseInfo(str) {
  const p = String(str ?? '').split(',').map((s) => s.trim());
  if (p.length < 4 || !p[0]) return null;
  return {
    firmware: cleanText(p[0], 60), users: int(p[1]), fingers: int(p[2]), punches: int(p[3]),
    ip: /^[\d.]{7,15}$/.test(p[4] || '') ? p[4] : null,
    fpVersion: cleanText(p[5], 8) || null, faceVersion: cleanText(p[6], 8) || null, faces: int(p[8]),
  };
}

/* The answer to an INFO command: "~DeviceName=K40\nUserCount=50\nFPCount=48…". */
const INFO_KEYS = {
  devicename: 'model', usercount: 'users', fpcount: 'fingers', transactioncount: 'punches', fwversion: 'firmware',
  zkfpversion: 'fpVersion', zkfaceversion: 'faceVersion', facecount: 'faces', ipaddress: 'ip', platform: 'platform',
};

/**
 * The body of /iclock/devicecmd: one "ID=12&Return=0&CMD=DATA" per command,
 * and after an INFO the machine's details.
 * @returns {{ results: [{ id, ret, cmd }], info: object|null }}
 */
function parseCmdResults(body) {
  const results = [];
  const info = {};
  for (const raw of String(body ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/(^|&)ID=/.test(line) && /Return=/.test(line)) {
      const q = Object.fromEntries(line.split('&').map((kv) => { const i = kv.indexOf('='); return i > 0 ? [kv.slice(0, i), kv.slice(i + 1)] : [kv, '']; }));
      const id = int(String(q.ID).replace(/^\D+/, ''));
      if (id !== null) results.push({ id, ret: int(q.Return, -1), cmd: cleanText(q.CMD, 20) });
      continue;
    }
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const key = INFO_KEYS[line.slice(0, i).replace(/^~/, '').toLowerCase()];
    if (!key) continue;
    const v = line.slice(i + 1).trim();
    info[key] = ['users', 'fingers', 'punches', 'faces'].includes(key) ? int(v) : cleanText(v, 60);
  }
  return { results, info: Object.keys(info).length ? info : null };
}

/* A name the machine can show: plain letters, at most 24. */
const machineName = (n) => String(n || '').normalize('NFKD').replace(/[\t\r\n=]/g, ' ').replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) || 'Person';
const pushVersion = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : 2; };

/** Put someone on a machine (their name and user number). Pri=0: never an administrator. */
function userCmd(pushver, pin, name, card = '') {
  const c = /^\d{1,20}$/.test(String(card || '')) ? card : '';
  return pushVersion(pushver) >= 2
    ? `DATA UPDATE USERINFO PIN=${pin}\tName=${machineName(name)}\tPri=0\tPasswd=\tCard=${c}\tGrp=1\tTZ=0000000000000000\tVerify=0`
    : `DATA USER PIN=${pin}\tName=${machineName(name)}\tPri=0\tPasswd=\tCard=${c}\tGrp=1\tTZ=`;
}

/** A saved fingerprint or face, in the words of the machine it goes to. */
function templateCmd(pushver, t, target = {}) {
  const v = pushVersion(pushver);
  const no = t.slot % 10;
  const index = Math.floor(t.slot / 10);
  const size = t.size || b64Bytes(t.data);
  if (v >= 3) {
    const type = t.bioType || (t.kind === 'finger' ? 1 : 2);
    const major = t.majorVer || (t.kind === 'finger' ? target.fpVersion : target.faceVersion) || (t.kind === 'finger' ? '10' : '7');
    return `DATA UPDATE BIODATA Pin=${t.pin}\tNo=${no}\tIndex=${index}\tValid=${t.valid ?? 1}\tDuress=0\tType=${type}\tMajorVer=${major}\tMinorVer=${t.minorVer || 0}\tFormat=0\tTmp=${t.data}`;
  }
  if (t.kind === 'finger') {
    return v >= 2
      ? `DATA UPDATE FINGERTMP PIN=${t.pin}\tFID=${no}\tSize=${size}\tValid=${t.valid ?? 1}\tTMP=${t.data}`
      : `DATA FP PIN=${t.pin}\tFID=${no}\tSize=${size}\tValid=${t.valid ?? 1}\tTMP=${t.data}`;
  }
  if (t.kind === 'face') {
    return v >= 2
      ? `DATA UPDATE FACE PIN=${t.pin}\tFID=${index}\tSize=${size}\tValid=${t.valid ?? 1}\tTMP=${t.data}`
      : `DATA FACE PIN=${t.pin}\tFID=${index}\tSize=${size}\tValid=${t.valid ?? 1}\tTMP=${t.data}`;
  }
  return null;
}

/* The algorithm version a template was made with, against the machine's.
   ZKFinger 10 and 9 templates do not read each other; faces likewise. */
const major = (v) => (v === null || v === undefined || v === '' ? null : String(parseInt(String(v), 10)));
function versionFits(t, target = {}) {
  const want = major(t.kind === 'finger' ? target.fpVersion : target.faceVersion);
  const have = major(t.majorVer);
  return !want || !have || want === have;
}

const two = (n) => String(n).padStart(2, '0');
/** "2026-11-01 00:00:00" in the school's time zone, for DATA QUERY ATTLOG. */
const machineStamp = (ymd, end = false) => `${ymd} ${end ? '23:59:59' : '00:00:00'}`;

/* The clock as ZKTeco encodes it, for SET OPTION DateTime=… */
function zkTime(date, tz = '+05:00') {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(tz) || ['', '+', '05', '00'];
  const offset = (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10)) * 60e3;
  const d = new Date(new Date(date).getTime() + offset);
  return ((((d.getUTCFullYear() % 100) * 12 * 31) + (d.getUTCMonth() * 31) + d.getUTCDate() - 1) * 86400)
    + ((d.getUTCHours() * 60 + d.getUTCMinutes()) * 60) + d.getUTCSeconds();
}

const cmds = {
  info: () => 'INFO',
  reboot: () => 'REBOOT',
  check: () => 'CHECK',
  fetchPunches: (fromYmd, toYmd) => `DATA QUERY ATTLOG StartTime=${machineStamp(fromYmd)}\tEndTime=${machineStamp(toYmd, true)}`,
  queryUsers: () => 'DATA QUERY USERINFO',
  queryFingers: () => 'DATA QUERY FINGERTMP',
  removeUser: (pin) => `DATA DELETE USERINFO PIN=${pin}`,
  enrolFinger: (pin, finger) => `ENROLL_FP PIN=${pin}\tFID=${finger}\tRETRY=3\tOVERWRITE=1`,
  setClock: (date, tz) => `SET OPTION DateTime=${zkTime(date, tz)}`,
};

/* What a machine's answer code means, for the office. */
function resultText(code) {
  if (code === null || code === undefined) return '';
  if (code >= 0) return 'done';
  return ({
    '-1': 'the machine did not understand it', '-2': 'the machine refused it', '-3': 'the machine could not read it',
    '-4': 'the machine is full', '-9': 'the machine could not read it', '-10': 'that user is not on the machine',
    '-11': 'that fingerprint was not taken', '-12': 'the template does not fit this machine', '-999': 'no answer from the machine',
  })[String(code)] || `the machine answered ${code}`;
}

/* Text shown in a log: templates are cut, they are long and say nothing. */
const redact = (s, n = 300) => String(s ?? '').replace(/((?:TMP|Tmp|tmp|template)=)[A-Za-z0-9+/=_-]{12,}/g, '$1…').slice(0, n);

/* ── Names: a machine user to the student or staff member it probably is ── */
const MUHAMMAD = /\b(muhammad|muhammed|mohammad|mohammed|mohamad|mohamed|muhamad|mohd|muhd|md|m)\b/g;
function normName(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z\s]/g, ' ').replace(MUHAMMAD, 'muhammad').replace(/\s+/g, ' ').trim();
}
/**
 * 0-1: how surely the machine's name is this person's. The machine keeps
 * 24 letters, so a long name cut short still counts.
 */
function nameScore(onMachine, person) {
  const x = normName(onMachine);
  const y = normName(person);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (String(onMachine).trim().length >= 20 && y.startsWith(x)) return 0.95;
  const A = x.split(' ');
  const B = new Set(y.split(' '));
  const common = A.filter((t) => B.has(t) && t !== 'muhammad').length;
  const size = Math.max(A.filter((t) => t !== 'muhammad').length, [...B].filter((t) => t !== 'muhammad').length);
  return size ? Math.round((common / size) * 0.9 * 100) / 100 : 0;
}

/* ── Staff shifts ── */
const isClock = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ''));
const toMin = (hhmm) => parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(3), 10);
const PK_MS = 5 * 3600e3;
const pkMin = (d) => { const p = new Date(new Date(d).getTime() + PK_MS); return p.getUTCHours() * 60 + p.getUTCMinutes(); };
const clockOf = (min) => `${two(Math.floor(min / 60))}:${two(min % 60)}`;

/** A shift as the office set it, with safe numbers. */
function cleanShift(s, i = 0) {
  if (!s || !isClock(s.start) || !isClock(s.end) || toMin(s.end) <= toMin(s.start)) return null;
  const n = (v, lo, hi, d) => { const x = parseInt(v, 10); return Number.isFinite(x) && x >= lo && x <= hi ? x : d; };
  const days = Array.isArray(s.days) ? [...new Set(s.days.map(Number).filter((d) => d >= 0 && d <= 6))].sort() : [1, 2, 3, 4, 5, 6];
  return {
    id: /^[a-z0-9-]{1,20}$/.test(String(s.id || '')) ? String(s.id) : `s${i + 1}`,
    name: cleanText(s.name, 40) || `Shift ${i + 1}`,
    start: s.start, end: s.end,
    graceIn: n(s.graceIn, 0, 180, 10),
    graceOut: n(s.graceOut, 0, 180, 10),
    halfDayMin: n(s.halfDayMin, 0, 720, 0),
    overtimeAfter: n(s.overtimeAfter, 0, 600, 0),
    days: days.length ? days : [1, 2, 3, 4, 5, 6],
  };
}

/**
 * One staff day against their shift.
 * Late counts from the start once past the grace; leaving early counts to the end.
 */
function evalStaffDay({ checkIn, checkOut }, shift) {
  const out = { lateMin: 0, earlyMin: 0, workedMin: 0, overtimeMin: 0, halfDay: false, missingOut: false, missingIn: false };
  if (!shift) return out;
  const s = toMin(shift.start);
  const e = toMin(shift.end);
  const i = checkIn ? pkMin(checkIn) : null;
  const o = checkOut ? pkMin(checkOut) : null;
  if (i !== null && i > s + shift.graceIn) out.lateMin = i - s;
  if (o !== null && o < e - shift.graceOut) out.earlyMin = e - o;
  if (i !== null && o !== null && o > i) out.workedMin = o - i;
  if (o !== null && shift.overtimeAfter > 0 && o > e + shift.overtimeAfter) out.overtimeMin = o - e;
  if (shift.halfDayMin > 0 && i !== null && o !== null && out.workedMin < shift.halfDayMin) out.halfDay = true;
  out.missingOut = i !== null && o === null;
  out.missingIn = i === null && o !== null;
  return out;
}

/**
 * Should students who did not punch be marked absent now? Not when the
 * machines were silent: then it is the machine, not the children.
 * @param {number} today      student arrivals from machines today
 * @param {number[]} history  the same count on recent school days (zeros left out)
 * @param {number} inScope    students it would apply to
 * @param {number} minShare   0-1: today must be at least this share of usual
 */
function autoAbsentCheck({ today, history = [], inScope, minShare = 0.3 }) {
  const past = history.filter((n) => n > 0).sort((a, b) => a - b);
  const usual = past.length ? past[Math.floor(past.length / 2)] : Math.round(inScope * 0.5);
  const need = Math.max(1, Math.ceil(usual * minShare));
  if (!inScope) return { ok: false, usual, need, reason: 'No students to mark.' };
  if (today < need) {
    return { ok: false, usual, need, reason: `The machines sent only ${today} student arrival${today === 1 ? '' : 's'} today (usually about ${usual}). A machine may be off or offline, so nobody was marked absent.` };
  }
  return { ok: true, usual, need, reason: null };
}

module.exports = {
  parseRecord, readRecord, parseInfo, parseCmdResults, userCmd, templateCmd, versionFits, cmds, zkTime,
  resultText, redact, machineName, pushVersion, normName, nameScore, cleanShift, evalStaffDay, autoAbsentCheck,
  isClock, toMin, pkMin, clockOf, cleanPin, b64Bytes,
};
