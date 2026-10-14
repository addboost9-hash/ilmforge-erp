/**
 * Question papers — written in the Exam Vault for an exam, class and subject,
 * with real questions, and printed from there with an answer key.
 *
 *   GET    /papers?examId=&classId=&subjectId=   list (no question bodies)
 *   GET    /papers/:id                           one paper with its questions
 *   POST   /papers                               create
 *   PUT    /papers/:id                           change
 *   POST   /papers/:id/copy                      copy to another class/section/exam
 *   DELETE /papers/:id
 *   POST   /papers/suggest                       AI-suggested questions to add
 *
 * Questions are checked here (types, marks, MCQ options and answer) and the
 * paper's total is worked out from them, so a printed total always matches
 * the questions on the paper.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { teacherCanAccessClass } = require('../utils/teacherScope');
const { askJSON } = require('../services/ai.service');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const text = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);

const TYPES = {
  mcq: 'Multiple choice',
  truefalse: 'True / False',
  fill: 'Fill in the blank',
  short: 'Short question',
  long: 'Long question',
};
const MAX_SECTIONS = 10;
const MAX_QUESTIONS = 200;

/* Check and tidy the sections; returns { sections, totalMarks, questions } or { error }. */
function cleanSections(raw) {
  let list = raw;
  if (typeof raw === 'string') { try { list = JSON.parse(raw); } catch { return { error: 'The questions could not be read.' }; } }
  if (!Array.isArray(list)) return { error: 'The questions could not be read.' };
  if (list.length > MAX_SECTIONS) return { error: `A paper can have at most ${MAX_SECTIONS} parts.` };
  let count = 0;
  let totalMarks = 0;
  const sections = [];
  for (let si = 0; si < list.length; si++) {
    const sec = list[si] || {};
    const title = text(sec.title, 120) || `Section ${String.fromCharCode(65 + si)}`;
    const qs = Array.isArray(sec.questions) ? sec.questions : [];
    const questions = [];
    for (let qi = 0; qi < qs.length; qi++) {
      const q = qs[qi] || {};
      const where = `${title}, question ${qi + 1}`;
      const type = TYPES[q.type] ? q.type : null;
      if (!type) return { error: `${where}: choose the question type.` };
      const qText = text(q.text, 4000);
      if (!qText) return { error: `${where}: write the question.` };
      const marks = Number(q.marks);
      if (!Number.isInteger(marks) || marks < 0 || marks > 100) return { error: `${where}: marks must be a whole number from 0 to 100.` };
      const out = { type, text: qText, marks };
      if (type === 'mcq') {
        const options = (Array.isArray(q.options) ? q.options : []).map((o) => text(o, 500));
        if (options.length < 2 || options.length > 6) return { error: `${where}: a multiple-choice question needs 2 to 6 options.` };
        if (options.some((o) => !o)) return { error: `${where}: fill in every option, or remove the empty one.` };
        out.options = options;
        const a = q.answer === '' || q.answer === null || q.answer === undefined ? null : Number(q.answer);
        if (a !== null && !(Number.isInteger(a) && a >= 0 && a < options.length)) return { error: `${where}: the correct option is not one of the options.` };
        out.answer = a;
      } else if (type === 'truefalse') {
        out.answer = q.answer === true || q.answer === 'true' ? true : q.answer === false || q.answer === 'false' ? false : null;
      } else {
        out.answer = text(q.answer, 2000) || null;
      }
      questions.push(out);
    }
    count += questions.length;
    if (count > MAX_QUESTIONS) return { error: `A paper can have at most ${MAX_QUESTIONS} questions.` };
    let attempt = sec.attempt === '' || sec.attempt === null || sec.attempt === undefined ? null : Number(sec.attempt);
    if (attempt !== null && !(Number.isInteger(attempt) && attempt >= 1)) return { error: `${title}: "attempt any" must be a whole number.` };
    if (attempt !== null && attempt >= questions.length) attempt = null; // attempting all of them
    // "Attempt any 3": the section is worth its 3 highest-marked questions.
    const marksList = questions.map((q) => q.marks).sort((a, b) => b - a);
    const sectionMarks = (attempt ? marksList.slice(0, attempt) : marksList).reduce((a, b) => a + b, 0);
    totalMarks += sectionMarks;
    sections.push({ title, note: text(sec.note, 500) || null, attempt, marks: sectionMarks, questions });
  }
  return { sections, totalMarks, questions: count };
}

/* exam, class, section and subject must be this school's; returns ids or { error }. */
async function checkLinks(req, b) {
  const out = {};
  const id = (v) => (v === undefined || v === null || v === '' ? null : parseInt(v));
  out.examId = id(b.examId);
  out.classId = id(b.classId);
  out.sectionId = id(b.sectionId);
  out.subjectId = id(b.subjectId);
  for (const [k, v] of Object.entries(out)) if (v !== null && !Number.isInteger(v)) return { error: `Invalid ${k}.` };
  const sid = req.schoolId;
  const [exam, cls, sec, sub] = await Promise.all([
    out.examId ? prisma.exam.findFirst({ where: { id: out.examId, schoolId: sid }, select: { id: true, title: true } }) : null,
    out.classId ? prisma.class.findFirst({ where: { id: out.classId, schoolId: sid }, select: { id: true, name: true } }) : null,
    out.sectionId ? prisma.section.findFirst({ where: { id: out.sectionId, schoolId: sid }, select: { id: true, classId: true } }) : null,
    out.subjectId ? prisma.subject.findFirst({ where: { id: out.subjectId, schoolId: sid }, select: { id: true, name: true, classId: true } }) : null,
  ]);
  if (out.examId && !exam) return { error: 'That exam no longer exists.' };
  if (out.classId && !cls) return { error: 'Choose a class from the list.' };
  if (out.sectionId && (!sec || (out.classId && sec.classId !== out.classId))) return { error: 'That section is not in the chosen class.' };
  if (out.subjectId && (!sub || (out.classId && sub.classId !== out.classId))) return { error: 'That subject is not taught in the chosen class.' };
  if (out.classId && !(await teacherCanAccessClass(req, out.classId))) return { error: 'You are not assigned to this class.', status: 403 };
  return { ...out, exam, cls, sub };
}

const summary = (p, names) => {
  let questions = 0;
  try { questions = JSON.parse(p.sections || '[]').reduce((n, s) => n + (s.questions?.length || 0), 0); } catch { questions = 0; }
  return {
    id: p.id, title: p.title, examId: p.examId, classId: p.classId, sectionId: p.sectionId,
    subjectId: p.subjectId, subjectName: p.subjectName, totalMarks: p.totalMarks, durationMin: p.durationMin,
    status: p.status, questions, createdAt: p.createdAt, updatedAt: p.updatedAt,
    examTitle: names.exams.get(p.examId) || null,
    className: names.classes.get(p.classId) || null,
    sectionName: names.sections.get(p.sectionId) || null,
  };
};
async function nameMaps(schoolId) {
  const [exams, classes, sections] = await Promise.all([
    prisma.exam.findMany({ where: { schoolId }, select: { id: true, title: true } }),
    prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } }),
    prisma.section.findMany({ where: { schoolId }, select: { id: true, name: true } }),
  ]);
  return {
    exams: new Map(exams.map((x) => [x.id, x.title])),
    classes: new Map(classes.map((x) => [x.id, x.name])),
    sections: new Map(sections.map((x) => [x.id, x.name])),
  };
}
const full = (p, names) => {
  let sections = [];
  try { sections = JSON.parse(p.sections || '[]'); } catch { sections = []; }
  return { ...summary(p, names), instructions: p.instructions, sections };
};

router.get('/', wrap(async (req, res) => {
  const where = { schoolId: req.schoolId };
  for (const k of ['examId', 'classId', 'subjectId']) {
    if (req.query[k] && Number.isInteger(parseInt(req.query[k]))) where[k] = parseInt(req.query[k]);
  }
  const [papers, names] = await Promise.all([
    prisma.questionPaper.findMany({ where, orderBy: [{ classId: 'asc' }, { subjectName: 'asc' }, { updatedAt: 'desc' }] }),
    nameMaps(req.schoolId),
  ]);
  res.json({ success: true, data: papers.map((p) => summary(p, names)), types: TYPES });
}));

/* AI-suggested questions, in this paper's own format, to review and add. */
router.post('/suggest', wrap(async (req, res) => {
  const subject = text(req.body.subject, 80);
  const className = text(req.body.className, 80);
  const topic = text(req.body.topic, 300);
  const count = Math.min(Math.max(parseInt(req.body.count) || 5, 1), 20);
  const type = TYPES[req.body.type] ? req.body.type : 'mcq';
  const marks = Math.min(Math.max(parseInt(req.body.marks) || 1, 0), 100);
  const language = req.body.language === 'ur' ? 'Urdu' : 'English';
  if (!subject || !topic) return bad(res, 'Write the subject and the topic (chapter) for the questions.');
  try {
    const answer = await askJSON({
      system: 'You write exam questions for schools in Pakistan, following the Pakistani national curriculum. Questions must be correct, clear, suitable for the class, and not repeat each other.',
      prompt: `Write ${count} ${TYPES[type].toLowerCase()} question(s) in ${language} for ${subject}${className ? `, ${className}` : ''}, on: ${topic}.`
        + (type === 'mcq' ? ' Each has 4 options and exactly one correct option (answer = its index, 0 to 3).' : '')
        + (type === 'truefalse' ? ' answer is true or false.' : '')
        + (['fill', 'short', 'long'].includes(type) ? ' answer is a short model answer for the teacher.' : '')
        + (type === 'fill' ? ' Mark the blank with ______.' : ''),
      schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                answer: { type: ['string', 'number', 'boolean'] },
              },
              required: ['text'],
            },
          },
        },
        required: ['questions'],
      },
    });
    const questions = (Array.isArray(answer.questions) ? answer.questions : []).slice(0, count).map((q) => {
      const out = { type, text: text(q.text, 4000), marks };
      if (type === 'mcq') {
        out.options = (Array.isArray(q.options) ? q.options : []).map((o) => text(o, 500)).filter(Boolean).slice(0, 6);
        const a = Number(q.answer);
        out.answer = Number.isInteger(a) && a >= 0 && a < out.options.length ? a : null;
      } else if (type === 'truefalse') {
        out.answer = q.answer === true || q.answer === 'true' ? true : q.answer === false || q.answer === 'false' ? false : null;
      } else {
        out.answer = text(q.answer, 2000) || null;
      }
      return out;
    }).filter((q) => q.text && (type !== 'mcq' || q.options.length >= 2));
    if (!questions.length) return bad(res, 'No usable questions came back. Try again, or describe the topic differently.', 502);
    res.json({ success: true, data: questions });
  } catch (e) {
    if (e.status) return bad(res, e.message, e.status);
    throw e;
  }
}));

router.get('/:id', wrap(async (req, res) => {
  const p = await prisma.questionPaper.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!p) return bad(res, 'Question paper not found.', 404);
  res.json({ success: true, data: full(p, await nameMaps(req.schoolId)) });
}));

router.post('/', wrap(async (req, res) => {
  const b = req.body || {};
  const links = await checkLinks(req, b);
  if (links.error) return bad(res, links.error, links.status || 400);
  const cleaned = cleanSections(b.sections ?? []);
  if (cleaned.error) return bad(res, cleaned.error);
  const subjectName = links.sub?.name || text(b.subjectName, 80) || null;
  const title = text(b.title, 200) || [links.exam?.title, subjectName, links.cls?.name].filter(Boolean).join(' — ') || 'Question paper';
  const duration = b.durationMin === '' || b.durationMin === null || b.durationMin === undefined ? null : parseInt(b.durationMin);
  if (duration !== null && !(Number.isInteger(duration) && duration > 0 && duration <= 600)) return bad(res, 'Time must be in minutes, up to 600.');
  const p = await prisma.questionPaper.create({
    data: {
      schoolId: req.schoolId, examId: links.examId, classId: links.classId, sectionId: links.sectionId,
      subjectId: links.subjectId, subjectName, title, durationMin: duration,
      instructions: text(b.instructions, 3000) || null,
      sections: JSON.stringify(cleaned.sections), totalMarks: cleaned.totalMarks,
      status: b.status === 'ready' ? 'ready' : 'draft',
      createdBy: req.user?.id || null,
    },
  });
  res.status(201).json({ success: true, data: full(p, await nameMaps(req.schoolId)), message: 'Question paper saved.' });
}));

router.put('/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.questionPaper.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return bad(res, 'Question paper not found.', 404);
  const b = req.body || {};
  const links = await checkLinks(req, {
    examId: b.examId !== undefined ? b.examId : existing.examId,
    classId: b.classId !== undefined ? b.classId : existing.classId,
    sectionId: b.sectionId !== undefined ? b.sectionId : existing.sectionId,
    subjectId: b.subjectId !== undefined ? b.subjectId : existing.subjectId,
  });
  if (links.error) return bad(res, links.error, links.status || 400);
  const data = { examId: links.examId, classId: links.classId, sectionId: links.sectionId, subjectId: links.subjectId };
  if (b.subjectId !== undefined || b.subjectName !== undefined) data.subjectName = links.sub?.name || text(b.subjectName, 80) || null;
  if (b.title !== undefined) data.title = text(b.title, 200) || existing.title;
  if (b.instructions !== undefined) data.instructions = text(b.instructions, 3000) || null;
  if (b.durationMin !== undefined) {
    const d = b.durationMin === '' || b.durationMin === null ? null : parseInt(b.durationMin);
    if (d !== null && !(Number.isInteger(d) && d > 0 && d <= 600)) return bad(res, 'Time must be in minutes, up to 600.');
    data.durationMin = d;
  }
  if (b.status !== undefined) data.status = b.status === 'ready' ? 'ready' : 'draft';
  if (b.sections !== undefined) {
    const cleaned = cleanSections(b.sections);
    if (cleaned.error) return bad(res, cleaned.error);
    data.sections = JSON.stringify(cleaned.sections);
    data.totalMarks = cleaned.totalMarks;
  }
  const p = await prisma.questionPaper.update({ where: { id }, data });
  res.json({ success: true, data: full(p, await nameMaps(req.schoolId)), message: 'Question paper saved.' });
}));

/* The same paper for another section, class or exam (then edited there). */
router.post('/:id/copy', wrap(async (req, res) => {
  const src = await prisma.questionPaper.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!src) return bad(res, 'Question paper not found.', 404);
  const b = req.body || {};
  const target = {
    examId: b.examId !== undefined ? b.examId : src.examId,
    classId: b.classId !== undefined ? b.classId : src.classId,
    sectionId: b.sectionId !== undefined ? b.sectionId : (b.classId !== undefined ? null : src.sectionId),
    // A subject belongs to one class: in another class, the same-named one.
    subjectId: b.classId !== undefined && b.classId !== src.classId ? null : src.subjectId,
  };
  if (target.subjectId === null && src.subjectName && target.classId) {
    const same = await prisma.subject.findFirst({ where: { schoolId: req.schoolId, classId: parseInt(target.classId), name: src.subjectName }, select: { id: true } });
    if (same) target.subjectId = same.id;
  }
  const links = await checkLinks(req, target);
  if (links.error) return bad(res, links.error, links.status || 400);
  const p = await prisma.questionPaper.create({
    data: {
      schoolId: req.schoolId, examId: links.examId, classId: links.classId, sectionId: links.sectionId,
      subjectId: links.subjectId, subjectName: links.sub?.name || src.subjectName,
      title: text(b.title, 200) || `${src.title} (copy)`, durationMin: src.durationMin,
      instructions: src.instructions, sections: src.sections, totalMarks: src.totalMarks,
      status: 'draft', createdBy: req.user?.id || null,
    },
  });
  res.status(201).json({ success: true, data: full(p, await nameMaps(req.schoolId)), message: 'Copy made. Change what differs and save.' });
}));

router.delete('/:id', wrap(async (req, res) => {
  const p = await prisma.questionPaper.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!p) return bad(res, 'Question paper not found.', 404);
  if (p.classId && !(await teacherCanAccessClass(req, p.classId))) return bad(res, 'You are not assigned to this class.', 403);
  await prisma.questionPaper.delete({ where: { id: p.id } });
  res.json({ success: true, message: 'Question paper deleted.' });
}));

module.exports = router;
module.exports.cleanSections = cleanSections;
