/**
 * Which class a folder (or any typed class name) means, however it is
 * written: "Class Five", "class 5", "5th", "Grade 5", "Class V" and "Five"
 * are all the class IlmForge calls "Class 5"; "PG" is Play Group.
 *
 *   classKey('Class Five') === classKey('Class 5')   // '5'
 *   placeFromPath('All/Class Five/Ali Raza.jpg', classes)
 *     -> { classId, sectionId, folder: 'Class Five' } or { folder, classId: null }
 *   classInName('9th Zaria khan', classes)
 *     -> { token: '9th', classId, sectionId, rest: 'Zaria khan' }
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

/* Words that are names as often as classes: "Nur Muhammad" is a boy, not
   Nursery. In a folder name they are classes; in a photo's name they are not. */
const NAME_LIKE = new Set(['nur', 'noor', 'nurs', 'play']);
const CLASS_LIKE = /^((class|grade)\s+)?\d{1,2}(st|nd|rd|th)?$/i;

/**
 * A class written in the photo's name, before or after the student's name
 * (a file name cannot hold "/", so the class goes into the name):
 * "9th Zaria khan", "Class Five Ali Raza", "9th A Zaria khan" (section A),
 * "Ali Raza 5th". Returns { token, classId, sectionId, rest }, with
 * classId null when the name holds a class this school does not have
 * ("11th"), or null when the name holds no class.
 */
export function classInName(text, classes) {
  const words = String(text || '').replace(/[_.]+/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length < 2) return null;
  const find = (part) => {
    if (NAME_LIKE.has(part.toLowerCase())) return null;
    const key = classKey(part);
    return key ? classes.find((c) => classKey(c.name) === key) || null : null;
  };
  const most = Math.min(3, words.length - 1);
  // At the start, the longest first ("Class Five" before "Class").
  for (let k = most; k >= 1; k--) {
    const token = words.slice(0, k).join(' ');
    const c = find(token);
    if (!c) continue;
    let rest = words.slice(k);
    let sec = null;
    if (rest.length >= 2) {
      sec = c.sections.find((s) => classKey(s.name) === classKey(rest[0])) || null;
      if (sec) rest = rest.slice(1);
    }
    return { token, classId: c.id, sectionId: sec?.id || null, rest: rest.join(' ') };
  }
  // At the end, only with a number or "class" in it ("Ali Raza 5th").
  for (let k = most; k >= 1; k--) {
    const token = words.slice(words.length - k).join(' ');
    if (!/\d|\b(class|grade)\b/i.test(token)) continue;
    const c = find(token);
    if (c) return { token, classId: c.id, sectionId: null, rest: words.slice(0, words.length - k).join(' ') };
  }
  // A class this school does not have: "11th Ali", "Ali Class 12".
  for (const k of [2, 1]) {
    if (words.length <= k) continue;
    const head = words.slice(0, k).join(' ');
    if (CLASS_LIKE.test(head)) return { token: head, classId: null, sectionId: null, rest: words.slice(k).join(' ') };
    const tail = words.slice(words.length - k).join(' ');
    if (CLASS_LIKE.test(tail)) return { token: tail, classId: null, sectionId: null, rest: words.slice(0, words.length - k).join(' ') };
  }
  return null;
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
