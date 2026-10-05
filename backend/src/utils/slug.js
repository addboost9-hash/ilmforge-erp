/**
 * A school's slug is its web name: the part of every public link that says
 * which school the page belongs to (ilmforge-erp.vercel.app/s/<slug>).
 *
 * Registration used to append a timestamp and random hex to every slug
 * ("future-foundation-school-mg2x4k1p-3fa9c1"), which is unique but not
 * something a school can print on a banner. New schools now get the plain
 * name, with -2, -3 ... only when it is already taken, and a school can
 * choose its own from Portal Links.
 */

/* Words a school may not take, because they are (or may become) app paths. */
const RESERVED = new Set([
  'admin', 'api', 'app', 'apply', 'apply-admission', 'assets', 'dashboard', 'fee-voucher', 'fees',
  'help', 'ilmforge', 'login', 'logout', 'manual', 'platform', 'platform-control', 'portal',
  'public', 'register', 's', 'school', 'settings', 'setup', 'static', 'support', 'www',
]);

const MIN = 3;
const MAX = 40;

/** "Future Foundation School (Lahore)" -> "future-foundation-school-lahore" */
const slugify = (text) => String(text || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, MAX)
  .replace(/-+$/g, '');

/** An error message a school office can act on, or null when the slug is usable. */
const validateSlug = (slug) => {
  const s = String(slug || '');
  if (s.length < MIN) return `Use at least ${MIN} characters.`;
  if (s.length > MAX) return `Use at most ${MAX} characters.`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) {
    return 'Use only small letters, numbers and single dashes, e.g. future-foundation-lahore.';
  }
  if (RESERVED.has(s)) return 'That name is reserved by IlmForge. Please choose another.';
  return null;
};

/**
 * Candidates in the order a new school should try them:
 * "future-foundation", "future-foundation-2", ... "future-foundation-30".
 */
const candidates = (base, count = 30) => {
  let b = slugify(base);
  if (!b || b.length < MIN || RESERVED.has(b)) b = `${b || 'school'}-school`.replace(/^-/, '');
  return Array.from({ length: count }, (_, i) => (i === 0 ? b : `${b.slice(0, MAX - 3)}-${i + 1}`));
};

/** First candidate not already used by another school. */
const freeSlug = async (prisma, base) => {
  const list = candidates(base);
  const taken = await prisma.school.findMany({ where: { slug: { in: list } }, select: { slug: true } });
  const used = new Set(taken.map((t) => t.slug));
  return list.find((s) => !used.has(s)) || `${list[0].slice(0, MAX - 9)}-${Date.now().toString(36).slice(-8)}`;
};

module.exports = { slugify, validateSlug, candidates, freeSlug, RESERVED, MIN, MAX };
