/**
 * IlmForge — punches from any machine, marked the same way.
 *
 * A Hikvision terminal, another make posting to its link, or a log file the
 * office uploads all end here: each punch goes to the person its user number
 * is linked to (Device ID, roll number / employee code, or a link the office
 * made) and is marked at its own time, exactly as a ZKTeco punch is
 * (markPass). A user number nobody is linked to is kept and marked when it is
 * linked. The same punch twice is counted once.
 */
const M = require('./biometricMachines.service');
const { markPass } = require('./attendanceDevice.service');
const { onClock, cleanPin } = require('./punchFormats');

/**
 * punches: [{ pin, at?: Date|string, stamp?: "YYYY-MM-DD HH:mm:ss", method?, name?, dir?: 'in'|'out' }]
 * since / until: punches outside are not marked (counted as old / future).
 * markPass believes a time only within the last 31 days and up to 5 minutes
 * ahead (anything else would be marked "now"), so neither may go further.
 */
const DAY = 864e5;
async function takePunches({ schoolId, deviceId = null, punches, tz = '+05:00', since, until }) {
  const floor = new Date(Date.now() - 30 * DAY);
  since = since && since > floor ? since : floor;
  const ceil = new Date(Date.now() + 4 * 60e3);
  until = until && until < ceil ? until : ceil;
  const out = { received: punches.length, marked: 0, again: 0, notLinked: 0, refused: 0, old: 0, future: 0, bad: 0, first: null, last: null, newest: null };
  const unknown = new Map();
  const refusedWho = new Map();
  const list = [];
  for (const p of punches) {
    const pin = cleanPin(p?.pin);
    let at = null;
    if (p?.at) at = p.at instanceof Date ? p.at : new Date(p.at);
    else if (p?.stamp) at = onClock(p.stamp, tz);
    if (!pin || !at || Number.isNaN(at.getTime())) { out.bad++; continue; }
    if (at < since) { out.old++; continue; }
    if (at > until) { out.future++; continue; }
    list.push({ pin, at, method: ['fingerprint', 'face', 'card'].includes(p.method) ? p.method : 'fingerprint', name: p.name, dir: ['in', 'out'].includes(p.dir) ? p.dir : undefined });
  }
  // In time order: the first punch of a day is the arrival.
  list.sort((a, b) => a.at - b.at);
  const people = new Map();
  for (const p of list) {
    if (!people.has(p.pin)) people.set(p.pin, await M.personForPin(schoolId, p.pin));
    const found = people.get(p.pin);
    if (!out.first || p.at < out.first) out.first = p.at;
    if (!out.last || p.at > out.last) out.last = p.at;
    if (found.error) {
      if (await M.keepUnmatched({ schoolId, deviceId, pin: p.pin, at: p.at, method: p.method, name: p.name })) out.notLinked++;
      else out.again++;
      if (!unknown.has(p.pin) || (!unknown.get(p.pin) && p.name)) unknown.set(p.pin, p.name || '');
      continue;
    }
    const r = await markPass({ schoolId, kind: found.kind, person: found.person, at: p.at, method: p.method, deviceId, ...(p.dir && { direction: p.dir }) });
    if (r.error) { out.refused++; refusedWho.set(p.pin, r.error); } else if (r.duplicate) out.again++;
    else { out.marked++; if (!out.newest || p.at > out.newest) out.newest = p.at; }
  }
  return {
    ...out,
    unknown: [...unknown.entries()].slice(0, 50).map(([pin, name]) => ({ pin, name })),
    unknownCount: unknown.size,
    refusedWhy: [...refusedWho.values()].slice(0, 5),
  };
}

/* A sentence for the office (and the machine log). */
function summaryText(r) {
  const bits = [`${r.marked} marked`];
  if (r.again) bits.push(`${r.again} already in`);
  if (r.notLinked) bits.push(`${r.notLinked} from ${r.unknownCount} user number${r.unknownCount === 1 ? '' : 's'} not linked yet`);
  if (r.refused) bits.push(`${r.refused} refused (${r.refusedWhy[0] || 'left the school'})`);
  if (r.old) bits.push(`${r.old} too old`);
  if (r.future) bits.push(`${r.future} in the future (check the machine's clock)`);
  if (r.bad) bits.push(`${r.bad} not understood`);
  return bits.join(', ');
}

module.exports = { takePunches, summaryText };
