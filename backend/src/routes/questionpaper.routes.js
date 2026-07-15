const express = require('express');
const router = express.Router();
const https = require('https');
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET / - list Test records for schoolId
router.get('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, subjectId } = req.query;
  const where = { schoolId };
  if (classId) where.classId = parseInt(classId);
  if (subjectId) where.subjectId = parseInt(subjectId);

  const papers = await prisma.test.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const classes  = await prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } });
  const subjects = await prisma.subject.findMany({ where: { schoolId }, select: { id: true, name: true } });
  const classMap   = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

  const result = papers.map(p => {
    let questions = [];
    // testType may hold JSON questions if it starts with '['
    if (p.testType && p.testType.startsWith('[')) {
      try { questions = JSON.parse(p.testType); } catch { questions = []; }
    }
    return {
      ...p,
      paperType: p.testType && !p.testType.startsWith('[') ? p.testType : 'Written',
      className:   p.classId   ? classMap[p.classId]   : null,
      subjectName: p.subjectId ? subjectMap[p.subjectId] : null,
      questions,
    };
  });

  res.json({ success: true, data: result });
}));

// POST / - create Test
router.post('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, subjectId, title, totalMarks, type, questions } = req.body;

  if (!title) return res.status(400).json({ success: false, message: 'title required.' });

  // Encode both type and questions into testType field
  const testTypeValue = questions && questions.length > 0
    ? JSON.stringify(questions)
    : (type || 'Written');

  const paper = await prisma.test.create({
    data: {
      schoolId,
      classId:    classId    ? parseInt(classId)    : null,
      subjectId:  subjectId  ? parseInt(subjectId)  : null,
      title,
      totalMarks: totalMarks ? parseInt(totalMarks) : 100,
      testType:   testTypeValue,
    },
  });

  res.status(201).json({ success: true, data: paper });
}));

// GET /:id - single
router.get('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const paper = await prisma.test.findFirst({
    where: { id: parseInt(req.params.id), schoolId },
  });
  if (!paper) return res.status(404).json({ success: false, message: 'Not found.' });

  let questions = [];
  if (paper.testType && paper.testType.startsWith('[')) {
    try { questions = JSON.parse(paper.testType); } catch { questions = []; }
  }

  res.json({ success: true, data: { ...paper, questions } });
}));

// PUT /:id - update
router.put('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const existing = await prisma.test.findFirst({ where: { id: parseInt(req.params.id), schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });

  const { classId, subjectId, title, totalMarks, type, questions } = req.body;
  const testTypeValue = questions && questions.length > 0
    ? JSON.stringify(questions)
    : (type || existing.testType);

  const updated = await prisma.test.update({
    where: { id: parseInt(req.params.id) },
    data: {
      ...(classId   !== undefined && { classId:    classId   ? parseInt(classId)   : null }),
      ...(subjectId !== undefined && { subjectId:  subjectId ? parseInt(subjectId) : null }),
      ...(title      && { title }),
      ...(totalMarks !== undefined && { totalMarks: parseInt(totalMarks) }),
      testType: testTypeValue,
    },
  });
  res.json({ success: true, data: updated });
}));

// DELETE /:id
router.delete('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const existing = await prisma.test.findFirst({ where: { id: parseInt(req.params.id), schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });
  await prisma.test.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true, message: 'Deleted.' });
}));

// POST /generate-ai - AI question generation
router.post('/generate-ai', wrap(async (req, res) => {
  const { subject, className, topic, numQuestions = 5 } = req.body;
  if (!subject || !className || !topic) {
    return res.status(400).json({ success: false, message: 'subject, className, topic required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const samples = Array.from({ length: parseInt(numQuestions) }, (_, i) => ({
      text:    `Sample question ${i + 1} about ${topic} for ${subject} class ${className}?`,
      type:    i % 2 === 0 ? 'mcq' : 'short',
      marks:   2,
      options: i % 2 === 0 ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined,
      answer:  i % 2 === 0 ? 'Option A' : `Answer ${i + 1}`,
    }));
    return res.json({ success: true, data: samples });
  }

  const prompt = `Generate ${numQuestions} exam questions for ${subject} class ${className} on topic: ${topic}. Return ONLY a JSON array: [{text,type,marks,options(if mcq),answer}]`;
  const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path:     `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    method:   'POST',
    headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  };

  const geminiResponse = await new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    request.on('error', reject);
    request.write(body);
    request.end();
  });

  const text = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  let questions = [];
  if (jsonMatch) {
    try { questions = JSON.parse(jsonMatch[0]); } catch { questions = []; }
  }

  res.json({ success: true, data: questions });
}));

module.exports = router;
