/**
 * Ending a sign-in on this device.
 *
 * Signing out used to call localStorage.clear(), which also threw away
 * things that belong to the device or survive the sign-in: the school's
 * branding and web name (so the sign-in page lost its school), and saves
 * still waiting for the internet (attendance marked offline). It left
 * behind the opposite: the service worker's offline copies of the previous
 * user's data, which the next person on a shared office computer could be
 * shown while offline.
 */

/* Kept across sign-outs. */
const KEEP_KEYS = [
  'schoolLogoPreview', 'brandPrimaryColor', 'brandSidebarColor', 'registeredSchoolName',
  'brandTagline', 'brandMotto', 'schoolSlug',
];
/* ilm.* = per-user conveniences and waiting saves (each tagged with its user). */
const KEEP_PREFIXES = ['ilm.'];

/** Offline copies of server data (service worker cache): never outlive a sign-in. */
export async function clearOfflineData() {
  try {
    if (typeof caches !== 'undefined') await caches.delete('api-cache');
  } catch { /* not supported or blocked: nothing to clear */ }
}

export function clearSession() {
  const keep = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (KEEP_KEYS.includes(k) || KEEP_PREFIXES.some((p) => k.startsWith(p))) keep[k] = localStorage.getItem(k);
    }
    localStorage.clear();
    Object.entries(keep).forEach(([k, v]) => localStorage.setItem(k, v));
  } catch { /* storage blocked */ }
  return clearOfflineData();
}
