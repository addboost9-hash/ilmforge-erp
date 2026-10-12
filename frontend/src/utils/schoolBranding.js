/**
 * The school's name, logo and address as printed documents use them.
 *
 * About forty print screens (ID cards, certificates, reports, vouchers) read
 * the school's identity from this browser's storage. Sign-in stored the name
 * there but never the logo, so on any computer other than the one the logo
 * was first chosen on, every card and certificate printed without it; and the
 * logo kept across sign-outs, so a second school using the same computer got
 * the first school's logo on its cards.
 *
 * syncSchoolBranding(school) makes this browser's copy match the school's
 * saved record. It runs at sign-in, when the app opens, and after the school
 * profile is saved.
 */

const set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage full or blocked */ } };
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const drop = (k) => { try { localStorage.removeItem(k); } catch { /* blocked */ } };

/** Which school the stored branding belongs to. */
const OWNER = 'brandSchoolId';

export function syncSchoolBranding(school) {
  if (!school?.id) return;
  const sameSchool = String(get(OWNER) || '') === String(school.id)
    // Saved before the owner was recorded: trust it only for the same name.
    || (!get(OWNER) && get('registeredSchoolName') === school.name);

  if (school.name) {
    set('registeredSchoolName', school.name);
    set('schoolName', school.name);
  }
  if (school.logoUrl) set('schoolLogoPreview', school.logoUrl);
  // No logo on the record: an older version may have kept this school's logo
  // only in this browser, so keep that; another school's logo must go.
  else if (!sameSchool) drop('schoolLogoPreview');

  const address = [school.address, school.city].filter(Boolean).join(', ');
  if (address) set('schoolAddress', address); else if (!sameSchool) drop('schoolAddress');
  if (school.phone) set('schoolPhone', school.phone); else if (!sameSchool) drop('schoolPhone');
  set(OWNER, String(school.id));
}

/** The school's logo for a document: the saved record first, then this browser's copy. */
export const schoolLogoOf = (school) => school?.logoUrl || get('schoolLogoPreview') || '';

/** True when the only copy of the logo is in this browser (an older version saved it there). */
export const logoOnlyInBrowser = (school) => !school?.logoUrl && !!get('schoolLogoPreview');
