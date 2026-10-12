/**
 * Reads a filled paper admission form (a phone photo, a scan or a PDF, or the
 * details pasted as text) and returns the admission wizard's fields, so the
 * office checks and corrects instead of typing everything again.
 *
 *   readAdmissionForm({ files: [dataUrl], text }) -> { fields, unclear, provider }
 *
 * Handwriting needs a model that can read images. Claude is used when
 * ANTHROPIC_API_KEY is set, otherwise Gemini (GEMINI_API_KEY, which the
 * lesson-plan helper already uses). FORM_READER_MODEL overrides the model.
 * Whatever comes back is cleaned by cleanFields(): unknown keys are dropped,
 * dates, CNICs, phones and blood groups are put in the forms the rest of the
 * app stores, and anything that does not fit is left for a person to fill in.
 */

const ANTHROPIC_URL = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
const GEMINI_URL = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
const TIMEOUT_MS = 90_000;

/* The fields of the admission form, as the printed form labels them. */
const FIELDS = {
  name: "Student's full name in English (Full Name (English))",
  firstNameUrdu: "Student's name written in Urdu script, if given",
  gender: 'Gender: Male or Female',
  dob: 'Date of birth',
  admissionDate: 'Admission date, if filled in',
  className: 'Class applied for (e.g. Nursery, KG, Prep, 1, 5, 9th)',
  sectionName: 'Section, if written (e.g. A, B)',
  religion: 'Religion',
  nationality: 'Nationality',
  caste: 'Caste',
  bFormNo: "Student's B-Form number (13 digits)",
  familyNo: 'Family number',
  address: 'Permanent address',
  city: 'City',
  province: 'Province',
  postalAddress: 'Postal address',
  fatherName: "Father's full name",
  fatherNameUrdu: "Father's name in Urdu script",
  fatherCnic: "Father's CNIC (13 digits)",
  fatherOccupation: "Father's occupation",
  fatherQualification: "Father's qualification",
  emergencyPhone: 'Parent mobile / WhatsApp number',
  motherName: "Mother's full name",
  motherCnic: "Mother's CNIC (13 digits)",
  motherOccupation: "Mother's occupation",
  motherQualification: "Mother's qualification",
  motherPhone: "Mother's mobile number",
  email: 'Email address',
  prevSchoolName: 'Previous school name',
  prevAdmissionNo: 'Admission number at the previous school',
  prevSchoolAddress: 'Previous school address',
  prevSchoolPhone: 'Previous school contact number',
  prevSchoolFocalPerson: 'Focal / contact person at the previous school',
  prevGrade: 'Previous grade / last class passed',
  prevTestGrade: 'Grade or result in the last test',
  admissionTestMarks: 'Admission test marks (a number), if the office filled it in',
  bloodGroup: 'Blood group',
  foodDietaryReq: 'Food / dietary needs',
  allergies: 'Allergies / major illness',
  childCondition: 'Condition of the child (medical notes)',
};
const KEYS = Object.keys(FIELDS);

const INSTRUCTIONS = `You are reading a filled admission form of a school in Pakistan. It may be handwritten or typed, in English or Urdu, photographed at an angle, and may span several pages. The printed form has these sections: Student Information, Guardian Information, Previous School, Medical Information, Transport, Siblings.

Copy what is written into the fields. Rules:
- Copy values exactly as written; do not invent, guess or complete anything. Leave a field out when it is blank, crossed out or not on the form.
- If a value is hard to read, give your best reading AND list the field name in "unclear".
- Dates in Pakistan are written day first (14/03/2017 is 14 March 2017). Give dates as YYYY-MM-DD.
- CNIC and B-Form numbers: 13 digits, give them as 12345-1234567-1.
- Phone numbers: digits as written (e.g. 03001234567).
- Gender: Male or Female.
- Names in Urdu script go only in the "...Urdu" fields; English names in the others.
- Ignore the school's own letterhead, printed labels, photo box and signatures.`;

/* JSON schema shared by both providers. */
const SCHEMA = {
  type: 'object',
  properties: {
    ...Object.fromEntries(KEYS.map((k) => [k, { type: 'string', description: FIELDS[k] }])),
    unclear: { type: 'array', items: { type: 'string' }, description: 'Names of the fields above that were hard to read' },
    notes: { type: 'string', description: 'Anything the office should know, e.g. a page seems missing. Short.' },
  },
};

const fail = (msg, status = 400) => { const e = new Error(msg); e.status = status; return e; };

/* ── Uploads ─────────────────────────────────────────────────────── */
const MEDIA = { 'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/gif': 'image', 'application/pdf': 'pdf' };
const MAX_FILES = 6;
const MAX_TOTAL_BYTES = 9 * 1024 * 1024;

function parseFiles(files) {
  const list = Array.isArray(files) ? files : [];
  if (list.length > MAX_FILES) throw fail(`Send at most ${MAX_FILES} pages at a time.`);
  let total = 0;
  return list.map((f, i) => {
    const raw = typeof f === 'string' ? f : f?.data;
    const m = /^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(raw || ''));
    if (!m || !MEDIA[m[1].toLowerCase()]) throw fail(`Page ${i + 1} is not a photo (JPG, PNG, WebP) or a PDF.`);
    const data = m[2].replace(/\s/g, '');
    total += Math.floor(data.length * 0.75);
    if (total > MAX_TOTAL_BYTES) throw fail('The pages are too large together (9 MB at most). Take the photos a little further away or send fewer pages.');
    return { mime: m[1].toLowerCase(), kind: MEDIA[m[1].toLowerCase()], data };
  });
}

/* ── Cleaning what the model returns ─────────────────────────────── */
const text = (v, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function dateValue(v) {
  const s = text(v, 30);
  let y, m, d, x;
  if ((x = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) [y, m, d] = [+x[1], +x[2], +x[3]];
  else if ((x = /^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{2,4})$/.exec(s))) {
    [d, m, y] = [+x[1], +x[2], +x[3]];
    if (y < 100) y += y > 50 ? 1900 : 2000;
  } else return '';
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function cnicValue(v) {
  const d = String(v ?? '').replace(/\D/g, '');
  return d.length === 13 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : '';
}

function phoneValue(v) {
  const d = String(v ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('92')) return `0${d.slice(2)}`;
  if (d.length === 11 && d.startsWith('0')) return d;
  if (d.length === 10 && d.startsWith('3')) return `0${d}`;
  return '';
}

function bloodValue(v) {
  const s = text(v, 20).toUpperCase().replace(/\s+/g, '')
    .replace(/POSITIVE|POS|\+VE$/, '+').replace(/NEGATIVE|NEG|-VE$/, '-');
  return /^(A|B|AB|O)[+-]$/.test(s) ? s : '';
}

function genderValue(v) {
  const s = text(v, 20).toLowerCase();
  if (/^(m|male|boy|son|larka|لڑکا)$/.test(s)) return 'Male';
  if (/^(f|female|girl|daughter|larki|لڑکی)$/.test(s)) return 'Female';
  return '';
}

/**
 * Keep known fields only, in the forms the app stores. A value that is
 * present but cannot be put right (a 12-digit CNIC, a date that does not
 * exist) is dropped and its field added to `unclear`, so the office sees
 * which boxes to fill in by hand.
 */
function cleanFields(raw = {}) {
  const fields = {};
  const unclear = new Set((Array.isArray(raw.unclear) ? raw.unclear : []).filter((k) => KEYS.includes(k)));
  const put = (k, val, given) => { if (val) fields[k] = val; else if (given) unclear.add(k); };

  for (const k of KEYS) {
    const given = text(raw[k], 300);
    if (!given || /^(n\/?a|nil|none|-+|—)$/i.test(given)) continue;
    switch (k) {
      case 'dob': case 'admissionDate': put(k, dateValue(given), given); break;
      case 'bFormNo': case 'fatherCnic': case 'motherCnic': put(k, cnicValue(given), given); break;
      case 'emergencyPhone': case 'motherPhone': put(k, phoneValue(given), given); break;
      case 'bloodGroup': put(k, bloodValue(given), given); break;
      case 'gender': put(k, genderValue(given), given); break;
      case 'email': put(k, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(given) ? given.toLowerCase() : '', given); break;
      case 'admissionTestMarks': put(k, /^\d{1,4}(\.\d+)?$/.test(given) ? given : '', given); break;
      case 'address': case 'postalAddress': case 'prevSchoolAddress':
      case 'foodDietaryReq': case 'allergies': case 'childCondition':
        fields[k] = given.slice(0, 300); break;
      default: fields[k] = given.slice(0, 120);
    }
  }
  // A future date of birth or admission is a misreading.
  const today = new Date().toISOString().slice(0, 10);
  for (const k of ['dob', 'admissionDate']) if (fields[k] && fields[k] > today) { delete fields[k]; unclear.add(k); }

  return { fields, unclear: [...unclear], notes: text(raw.notes, 300) };
}

/* ── Providers ───────────────────────────────────────────────────── */
async function post(url, headers, body) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctl.signal });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      const why = json?.error?.message || `status ${r.status}`;
      console.error('[form-reader]', r.status, why);
      if (r.status === 401 || r.status === 403) throw fail('The AI key on the server was refused. Check ANTHROPIC_API_KEY / GEMINI_API_KEY.', 502);
      if (r.status === 429) throw fail('The form reader is busy. Wait a minute and try again.', 503);
      throw fail('The form could not be read just now. Try again, or type it in.', 502);
    }
    return json;
  } catch (e) {
    if (e.name === 'AbortError') throw fail('Reading the form took too long. Try a clearer photo or fewer pages.', 504);
    if (e.status) throw e;
    console.error('[form-reader]', e.message);
    throw fail('The form reader could not be reached. Check the internet connection and try again.', 502);
  } finally {
    clearTimeout(timer);
  }
}

async function viaClaude(pages, pasted) {
  const content = pages.map((p) => (p.kind === 'pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: p.data } }
    : { type: 'image', source: { type: 'base64', media_type: p.mime, data: p.data } }));
  if (pasted) content.push({ type: 'text', text: `The details as sent by the parent:\n"""\n${pasted}\n"""` });
  content.push({ type: 'text', text: 'Fill in the admission_form tool with what this form says.' });
  const json = await post(`${ANTHROPIC_URL}/v1/messages`, {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  }, {
    model: process.env.FORM_READER_MODEL || 'claude-opus-5-5',
    max_tokens: 4096,
    system: INSTRUCTIONS,
    tools: [{ name: 'admission_form', description: 'The fields read from the admission form.', input_schema: SCHEMA }],
    tool_choice: { type: 'tool', name: 'admission_form' },
    messages: [{ role: 'user', content }],
  });
  const use = (json.content || []).find((c) => c.type === 'tool_use');
  if (!use) throw fail('The form could not be read. Try a clearer photo.', 502);
  return use.input || {};
}

async function viaGemini(pages, pasted) {
  const model = process.env.FORM_READER_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const parts = pages.map((p) => ({ inline_data: { mime_type: p.mime, data: p.data } }));
  if (pasted) parts.push({ text: `The details as sent by the parent:\n"""\n${pasted}\n"""` });
  parts.push({ text: `${INSTRUCTIONS}\n\nAnswer with one JSON object using only these keys (leave out empty ones): ${KEYS.join(', ')}, unclear (array of key names), notes.` });
  const json = await post(`${GEMINI_URL}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {}, {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 },
  });
  const out = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  try { return JSON.parse(out.replace(/^```(json)?|```$/g, '').trim()); } catch { throw fail('The form could not be read. Try a clearer photo.', 502); }
}

function provider() {
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return null;
}

async function readAdmissionForm({ files, text: pastedText } = {}) {
  const pages = parseFiles(files);
  const pasted = text(pastedText, 6000);
  if (!pages.length && !pasted) throw fail('Choose a photo or scan of the filled form, or paste its details.');
  const which = provider();
  if (!which) {
    throw fail('Reading paper forms is not switched on for this school yet: the server needs an AI key (ANTHROPIC_API_KEY or GEMINI_API_KEY). Ask your IlmForge administrator.', 503);
  }
  const raw = which === 'claude' ? await viaClaude(pages, pasted) : await viaGemini(pages, pasted);
  return { ...cleanFields(raw), provider: which };
}

module.exports = { readAdmissionForm, cleanFields, parseFiles, FIELDS, provider };
