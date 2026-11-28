/**
 * IlmForge — punches from machines of any make, read into one shape.
 *
 * A machine that is not a ZKTeco in Cloud Server mode posts its punches to
 * its own secret link (/machine/<key>). What arrives there differs by make:
 *
 *   Hikvision face and fingerprint terminals (DS-K1T…), "HTTP listening":
 *     multipart/form-data with a JSON part "event_log" (or "AccessControllerEvent"),
 *     or the JSON alone, or XML (<EventNotificationAlert>) on older firmware.
 *     One event: { dateTime, eventType: "AccessControllerEvent",
 *     AccessControllerEvent: { majorEventType: 5, subEventType: 75,
 *     employeeNoString: "1843", name, currentVerifyMode, … } }.
 *     Heartbeats ({ eventType: "heartBeat" }) only say the machine is alive.
 *   Anything else (another make, attendance software, a script): JSON
 *     ({ "id": "1843", "time": "2026-11-28 08:01:02" }, a list of those, or
 *     { punches: [...] }), a form, the query string, or ZKTeco-style text
 *     lines ("1843<TAB>2026-11-28 08:01:02").
 *
 *   readPush({ contentType, body, query, method })  → { format, punches, heartbeat, ignored, bad }
 *   hikEvent(obj)                                   one Hikvision event
 *   parseWhen(value)                                { at } an exact moment, or { stamp } on the machine's clock
 *   onClock(stamp, tz)                              "2026-11-28 08:01:02" on a clock at +05:00 → Date
 *
 * A punch is { pin, at?: Date, stamp?: "YYYY-MM-DD HH:mm:ss", method, name? }.
 * Pure: no database, so it is tested on its own.
 */

/* Hikvision access events that mean "this person was recognised". Major type
   5 is an event; the sub types: 1 card, 2 card and password, 38 fingerprint,
   40 card and fingerprint, 43 card, fingerprint and password, 46 fingerprint
   and password, 75 face. Failures (39, 76 …) and anything not listed are
   ignored and named in the machine log, so a new type seen on a real machine
   can be added here. */
const HIK_PASS = new Map([[1, 'card'], [2, 'card'], [38, 'fingerprint'], [40, 'fingerprint'], [43, 'fingerprint'], [46, 'fingerprint'], [75, 'face']]);

const PIN_RE = /^[A-Za-z0-9]{1,24}$/;
const cleanPin = (v) => {
  const s = String(v ?? '').trim();
  return PIN_RE.test(s) ? s : null;
};
const pad = (n) => String(n).padStart(2, '0');

/* "2026-11-28 08:01:02" read on a clock set to the time zone tz (+05:00). */
function onClock(stamp, tz = '+05:00') {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/.exec(String(stamp || '').trim());
  if (!m) return null;
  const t = new Date(`${m[1]}T${m[2].length === 5 ? `${m[2]}:00` : m[2]}${/^[+-]\d{2}:\d{2}$/.test(tz) ? tz : '+05:00'}`);
  return Number.isNaN(t.getTime()) ? null : t;
}

/**
 * A time as a machine or a program writes it:
 *   1764298862 / 1764298862000 (seconds or ms)      → { at }
 *   2026-11-28T08:01:02+05:00, …Z, …+0500          → { at }   (the moment is exact)
 *   2026-11-28 08:01:02, 2026/11/28 08:01, …T08:01 → { stamp } (on the machine's clock)
 */
function parseWhen(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' || /^\d{10}(\d{3})?$/.test(String(v).trim())) {
    const n = Number(v);
    const ms = n > 1e12 ? n : n * 1000;
    const d = new Date(ms);
    return n > 1e9 && !Number.isNaN(d.getTime()) ? { at: d } : null;
  }
  const s = String(v).trim();
  const z = /^(\d{4})[-/](\d{2})[-/](\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$/.exec(s);
  if (!z) return null;
  const [, y, mo, d, h, mi, se = '00', zone] = z;
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31 || +h > 23 || +mi > 59 || +se > 59) return null;
  const stamp = `${y}-${mo}-${d} ${h}:${mi}:${se}`;
  if (!zone) return { stamp };
  const tz = zone === 'Z' ? 'Z' : zone.includes(':') ? zone : `${zone.slice(0, 3)}:${zone.slice(3)}`;
  const at = new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}${tz}`);
  return Number.isNaN(at.getTime()) ? null : { at };
}

const METHOD_WORDS = [[/face/i, 'face'], [/palm/i, 'fingerprint'], [/finger|fp|thumb/i, 'fingerprint'], [/card|rfid/i, 'card']];
function methodOf(v, fallback = 'fingerprint') {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  // ZKTeco verify codes, which much software passes on: 1 finger, 15/25 face, 2/4 card
  if (Number.isInteger(n) && String(v).trim() !== '') return { 1: 'fingerprint', 2: 'card', 4: 'card', 15: 'face', 25: 'face' }[n] || fallback;
  const hit = METHOD_WORDS.find(([re]) => re.test(String(v)));
  return hit ? hit[1] : fallback;
}

/* Field names, compared without case, "_" or "-". */
const norm = (k) => String(k).toLowerCase().replace(/[_\-\s]/g, '');
const PIN_KEYS = ['id', 'pin', 'userid', 'user', 'employeeno', 'employeenostring', 'employeeid', 'employeecode', 'empcode', 'empid', 'empno',
  'enrollnumber', 'enrollno', 'enrollid', 'enno', 'badgenumber', 'badge', 'personid', 'personno', 'acno', 'staffid', 'studentid', 'code', 'rollno', 'deviceuserid'];
const TIME_KEYS = ['time', 'timestamp', 'datetime', 'punchtime', 'checktime', 'checkintime', 'logtime', 'attendancetime', 'eventtime', 'recordtime',
  'verifytime', 'clocktime', 'punch', 'at', 'when'];
const DATE_KEYS = ['date', 'punchdate', 'logdate', 'attendancedate'];
const METHOD_KEYS = ['method', 'verify', 'verifymode', 'verifytype', 'currentverifymode', 'mode', 'authtype', 'authentication', 'authmode'];
const NAME_KEYS = ['name', 'username', 'employeename', 'personname', 'fullname'];

function pick(obj, keys) {
  for (const [k, v] of Object.entries(obj)) {
    if (keys.includes(norm(k)) && v !== null && v !== undefined && v !== '' && typeof v !== 'object') return v;
  }
  return undefined;
}

/* One record from anything that is not Hikvision. */
function genericPunch(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { bad: 'not a record' };
  if (o.AccessControllerEvent || o.accessControllerEvent) return hikEvent(o);
  const pin = cleanPin(pick(o, PIN_KEYS));
  if (!pin) return { bad: 'no user number (id)' };
  let when = parseWhen(pick(o, TIME_KEYS));
  if (!when) {
    // A date and a time in two fields.
    const d = pick(o, DATE_KEYS);
    const t = pick(o, TIME_KEYS);
    if (d && t) when = parseWhen(`${d} ${t}`);
  }
  if (!when) return { bad: `no time for user ${pin}` };
  const name = pick(o, NAME_KEYS);
  return { punch: { pin, ...when, method: methodOf(pick(o, METHOD_KEYS)), ...(name ? { name: String(name).trim().slice(0, 60) } : {}) } };
}

/* One Hikvision event (JSON). */
function hikEvent(o) {
  if (!o || typeof o !== 'object') return { bad: 'not an event' };
  const type = String(o.eventType || '').toLowerCase();
  if (type === 'heartbeat') return { heartbeat: true };
  const e = o.AccessControllerEvent || o.accessControllerEvent;
  if (!e || typeof e !== 'object') return { ignore: `event "${o.eventType || 'unknown'}"` };
  const major = Number(e.majorEventType);
  const minor = Number(e.subEventType);
  const pin = cleanPin(e.employeeNoString ?? e.employeeNo ?? e.employeeID);
  if (major !== 5 || !HIK_PASS.has(minor)) return { ignore: `event ${Number.isNaN(major) ? '?' : major}/${Number.isNaN(minor) ? '?' : minor}${pin ? ` for ${pin}` : ''} (not a pass)` };
  if (!pin) return { ignore: `event 5/${minor} with no employee number (someone not enrolled)` };
  const when = parseWhen(o.dateTime || e.time || e.dateTime);
  if (!when) return { bad: `no time for ${pin}` };
  const name = typeof e.name === 'string' && e.name.trim() ? e.name.trim().slice(0, 60) : null;
  return { punch: { pin, ...when, method: HIK_PASS.get(minor), ...(name ? { name } : {}) } };
}

/* <EventNotificationAlert> from older Hikvision firmware. */
function hikXml(xml) {
  const tag = (src, t) => {
    const m = new RegExp(`<${t}>([^<]*)</${t}>`, 'i').exec(src);
    return m ? m[1].trim() : undefined;
  };
  const inner = /<AccessControllerEvent>([\s\S]*?)<\/AccessControllerEvent>/i.exec(xml);
  const obj = { eventType: tag(xml, 'eventType'), dateTime: tag(xml, 'dateTime') };
  if (inner) {
    const s = inner[1];
    obj.AccessControllerEvent = {
      majorEventType: tag(s, 'majorEventType'), subEventType: tag(s, 'subEventType'),
      employeeNoString: tag(s, 'employeeNoString') ?? tag(s, 'employeeNo'), name: tag(s, 'name'),
    };
  }
  return obj;
}

/* The parts of a multipart/form-data body, as { name, type, text }. */
function multipartParts(raw, contentType) {
  const b = /boundary="?([^";]+)"?/i.exec(contentType || '');
  if (!b) return [];
  const s = raw.toString('latin1');
  const out = [];
  for (const chunk of s.split(`--${b[1]}`)) {
    const cut = chunk.indexOf('\r\n\r\n') >= 0 ? chunk.indexOf('\r\n\r\n') : chunk.indexOf('\n\n');
    if (cut < 0) continue;
    const head = chunk.slice(0, cut);
    const body = chunk.slice(cut + (chunk[cut] === '\r' ? 4 : 2)).replace(/\r?\n$/, '');
    const name = (/name="([^"]*)"/i.exec(head) || [])[1] || '';
    const type = (/content-type:\s*([^\r\n;]+)/i.exec(head) || [])[1] || '';
    if (/^image\//i.test(type)) continue; // the photo of the face: not needed
    out.push({ name, type: type.toLowerCase(), text: Buffer.from(body, 'latin1').toString('utf8') });
  }
  return out;
}

const jsonOf = (t) => { try { return JSON.parse(t); } catch { return undefined; } };

/* A list of records out of whatever JSON a program sends. */
function recordsOf(j) {
  if (Array.isArray(j)) return j;
  if (j && typeof j === 'object') {
    for (const k of ['punches', 'records', 'data', 'logs', 'transactions', 'events', 'attendance', 'list', 'rows']) {
      if (Array.isArray(j[k])) return j[k];
    }
    return [j];
  }
  return [];
}

/* "1843<TAB>2026-11-28 08:01:02…" or "1843 2026-11-28 08:01:02" per line. */
function textLines(t) {
  const out = [];
  for (const line of String(t).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.includes('\t') ? line.split('\t').map((x) => x.trim()) : line.trim().split(/[\s,;]+/);
    const pin = cleanPin(parts[0]);
    let when = parseWhen(parts[1]);
    if (!when && parts[2]) when = parseWhen(`${parts[1]} ${parts[2]}`);
    out.push(pin && when ? { punch: { pin, ...when, method: 'fingerprint' } } : { bad: `line not understood: ${line.slice(0, 40)}` });
  }
  return out;
}

/**
 * What a machine posted to its link.
 *   format: hikvision | json | form | text | query | empty | unknown
 */
function readPush({ contentType = '', body, query = {}, method = 'POST' } = {}) {
  const raw = Buffer.isBuffer(body) ? body : Buffer.from(String(body ?? ''), 'utf8');
  const ct = String(contentType).toLowerCase();
  const results = [];
  let format = 'unknown';

  if (ct.includes('multipart/')) {
    const parts = multipartParts(raw, contentType);
    let hik = parts.some((p) => /event_?log|accesscontroller/i.test(p.name));
    for (const p of parts) {
      const j = (p.type.includes('json') || /^\s*[[{]/.test(p.text)) ? jsonOf(p.text) : undefined;
      if (j !== undefined) {
        recordsOf(j).forEach((r) => {
          const isHik = !!(r && (r.AccessControllerEvent || r.accessControllerEvent || r.eventType));
          hik = hik || isHik;
          results.push(isHik ? hikEvent(r) : genericPunch(r));
        });
      } else if (/<EventNotificationAlert/i.test(p.text)) {
        hik = true;
        results.push(hikEvent(hikXml(p.text)));
      } else if (PIN_KEYS.includes(norm(p.name))) {
        // A form sent as multipart: its fields one by one.
        results.push(genericPunch(Object.fromEntries(parts.map((x) => [x.name, x.text.trim()]))));
        break;
      }
    }
    format = hik ? 'hikvision' : results.length ? 'json' : 'unknown';
  } else {
    const t = raw.toString('utf8').trim();
    if (!t) {
      const q = Object.fromEntries(Object.entries(query || {}).filter(([k]) => norm(k) !== 'key'));
      if (pick(q, PIN_KEYS) !== undefined) { results.push(genericPunch(q)); format = 'query'; } else format = 'empty';
    } else if (/^[[{]/.test(t)) {
      const j = jsonOf(t);
      if (j === undefined) results.push({ bad: 'the JSON could not be read' });
      else {
        const recs = recordsOf(j);
        const hik = recs.some((r) => r && (r.AccessControllerEvent || r.accessControllerEvent || /heartbeat/i.test(r.eventType || '')));
        recs.forEach((r) => results.push(hik ? hikEvent(r) : genericPunch(r)));
        format = hik ? 'hikvision' : 'json';
      }
    } else if (/<EventNotificationAlert/i.test(t)) {
      results.push(hikEvent(hikXml(t)));
      format = 'hikvision';
    } else if (ct.includes('x-www-form-urlencoded') || /^[^\s=&]+=[^&]*(&[^\s=&]+=[^&]*)*$/.test(t)) {
      const f = Object.fromEntries(new URLSearchParams(t));
      if (f.event_log) {
        const j = jsonOf(f.event_log);
        results.push(j ? hikEvent(j) : { bad: 'event_log could not be read' });
        format = 'hikvision';
      } else { results.push(genericPunch(f)); format = 'form'; }
    } else {
      textLines(t).forEach((r) => results.push(r));
      format = 'text';
    }
  }
  if (method === 'GET' && format === 'unknown') format = 'empty';
  return {
    format,
    punches: results.filter((r) => r.punch).map((r) => r.punch),
    heartbeat: results.length > 0 && results.every((r) => r.heartbeat),
    ignored: results.filter((r) => r.ignore).map((r) => r.ignore).slice(0, 10),
    bad: results.filter((r) => r.bad).map((r) => r.bad).slice(0, 10),
  };
}

module.exports = {
  readPush, hikEvent, hikXml, genericPunch, parseWhen, onClock, methodOf, cleanPin, multipartParts, HIK_PASS, pad,
};
