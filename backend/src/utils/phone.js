/**
 * One canonical form for Pakistani mobile numbers, plus every variant worth
 * matching on lookup.
 *
 * The same number reaches us as 03481200001, 923481200001 or +923481200001
 * depending on which screen typed it. Storing it verbatim meant two siblings
 * admitted through different screens produced TWO parent accounts for one
 * real parent — so that parent saw only some of their children, and which
 * account a phone login landed on depended on the format they typed.
 */

/** Digits only, last 10 — the stable identity of a PK mobile (3XXXXXXXXX). */
const core = (raw) => {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  return d.slice(-10);
};

/** Canonical stored form: E.164, e.g. +923481200001. Empty string if unusable. */
const canonical = (raw) => {
  const c = core(raw);
  return c.length === 10 ? `+92${c}` : '';
};

/** Every form the same number might already be stored as, for OR lookups. */
const variants = (raw) => {
  const c = core(raw);
  if (c.length !== 10) {
    const t = String(raw || '').trim();
    return t ? [t] : [];
  }
  return [...new Set([
    `+92${c}`,   // E.164
    `92${c}`,    // country code, no plus
    `0${c}`,     // local
    c,           // bare
    String(raw || '').trim(), // exactly as supplied
  ])].filter(Boolean);
};

/** True when two inputs are the same real number regardless of formatting. */
const same = (a, b) => {
  const ca = core(a), cb = core(b);
  return Boolean(ca) && ca === cb;
};

module.exports = { core, canonical, variants, same };
