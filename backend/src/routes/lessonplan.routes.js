const express = require('express');
const router = express.Router();
const https = require('https');
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// POST /generate-ai — MUST be before /:id routes
router.post('/generate-ai', wrap(async (req, res) => {
  const { subject, className, topic, duration, objectives, type, difficulty, numQuestions, includeTypes, prompt: customPrompt } = req.body;
  if (!subject || !className || !topic) {
    return res.status(400).json({ success: false, message: 'subject, className, topic required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback for worksheet generation (when type === 'worksheet')
    if (type === 'worksheet') {
      const n = parseInt(numQuestions) || 10;
      const lines = [];
      if (includeTypes && includeTypes.includes('mcq')) {
        lines.push(`**Multiple Choice Questions**`);
        for (let i = 1; i <= Math.ceil(n / 3); i++) {
          lines.push(`${i}. Sample MCQ question ${i} about ${topic}?`);
          lines.push(`A) Option A   B) Option B   C) Option C   D) Option D`);
          lines.push(`Answer: A`);
          lines.push('');
        }
      }
      if (includeTypes && includeTypes.includes('fillBlanks')) {
        lines.push(`**Fill in the Blanks**`);
        for (let i = 1; i <= Math.ceil(n / 3); i++) {
          lines.push(`${i}. The main concept of ${topic} is _________.`);
        }
        lines.push('');
      }
      if (includeTypes && includeTypes.includes('shortAnswers')) {
        lines.push(`**Short Answer Questions**`);
        for (let i = 1; i <= Math.ceil(n / 3); i++) {
          lines.push(`${i}. Explain the concept of ${topic} in 2-3 sentences.`);
        }
        lines.push('');
      }
      lines.push(`**Answer Key**`);
      lines.push(`(Answers would appear here after AI generation)`);

      return res.json({ success: true, data: lines.join('\n') });
    }

    return res.json({
      success: true,
      data: {
        topic,
        duration:     duration || '45 minutes',
        objectives:   objectives || `Students will understand the key concepts of ${topic}`,
        warmUp:       `Begin with a 5-minute review of previous lesson related to ${topic}`,
        mainActivity: `Teacher explains ${topic} with examples and visual aids for ${subject}`,
        practice:     `Students complete exercises related to ${topic} individually`,
        assessment:   `Short quiz or verbal questioning on ${topic}`,
        homework:     `Complete textbook exercises on ${topic} from chapter covered`,
        resources:    `Textbook, whiteboard, markers, printed worksheets`,
      },
    });
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
    path:     `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

  res.status(201).json({ success: true, data: { ...plan, planData } });
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

module.exports = router;
