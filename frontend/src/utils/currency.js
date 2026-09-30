/**
 * IlmForge — money.
 *
 * Every monetary column in the database is stored in PAISA as an integer:
 * a Rs 3,500 fee is 350000, a Rs 50,000 expense is 5000000. Integers avoid
 * the rounding drift that floating-point rupees would accumulate across a
 * year of fee collection.
 *
 * The rule is therefore simple and has no exceptions: divide by 100 to show
 * a figure, multiply by 100 to store one. Pages that skipped the conversion
 * displayed every amount a hundred times too large.
 */

/** Stored paisa -> rupees, as a number. */
export const fromPaisa = (paisa) => Number(paisa || 0) / 100;

/** Rupees the user typed -> paisa to store. Rounded, never truncated. */
export const toPaisa = (rupees) => Math.round(Number(rupees || 0) * 100);

/** Stored paisa -> "Rs. 3,500" for display. */
export const money = (paisa) =>
  'Rs. ' + fromPaisa(paisa).toLocaleString('en-PK', { maximumFractionDigits: 2 });

/** Same, without the prefix — for table cells that already have a header. */
export const amount = (paisa) =>
  fromPaisa(paisa).toLocaleString('en-PK', { maximumFractionDigits: 2 });

/** For a number input bound to a rupee value. Avoids "3500.0000001". */
export const rupeesInput = (paisa) => {
  const r = fromPaisa(paisa);
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
};

/**
 * Compact Pakistani money for dashboard headlines:
 *   Rs 85,000  ·  Rs 4.2 lakh  ·  Rs 1.25 crore
 *
 * Full precision below a lakh, because "Rs 0.85 lakh" is harder to read than
 * the real figure. Above it, scale words beat six digits of noise on a card.
 */
export const moneyShort = (paisa) => {
  const r = fromPaisa(paisa);
  const neg = r < 0;
  const a = Math.abs(r);
  let out;
  if (a >= 10000000) out = `Rs ${trim(a / 10000000)} crore`;
  else if (a >= 100000) out = `Rs ${trim(a / 100000)} lakh`;
  else out = `Rs ${Math.round(a).toLocaleString('en-PK')}`;
  return neg ? '-' + out : out;
};

// Two decimals at most, and no trailing ".00" - "Rs 4 lakh", not "Rs 4.00 lakh".
const trim = (n) => {
  const s = n.toFixed(2);
  return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};
