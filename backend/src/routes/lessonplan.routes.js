const express = require('express');
const router = express.Router();
const https = require('https');
const prisma = require('../config/prisma');
const { readSettings, mergeSettings } = require('../utils/schoolSettings');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// POST /generate-ai — MUST be before /:id routes
router.post('/generate-ai', wrap(async (req, res) => {
  const { subject, className, topic, duration, objectives, type, difficulty, numQuestions, includeTypes, prompt: customPrompt } = req.body;
  if (!subject || !className || !topic) {
    return res.status(400).json({ success: false, message: 'subject, className, topic required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  // Without an AI key this used to hand back made-up text ("Sample MCQ
  // question 1 about …", a generic plan) as if it had been written for the
  // topic. Say plainly that AI help is off instead.
  if (!apiKey) {
    return res.status(503).json({ success: false, message: 'AI help is not switched on for this school. Write the plan yourself, or ask the administrator to set it up.' });
  }
  // Determine the prompt to use
  let finalPrompt = customPrompt;
  if (!finalPrompt) {
    if (type === 'worksheet') {
      const n = parseInt(numQuestions) || 10;
      const diff = difficulty || 'Medium';
      const types = Array.isArray(includeTypes) ? includeTypes : [];
      finalPrompt = `Generate a complete ${diff} difficulty worksheet for ${className} students on ${subject} - Topic: "${topic}". Include ${n} questions total with these types: ${types.join(', ')}. Format clearly with sections, numbered questions, and an answer key at the end. Use plain text format (no JSON).`;
    } else {
      finalPrompt = `Create a detailed lesson plan for ${subject}, class ${className}, topic: ${topic}. Duration: ${duration || '45 minutes'}. ${objectives ? 'Objectives hint: ' + objectives : ''}
Return ONLY valid JSON (no markdown): {"topic":"...","duration":"...","objectives":"...","warmUp":"...","mainActivity":"...","practice":"...","assessment":"...","homework":"...","resources":"..."}`;
    }
  }

  const bodyStr = JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] });

  const reqOptions = {
    hostname: 'generativelanguage.googleapis.com',
    path:     `/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`,
    method:   'POST',
    headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
  };

  const geminiResponse = await new Promise((resolve, reject) => {
    const request = https.request(reqOptions, (response) => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    request.on('error', reject);
    request.write(bodyStr);
    request.end();
  });

  const text = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // For worksheet, return raw text
  if (type === 'worksheet') {
    return res.json({ success: true, data: text });
  }

  // For lesson plan, try to parse JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let planResult = {};
  if (jsonMatch) {
    try { planResult = JSON.parse(jsonMatch[0]); } catch { planResult = { topic, notes: text }; }
  } else {
    planResult = { topic, notes: text };
  }

  res.json({ success: true, data: planResult });
}));

// GET / - list lesson plans
router.get('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, subjectId } = req.query;
  const where = { schoolId, fileType: 'lesson_plan' };
  if (classId)   where.classId   = parseInt(classId);
  if (subjectId) where.subjectId = parseInt(subjectId);

  const plans = await prisma.studyMaterial.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const classes  = await prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } });
  const subjects = await prisma.subject.findMany({ where: { schoolId }, select: { id: true, name: true } });
  const classMap   = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

  const result = plans.map(p => {
    let planData = {};
    if (p.description) {
      try { planData = JSON.parse(p.description); } catch { planData = { notes: p.description }; }
    }
    return {
      ...p,
      planData,
      className:   p.classId   ? classMap[p.classId]   : null,
      subjectName: p.subjectId ? subjectMap[p.subjectId] : null,
      // Convenience aliases for the Teacher Portal's lesson-plan workflow UI,
      // which reads plan.class?.name / plan.status / plan.unit / plan.content
      // etc. directly rather than through the nested `planData` blob that the
      // Academics admin page (above) uses. Purely additive — className/
      // subjectName/planData are unchanged for existing consumers.
      class:       p.classId   ? { id: p.classId, name: classMap[p.classId] } : null,
      subject:     p.subjectId ? { id: p.subjectId, name: subjectMap[p.subjectId] } : null,
      unit:        planData.topic || p.title,
      week:        planData.week,
      objectives:  planData.objectives,
      content:     planData.mainActivity,
      activities:  planData.practice,
      assessment:  planData.assessment,
      status:      planData.status || 'draft',
      adminNotes:  planData.adminNotes,
    };
  });

  res.json({ success: true, data: result });
}));

// POST / - create lesson plan
// FIX: the Teacher Portal's "Create Lesson Plan" form doesn't send `title` at
// all — it sends `unit` (and `content`/`activities`/`week`/`status` instead
// of `mainActivity`/`practice`) — so this always returned 400 "title
// required" and the Teacher Portal could never save a lesson plan. Now
// accepts both vocabularies; `title` still wins when a caller (e.g. the
// Academics admin page) sends it directly.
router.post('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const {
    classId, subjectId, title, objectives, warmUp, mainActivity, practice,
    assessment, homework, resources, topic, duration,
    unit, week, content, activities, status,
  } = req.body;

  const effectiveTitle = title || unit || topic;
  if (!effectiveTitle) return res.status(400).json({ success: false, message: 'title required.' });

  const planData = {
    objectives, warmUp,
    mainActivity: mainActivity !== undefined ? mainActivity : content,
    practice:     practice     !== undefined ? practice     : activities,
    assessment, homework, resources,
    topic: topic !== undefined ? topic : unit,
    duration, week,
    status: status || 'draft',
  };

  const plan = await prisma.studyMaterial.create({
    data: {
      schoolId,
      classId:    classId    ? parseInt(classId)    : null,
      subjectId:  subjectId  ? parseInt(subjectId)  : null,
      teacherId:  req.user?.id || null,
      title: effectiveTitle,
      fileType:    'lesson_plan',
      fileUrl:     'lesson_plan',
      description: JSON.stringify(planData),
    },
  });

  res.status(201).json({ success: true, data: { ...plan, planData } });
}));

// GET /:id - single
/* The school year's two terms for lesson planning (Academics → Session &
   Term Setting and Term Breakup). Kept with the school: they used to be in
   one browser's localStorage, so each computer showed its own dates. Until
   the school sets them, its academic session is offered, split in two. */
const TERM_KEYS = ['sessionName', 'sessionStart', 'sessionEnd', 'term1Start', 'term1End', 'term2Start', 'term2End'];
const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const pkDay = (d) => new Date(d.getTime() + 5 * 3600e3).toISOString().slice(0, 10);

router.get('/terms', wrap(async (req, res) => {
  const saved = (await readSettings(req.schoolId)).sessionTerms;
  if (saved) return res.json({ success: true, data: { ...saved, saved: true } });
  const s = await prisma.academicSession.findFirst({ where: { schoolId: req.schoolId }, orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }] });
  if (!s) return res.json({ success: true, data: { saved: false } });
  const mid = new Date((s.startDate.getTime() + s.endDate.getTime()) / 2);
  res.json({
    success: true,
    data: {
      saved: false, sessionName: s.name, sessionStart: pkDay(s.startDate), sessionEnd: pkDay(s.endDate),
      term1Start: pkDay(s.startDate), term1End: pkDay(mid), term2Start: pkDay(new Date(mid.getTime() + 864e5)), term2End: pkDay(s.endDate),
    },
  });
}));

router.put('/terms', wrap(async (req, res) => {
  if (!['admin', 'super_admin'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only the administrator can change the terms.' });
  }
  const b = req.body || {};
  const sessionName = String(b.sessionName || '').trim().slice(0, 40);
  const bad = (message) => res.status(400).json({ success: false, message });
  if (!sessionName) return bad('Give the session a name, such as 2026-2027.');
  if (TERM_KEYS.slice(1).some((k) => !isDay(b[k]))) return bad('Fill in every date.');
  if (b.sessionStart > b.sessionEnd || b.term1Start > b.term1End || b.term2Start > b.term2End) return bad('Each end date must be on or after its start date.');
  if (b.term1End >= b.term2Start) return bad('The 2nd term must start after the 1st term ends.');
  if (b.term1Start < b.sessionStart || b.term2End > b.sessionEnd) return bad('Both terms must fall inside the session dates.');
  const terms = Object.fromEntries(TERM_KEYS.map((k) => [k, k === 'sessionName' ? sessionName : b[k]]));
  await mergeSettings(req.schoolId, { sessionTerms: terms });
  res.json({ success: true, data: { ...terms, saved: true } });
}));

router.get('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const plan = await prisma.studyMaterial.findFirst({
    where: { id: parseInt(req.params.id), schoolId, fileType: 'lesson_plan' },
  });
  if (!plan) return res.status(404).json({ success: false, message: 'Not found.' });

  let planData = {};
  if (plan.description) {
    try { planData = JSON.parse(plan.description); } catch { planData = { notes: plan.description }; }
  }
  res.json({ success: true, data: { ...plan, planData } });
}));

// PUT /:id - update
// FIX: this rebuilt planData from scratch on every call using only the
// fields present in THIS request body. The Teacher Portal's "submit for
// approval" action calls PUT with just `{ status: 'submitted' }` — every
// other field (objectives, activities, etc.) came through as `undefined`,
// JSON.stringify dropped them, and the update wiped out the entire lesson
// plan content it was supposed to just flag as submitted. Now merges onto
// the existing saved planData and only overwrites keys actually supplied,
// accepting both the admin (mainActivity/practice/topic) and Teacher Portal
// (content/activities/unit/status/adminNotes) vocabularies.
router.put('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const existing = await prisma.studyMaterial.findFirst({ where: { id: parseInt(req.params.id), schoolId, fileType: 'lesson_plan' } });
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });

  let existingPlanData = {};
  if (existing.description) {
    try { existingPlanData = JSON.parse(existing.description); } catch { existingPlanData = {}; }
  }

  const {
    classId, subjectId, title, objectives, warmUp, mainActivity, practice,
    assessment, homework, resources, topic, duration,
    unit, week, content, activities, status, adminNotes,
  } = req.body;

  const planData = {
    ...existingPlanData,
    ...(objectives    !== undefined && { objectives }),
    ...(warmUp        !== undefined && { warmUp }),
    ...(mainActivity  !== undefined && { mainActivity }),
    ...(content       !== undefined && { mainActivity: content }),
    ...(practice      !== undefined && { practice }),
    ...(activities    !== undefined && { practice: activities }),
    ...(assessment    !== undefined && { assessment }),
    ...(homework      !== undefined && { homework }),
    ...(resources     !== undefined && { resources }),
    ...(topic         !== undefined && { topic }),
    ...(unit          !== undefined && { topic: unit }),
    ...(duration      !== undefined && { duration }),
    ...(week          !== undefined && { week }),
    ...(status        !== undefined && { status }),
    ...(adminNotes    !== undefined && { adminNotes }),
  };

  const updated = await prisma.studyMaterial.update({
    where: { id: parseInt(req.params.id) },
    data: {
      ...(classId   !== undefined && { classId:    classId   ? parseInt(classId)   : null }),
      ...(subjectId !== undefined && { subjectId:  subjectId ? parseInt(subjectId) : null }),
      ...(title      && { title }),
      description: JSON.stringify(planData),
    },
  });
  res.json({ success: true, data: { ...updated, planData } });
}));

// DELETE /:id
router.delete('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const existing = await prisma.studyMaterial.findFirst({ where: { id: parseInt(req.params.id), schoolId, fileType: 'lesson_plan' } });
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });
  await prisma.studyMaterial.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true, message: 'Deleted.' });
}));

module.exports = router;
