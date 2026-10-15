/**
 * Moving a whole school between IlmForge installations — from the online app
 * to the desktop app, or from one desktop computer to another.
 *
 *   exportSchool(schoolId, writable)  writes a gzipped JSON file (.ilmforge)
 *   importSchool(buffer)              loads one into an EMPTY database
 *
 * Every table that belongs to the school travels, found from the schema
 * itself (Prisma's DMMF), so a table added later is included without
 * touching this file: rows with the school's schoolId, and rows of tables
 * that hang off one of those (quiz questions, test marks, chat messages…).
 * Rows keep their ids, so every link between them stays as it was; that is
 * why an import only goes into a database that has no school yet.
 *
 * Left out: sign-in codes (OtpToken), push-notification tokens of the
 * online app's phones (DeviceToken), and the online backup log (DbBackup).
 */
const zlib = require('zlib');
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');

const FORMAT = 'ilmforge-transfer';
const VERSION = 1;
const SKIP = new Set(['OtpToken', 'DeviceToken', 'DbBackup']);
const BATCH = 500;

const models = Prisma.dmmf.datamodel.models;
const byName = new Map(models.map((m) => [m.name, m]));
const delegateOf = (name) => prisma[name.charAt(0).toLowerCase() + name.slice(1)];
const hasSchoolId = (m) => m.fields.some((f) => f.name === 'schoolId' && f.kind === 'scalar');

/* How to find one school's rows in each table. */
function scopeFor(model, schoolId) {
  if (model.name === 'School') return { id: schoolId };
  if (model.name === 'ExamMark') {
    // Older marks were saved without schoolId: reach them through the exam.
    return { OR: [{ schoolId }, { schoolId: null, exam: { schoolId } }] };
  }
  if (hasSchoolId(model)) return { schoolId };
  // A table without schoolId: through a parent table that has one.
  const link = model.fields.find((f) => f.kind === 'object' && f.relationFromFields?.length && hasSchoolId(byName.get(f.type)));
  return link ? { [link.name]: { schoolId } } : null;
}

const exportPlan = () => models
  .filter((m) => !SKIP.has(m.name))
  .map((m) => ({ model: m, idField: m.fields.find((f) => f.isId)?.name }))
  .filter((p) => p.idField);

/**
 * Write one school as a gzipped JSON stream. Rows are read in batches, so
 * a school with thousands of students and photos never sits in memory whole.
 */
async function exportSchool(schoolId, writable, { appVersion = '' } = {}) {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true } });
  if (!school) throw Object.assign(new Error('School not found.'), { status: 404 });
  const gz = zlib.createGzip({ level: 6 });
  gz.pipe(writable);
  const write = (s) => new Promise((resolve) => (gz.write(s) ? resolve() : gz.once('drain', resolve)));
  const counts = {};
  await write(`{"format":"${FORMAT}","version":${VERSION},"exportedAt":${JSON.stringify(new Date())},"appVersion":${JSON.stringify(appVersion)},"school":${JSON.stringify(school)},"tables":{`);
  let firstTable = true;
  for (const { model, idField } of exportPlan()) {
    const where = scopeFor(model, schoolId);
    if (!where) continue;
    await write(`${firstTable ? '' : ','}${JSON.stringify(model.name)}:[`);
    firstTable = false;
    let cursor = null;
    let n = 0;
    for (;;) {
      const rows = await delegateOf(model.name).findMany({
        where, take: BATCH, orderBy: { [idField]: 'asc' },
        ...(cursor !== null && { cursor: { [idField]: cursor }, skip: 1 }),
      });
      if (!rows.length) break;
      for (const r of rows) { await write(`${n ? ',' : ''}${JSON.stringify(r)}`); n += 1; }
      cursor = rows[rows.length - 1][idField];
      if (rows.length < BATCH) break;
    }
    await write(']');
    counts[model.name] = n;
  }
  await write(`},"counts":${JSON.stringify(counts)}}`);
  await new Promise((resolve, reject) => { gz.on('error', reject); writable.on('finish', resolve); writable.on('close', resolve); gz.end(); });
  return { school, counts };
}

/* Read a transfer file (gzipped or plain JSON) and check it is one. */
function readTransfer(buffer) {
  let text;
  try { text = (buffer[0] === 0x1f && buffer[1] === 0x8b ? zlib.gunzipSync(buffer) : buffer).toString('utf8'); } catch { text = null; }
  let data = null;
  try { data = text && JSON.parse(text); } catch { data = null; }
  if (!data || data.format !== FORMAT || typeof data.tables !== 'object') {
    throw Object.assign(new Error('This is not an IlmForge transfer file (.ilmforge). Download it again from the online IlmForge: Settings → Backup → "Download everything".'), { status: 400 });
  }
  if (data.version > VERSION) {
    throw Object.assign(new Error('This file comes from a newer IlmForge. Update this app first.'), { status: 400 });
  }
  return data;
}

/* One row as this database expects it: dates back to Date, unknown columns dropped. */
function shapeRow(model, row) {
  const out = {};
  for (const f of model.fields) {
    if (f.kind !== 'scalar' && f.kind !== 'enum') continue;
    if (!(f.name in row)) continue;
    const v = row[f.name];
    out[f.name] = f.type === 'DateTime' && v !== null ? new Date(v) : v;
  }
  return out;
}

/**
 * Load a transfer file into this database. Refused if a school is already
 * here (ids would collide). All or nothing: one transaction, with foreign
 * keys checked at the end, so the order tables arrive in does not matter.
 */
async function importSchool(buffer, { onProgress } = {}) {
  const data = readTransfer(buffer);
  const existing = await prisma.school.count();
  if (existing) throw Object.assign(new Error('This computer already has a school. A transfer file can only be loaded into a new, empty installation.'), { status: 409 });
  const isSqlite = !/^postgres/i.test(process.env.DATABASE_URL || '');
  const counts = {};
  const tables = Object.keys(data.tables).filter((name) => byName.has(name) && !SKIP.has(name));
  // School first, then the rest (with deferred foreign keys the order only
  // matters for readability of progress).
  tables.sort((a, b) => (a === 'School' ? -1 : b === 'School' ? 1 : 0));
  await prisma.$transaction(async (tx) => {
    if (isSqlite) await tx.$executeRawUnsafe('PRAGMA defer_foreign_keys = ON');
    else await tx.$executeRawUnsafe('SET CONSTRAINTS ALL DEFERRED');
    for (const name of tables) {
      const model = byName.get(name);
      const rows = (data.tables[name] || []).map((r) => shapeRow(model, r));
      const delegate = tx[name.charAt(0).toLowerCase() + name.slice(1)];
      for (let i = 0; i < rows.length; i += BATCH) {
        await delegate.createMany({ data: rows.slice(i, i + BATCH) });
      }
      counts[name] = rows.length;
      onProgress?.(name, rows.length);
    }
  }, { timeout: 30 * 60 * 1000, maxWait: 60 * 1000 });
  // PostgreSQL id sequences would still start at 1 after explicit ids.
  if (!isSqlite) {
    for (const name of tables) {
      const model = byName.get(name);
      const id = model.fields.find((f) => f.isId && f.type === 'Int' && f.default?.name === 'autoincrement');
      if (id) await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${model.dbName || name}"', '${id.name}'), COALESCE((SELECT MAX("${id.name}") FROM "${model.dbName || name}"), 1))`);
    }
  }
  return { school: data.school, counts, exportedAt: data.exportedAt };
}

module.exports = { exportSchool, importSchool, readTransfer, scopeFor, FORMAT };
