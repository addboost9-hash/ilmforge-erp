/**
 * Which class a folder (or any typed class name) means, however it is
 * written: "Class Five", "class 5", "5th", "Grade 5", "Class V" and "Five"
 * are all the class IlmForge calls "Class 5"; "PG" is Play Group.
 *
 *   classKey('Class Five') === classKey('Class 5')   // '5'
 *   placeFromPath('All/Class Five/Ali Raza.jpg', classes)
 *     -> { classId, sectionId, folder: 'Class Five' } or { folder, classId: null }
 */

const WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
};
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
const NOISE = new Set(['class', 'grade', 'std', 'standard', 'level']);
const ALIAS = {
  pg: 'playgroup', 'play group': 'playgroup', play: 'playgroup', 'play grp': 'playgroup',
  kindergarten: 'kg', 'k g': 'kg', kindergarden: 'kg',
  preparatory: 'prep', 'pre prep': 'preprep',
  nur: 'nursery', nurs: 'nursery',
};

export function classKey(name) {
  const raw = String(name || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    .replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1');
  const words = raw.split(' ').filter(Boolean);
  const out = [];
  words.forEach((w, i) => {
    if (NOISE.has(w)) return;
    if (WORDS[w] !== undefined) { out.push(String(WORDS[w])); return; }
    // "Class V": a Roman number only right after "class"/"grade", so a
    // section called "V" is not taken for 5.
    if (ROMAN[w] !== undefined && i > 0 && NOISE.has(words[i - 1])) { out.push(String(ROMAN[w])); return; }
    out.push(w);
  });
  const key = out.join(' ');
  return ALIAS[key] || key;
}

/* The class (and section) a photo's folders name: "Class Five/Ali.jpg",
   "Class Five/A/Ali.jpg" or "Class Five A/Ali.jpg". folder is the folder
   the photo is in (shown when it names no class). */
export function placeFromPath(path, classes) {
  const parts = String(path || '').split('/').slice(0, -1);
  const folder = parts[parts.length - 1] || '';
  const byKey = (k) => classes.find((c) => classKey(c.name) === k);
  for (let i = parts.length - 1; i >= 0; i--) {
    const k = classKey(parts[i]);
    const c = byKey(k);
    if (c) {
      const next = parts[i + 1];
      const sec = next ? c.sections.find((s) => classKey(s.name) === classKey(next)) : null;
      return { classId: c.id, sectionId: sec?.id || null, folder };
    }
    for (const x of classes) {
      for (const s of x.sections) {
        if (k === classKey(`${x.name} ${s.name}`)) return { classId: x.id, sectionId: s.id, folder };
      }
    }
  }
  return { classId: null, sectionId: null, folder };
}
