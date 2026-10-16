/**
 * The wording of messages to parents and staff, as the school set it on
 * Settings → SMS Templates (School.settingsJson.smsTemplates).
 *
 * That page saved its templates but nothing read them: every message went
 * out in built-in words, some signed "IlmForge" instead of the school.
 * messageFor() gives the school's own text with its {placeholders} filled
 * in, the built-in text when the school has not changed it, or null when the
 * school switched that message off.
 */
const prisma = require('../config/prisma');

async function savedTemplate(schoolId, id) {
  if (!schoolId) return null;
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { settingsJson: true } });
  let settings = {};
  try { settings = JSON.parse(school?.settingsJson || '{}') || {}; } catch { settings = {}; }
  const list = Array.isArray(settings.smsTemplates) ? settings.smsTemplates : [];
  return list.find((t) => t && t.id === id) || null;
}

/* {name} and {{name}} both work: the SMS Templates page uses the first, the
   automation templates the second. A placeholder with no value is left out
   rather than sent to a parent as "{roll_id}". */
function fill(text, vars = {}) {
  return String(text || '').replace(/\{\{?\s*(\w+)\s*\}?\}/g, (_, key) => {
    const v = vars[key] ?? vars[key.toLowerCase()];
    return v === undefined || v === null ? '' : String(v);
  });
}

async function messageFor(schoolId, id, vars, builtIn) {
  const t = await savedTemplate(schoolId, id);
  if (t && t.enabled === false) return null;
  if (t && String(t.message || '').trim()) return fill(t.message, vars);
  return fill(builtIn, vars);
}

/* A Pakistan calendar day as "16 Oct 2026" (the server runs on UTC, where
   a school day's midnight is still the day before). */
const pkDate = (d) => new Date(new Date(d).getTime() + 5 * 3600 * 1000)
  .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

module.exports = { messageFor, fill, savedTemplate, pkDate };
