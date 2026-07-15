const express = require('express');
const router = express.Router();
const https = require('https');
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// POST /generate-ai — MUST be before /:id routes
router.post('/generate-ai', wrap(async (req, res) => {
  const { subject, className, topic, numQuestions = 5, difficulty, questionTypes } = req.body;
  if (!subject || !className || !topic) {
    return res.status(400).json({ success: false, message: 'subject, className, topic required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const n = Math.min(Math.max(parseInt(numQuestions) || 5, 1), 50);
    const samples = Array.from({ length: n }, (_, i) => ({
      text:    `Q${i + 1}: Sample question about ${topic} for ${subject} (${className})?`,
      type:    i % 3 === 0 ? 'mcq' : i % 3 === 1 ? 'short' : 'long',
      marks:   i % 3 === 0 ? 1 : i % 3 === 1 ? 3 : 5,
      options: i % 3 === 0 ? [`Option A about ${topic}`, `Option B about ${topic}`, `Option C about ${topic}`, `Option D about ${topic}`] : undefined,
      answer:  i % 3 === 0 ? `Option A about ${topic}` : `Sample answer ${i + 1}`,
    }));
    return res.json({ success: true, data: samples });
  }

  const n = Math.min(Math.max(parseInt(numQuestions) || 5, 1), 50);
  const diff = difficulty || 'Medium';
  const prompt = `Generate exactly ${n} exam questions for ${subject}, class ${className}, topic: "${topic}", difficulty: ${diff}.
Return ONLY a valid JSON array (no markdown, no explanation):
[{"text":"question text","type":"mcq|short|long","marks":number,"options":["A","B","C","D"],"answer":"correct"}]
For MCQ, include 4 options and the correct answer. For short/long questions omit options.`;

  const bodyStr = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path:     `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    method:   'POST',
    headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
  };

  const geminiResponse = await new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    request.on('error', reject);
    request.write(bodyStr);
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

// GET / - list question papers
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
    let paperType = p.testType;
    // testType stores JSON array of questions OR a plain type string
    if (p.testType && p.testType.startsWith('[')) {
      try { questions = JSON.parse(p.testType); paperType = 'Custom'; } catch { questions = []; }
    }
    return {
      ...p,
      paperType,
      className:   p.classId   ? classMap[p.classId]   : null,
      subjectName: p.subjectId ? subjectMap[p.subjectId] : null,
      questions,
    };
  });

  res.json({ success: true, data: result });
}));

// POST / - create question paper
router.post('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, subjectId, title, totalMarks, type, questions } = req.body;

  if (!title) return res.status(400).json({ success: false, message: 'title required.' });

  // Store questions as JSON array in testType, or store the paper type string
  const testTypeValue = (questions && questions.length > 0)
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

  // Return with parsed questions
  let parsedQuestions = [];
  if (paper.testType && paper.testType.startsWith('[')) {
    try { parsedQuestions = JSON.parse(paper.testType); } catch { parsedQuestions = []; }
  }

  res.status(201).json({ success: true, data: { ...paper, questions: parsedQuestions, paperType: paper.testType.startsWith('[') ? (type || 'Custom') : paper.testType } });
}));

// GET /:id - single paper
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
  const testTypeValue = (questions && questions.length > 0)
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

module.exports = router;
