/**
 * School.settingsJson: a school's own lists and choices (fee types,
 * textbooks, message templates…) kept as one JSON blob.
 */
const prisma = require('../config/prisma');

async function readSettings(schoolId) {
  const s = await prisma.school.findUnique({ where: { id: schoolId }, select: { settingsJson: true } });
  try { return JSON.parse(s?.settingsJson || '{}') || {}; } catch { return {}; }
}

// Merge top-level keys into the blob; returns the whole blob.
async function mergeSettings(schoolId, patch) {
  const merged = { ...(await readSettings(schoolId)), ...patch, updatedAt: new Date().toISOString() };
  await prisma.school.update({ where: { id: schoolId }, data: { settingsJson: JSON.stringify(merged) } });
  return merged;
}

module.exports = { readSettings, mergeSettings };
