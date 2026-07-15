const express = require('express');
const router = express.Router();
const https = require('https');
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

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
    };
  });

  res.json({ success: true, data: result });
}));

// POST / - create lesson plan
router.post('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, subjectId, title, objectives, warmUp, mainActivity, practice, assessment, homework, resources, topic, duration } = req.body;

  if (!title) return res.status(400).json({ success: false, message: 'title required.' });

  const planData = { objectives, warmUp, mainActivity, practice, assessment, homework, resources, topic, duration };

  const plan = await prisma.studyMaterial.create({
    data: {
      schoolId,
      classId:    classId    ? parseInt(classId)    : null,
      subjectId:  subjectId  ? parseInt(subjectId)  : null,
      teacherId:  req.user?.id || null,
      title,
      fileType:    'lesson_plan',
      fileUrl:     'lesson_plan',
      description: JSON.stringify(planData),
    },
  });

  res.status(201).json({ success: true, data: plan });
}));

// GET /:id - single
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
router.put('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const existing = await prisma.studyMaterial.findFirst({ where: { id: parseInt(req.params.id), schoolId, fileType: 'lesson_plan' } });
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });

  const { classId, subjectId, title, objectives, warmUp, mainActivity, practice, assessment, homework, resources, topic, duration } = req.body;
  const planData = { objectives, warmUp, mainActivity, practice, assessment, homework, resources, topic, duration };

  const updated = await prisma.studyMaterial.update({
    where: { id: parseInt(req.params.id) },
    data: {
      ...(classId   !== undefined && { classId:    classId   ? parseInt(classId)   : null }),
      ...(subjectId !== undefined && { subjectId:  subjectId ? parseInt(subjectId) : null }),
      ...(title      && { title }),
      description: JSON.stringify(planData),
    },
  });
  res.json({ success: true, data: updated });
}));

// DELETE /:id
router.delete('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const existing = await prisma.studyMaterial.findFirst({ where: { id: parseInt(req.params.id), schoolId, fileType: 'lesson_plan' } });
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });
  await prisma.studyMaterial.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true, message: 'Deleted.' });
}));

// POST /generate-ai - AI lesson plan generation
router.post('/generate-ai', wrap(async (req, res) => {
  const { subject, className, topic, duration, objectives } = req.body;
  if (!subject || !className || !topic) {
    return res.status(400).json({ success: false, message: 'subject, className, topic required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      success: true,
      data: {
        topic,
        duration:      duration || '45 minutes',
        objectives:    objectives || `Students will understand the key concepts of ${topic}`,
        warmUp:        `Begin with a 5-minute review of previous lesson related to ${topic}`,
        mainActivity:  `Teacher explains ${topic} with examples and visual aids for ${subject}`,
        practice:      `Students complete exercises related to ${topic} individually`,
        assessment:    `Short quiz or verbal questioning on ${topic}`,
        homework:      `Complete textbook exercises on ${topic} from chapter covered`,
        resources:     `Textbook, whiteboard, markers, printed worksheets`,
      },
    });
  }

  const prompt = `Create a detailed lesson plan using Bloom's Taxonomy for ${subject}, class ${className}, topic: ${topic}. Duration: ${duration || 45} minutes. ${objectives ? 'Teacher hints: ' + objectives : ''}

Structure objectives across all 6 Bloom's Taxonomy levels. Return ONLY valid JSON (no markdown):
{"title":"...","subject":"${subject}","class":"${className}","topic":"${topic}","duration":${duration || 45},"bloomsObjectives":{"remember":["..."],"understand":["..."],"apply":["..."],"analyze":["..."],"evaluate":["..."],"create":["..."]},"warmUp":{"activity":"...","duration":5,"bloomsLevel":"remember"},"mainActivity":{"description":"...","duration":25,"bloomsLevel":"apply"},"practice":{"description":"...","duration":10,"bloomsLevel":"analyze"},"assessment":{"description":"...","duration":5,"bloomsLevel":"evaluate","method":"Q&A"},"homework":"...","resources":["..."],"teacherNotes":"..."}`;
  const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });

  const reqOptions = {
    hostname: 'generativelanguage.googleapis.com',
    path:     `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    method:   'POST',
    headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  };

  const geminiResponse = await new Promise((resolve, reject) => {
    const request = https.request(reqOptions, (response) => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    request.on('error', reject);
    request.write(body);
    request.end();
  });

  const text = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let planResult = {};
  if (jsonMatch) {
    try { planResult = JSON.parse(jsonMatch[0]); } catch { planResult = { topic, notes: text }; }
  }

  res.json({ success: true, data: planResult });
}));

module.exports = router;
