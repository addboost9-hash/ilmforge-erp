/**
 * Student photos in bulk.
 *
 * A school has hundreds of photos from the photographer. Each one is named
 * after its student, and this matches the file name to the student:
 *
 *   NUR-26-001.jpg        the roll number (a "/" in a roll number cannot be in
 *                         a file name: "-" or "_" in its place also matches)
 *   3520212345671.jpg     the B-Form number (with or without dashes)
 *   Ayesha Khan.jpg       the student's full name, when only one student has it
 *
 * The browser shrinks each photo to passport size before it is sent (the same
 * as the admission form), so a batch is small. Nothing is replaced unless the
 * school asks: a student who already has a photo keeps it.
 */
const ExcelJS = require('exceljs');
const prisma = require('../config/prisma');
const { checkPhoto } = require('../utils/photo');

const digits = (v) => String(v || '').replace(/\D/g, '');
const pname = (v) => String(v || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const low = (v) => String(v || '').trim().toLowerCase();

/* "photos/NUR-26-001.JPG" -> "NUR-26-001". */
function fileKey(file) {
  const base = String(file || '').split(/[\\/]/).pop();
  return base.replace(/\.[A-Za-z0-9]{2,5}$/, '').trim();
}

const push = (map, k, v) => { if (!k) return; if (!map.has(k)) map.set(k, []); if (!map.get(k).includes(v)) map.get(k).push(v); };

/* Every student of the school, findable by roll number, B-Form and name. */
async function studentIndex(schoolId) {
  const [rows, withPhoto] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId, deletedAt: null },
      select: { id: true, name: true, lastName: true, fatherName: true, rollNo: true, bFormNo: true, status: true, class: { select: { name: true } }, section: { select: { name: true } } },
    }),
    prisma.student.findMany({ where: { schoolId, deletedAt: null, NOT: [{ photoUrl: null }, { photoUrl: '' }] }, select: { id: true } }),
  ]);
  const hasPhoto = new Set(withPhoto.map((x) => x.id));
  const byRoll = new Map();
  const byBform = new Map();
  const byName = new Map();
  for (const s of rows) {
    s.hasPhoto = hasPhoto.has(s.id);
    if (s.rollNo) {
      const r = low(s.rollNo);
      push(byRoll, r, s);
      push(byRoll, r.replace(/\//g, '-'), s);
      push(byRoll, r.replace(/\//g, '_'), s);
    }
    const b = digits(s.bFormNo);
    if (b.length >= 10) push(byBform, b, s);
    push(byName, pname([s.name, s.lastName].filter(Boolean).join(' ')), s);
  }
  return { byRoll, byBform, byName };
}

/* The one student a file is for, or why there is none. */
function matchKey(index, key) {
  const one = (list) => {
    if (!list?.length) return null;
    if (list.length === 1) return list[0];
    const active = list.filter((s) => s.status === 'active');
    return active.length === 1 ? active[0] : list;
  };
  const r = one(index.byRoll.get(low(key)));
  if (r && !Array.isArray(r)) return { student: r, by: 'roll number' };
  const d = digits(key);
  if (d.length >= 10 && /^[\d\s-]+$/.test(key)) {
    const b = one(index.byBform.get(d));
    if (b && !Array.isArray(b)) return { student: b, by: 'B-Form number' };
    if (Array.isArray(b)) return { error: `${b.length} students have B-Form number ${key}: name the file with the roll number.` };
  }
  const n = one(index.byName.get(pname(key)));
  if (n && !Array.isArray(n)) return { student: n, by: 'name' };
  if (Array.isArray(n)) return { error: `${n.length} students are called "${key}": name the file with the roll number.` };
  if (Array.isArray(r)) return { error: `${r.length} students have roll number ${key}.` };
  return { error: `No student has the roll number, B-Form number or name "${key}".` };
}

const view = (s, by) => ({
  id: s.id,
  name: [s.name, s.lastName].filter(Boolean).join(' '),
  fatherName: s.fatherName || '',
  rollNo: s.rollNo || '',
  className: [s.class?.name, s.section?.name].filter(Boolean).join(' — '),
  status: s.status,
  hasPhoto: s.hasPhoto,
  by,
});

/**
 * Which student each file is for, in the order given. Two files for one
 * student: the second is pointed out.
 * Returns [{ file, key, student?, error? }].
 */
async function matchFiles(schoolId, files) {
  const index = await studentIndex(schoolId);
  const taken = new Map();
  return files.map((file) => {
    const key = fileKey(file);
    if (!key) return { file, key, error: 'The file has no name.' };
    const m = matchKey(index, key);
    if (m.error) return { file, key, error: m.error };
    if (taken.has(m.student.id)) return { file, key, student: view(m.student, m.by), error: `Another photo (${taken.get(m.student.id)}) is for the same student.` };
    taken.set(m.student.id, file);
    return { file, key, student: view(m.student, m.by) };
  });
}

/**
 * Save photos: [{ file, photo }] (photo a small JPEG data URL). Matched again
 * here by file name; the browser is not trusted with the student.
 *   replace  also replace photos students already have
 * Returns [{ file, status: saved|kept|failed, student?, error? }].
 */
async function savePhotos(schoolId, items, { replace = false, actorUserId = null } = {}) {
  const index = await studentIndex(schoolId);
  const out = [];
  const done = new Set();
  for (const item of items) {
    const file = String(item?.file || '');
    const m = matchKey(index, fileKey(file));
    if (m.error) { out.push({ file, status: 'failed', error: m.error }); continue; }
    const s = m.student;
    if (done.has(s.id)) { out.push({ file, status: 'failed', student: view(s, m.by), error: 'Another photo in this batch is for the same student.' }); continue; }
    const photo = checkPhoto(item?.photo);
    if (photo.error || !photo.value) { out.push({ file, status: 'failed', student: view(s, m.by), error: photo.error || 'No photo.' }); continue; }
    if (s.hasPhoto && !replace) { out.push({ file, status: 'kept', student: view(s, m.by), error: 'Already has a photo (kept).' }); continue; }
    await prisma.student.update({ where: { id: s.id }, data: { photoUrl: photo.value } });
    s.hasPhoto = true;
    done.add(s.id);
    out.push({ file, status: 'saved', student: view(s, m.by) });
  }
  const saved = out.filter((x) => x.status === 'saved').length;
  if (saved) {
    await prisma.auditLog.create({
      data: { schoolId, userId: actorUserId, action: 'STUDENT_PHOTOS_IMPORTED', resource: 'student', details: JSON.stringify({ saved, replace: !!replace }) },
    }).catch(() => null);
  }
  return out;
}

/* Every student with the name to give their photo file: the photographer's
   list. Class by class in the school's order, then section and roll number. */
async function buildPhotoList(schoolId) {
  const [classes, students, withPhoto] = await Promise.all([
    prisma.class.findMany({ where: { schoolId }, select: { id: true, orderNo: true } }),
    prisma.student.findMany({
      where: { schoolId, deletedAt: null, status: 'active' },
      select: { id: true, name: true, lastName: true, fatherName: true, rollNo: true, bFormNo: true, classId: true, class: { select: { name: true } }, section: { select: { name: true } } },
    }),
    prisma.student.findMany({ where: { schoolId, deletedAt: null, status: 'active', NOT: [{ photoUrl: null }, { photoUrl: '' }] }, select: { id: true } }),
  ]);
  const order = new Map(classes.map((c) => [c.id, c.orderNo ?? 0]));
  const has = new Set(withPhoto.map((x) => x.id));
  students.sort((a, b) => (order.get(a.classId) ?? 999) - (order.get(b.classId) ?? 999)
    || String(a.class?.name || '').localeCompare(String(b.class?.name || ''))
    || String(a.section?.name || '').localeCompare(String(b.section?.name || ''))
    || String(a.rollNo || '').localeCompare(String(b.rollNo || ''), undefined, { numeric: true }));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'IlmForge';
  const ws = wb.addWorksheet('Photo list', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Class', key: 'cls', width: 16 },
    { header: 'Section', key: 'sec', width: 9 },
    { header: 'Roll No', key: 'roll', width: 16 },
    { header: 'Student Name', key: 'name', width: 26 },
    { header: 'Father Name', key: 'father', width: 24 },
    { header: 'Has photo', key: 'has', width: 11 },
    { header: 'Name the photo file', key: 'file', width: 24 },
  ];
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3D33' } };
  for (const s of students) {
    const safeRoll = String(s.rollNo || '').replace(/\//g, '-');
    const row = ws.addRow({
      cls: s.class?.name || '', sec: s.section?.name || '', roll: s.rollNo || '',
      name: [s.name, s.lastName].filter(Boolean).join(' '), father: s.fatherName || '',
      has: has.has(s.id) ? 'Yes' : 'No',
      file: safeRoll ? `${safeRoll}.jpg` : (s.bFormNo ? `${digits(s.bFormNo)}.jpg` : ''),
    });
    if (!has.has(s.id)) row.getCell('has').font = { color: { argb: 'FFB23742' }, bold: true };
  }
  ws.autoFilter = { from: 'A1', to: 'G1' };
  return { wb, count: students.length, missing: students.filter((s) => !has.has(s.id)).length };
}

module.exports = { fileKey, matchKey, studentIndex, matchFiles, savePhotos, buildPhotoList };
