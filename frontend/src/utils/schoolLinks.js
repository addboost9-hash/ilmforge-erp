/**
 * A school's public links, and which school a public page belongs to.
 *
 * Every school has a web name (its slug). Its pages live under it:
 *   /s/<slug>          the school's own page
 *   /s/<slug>/apply    online admission form
 *   /s/<slug>/fees     fee slip download
 *   /login?slug=<slug> sign-in, branded for the school
 *
 * A public page reads the slug from its address first. The browser's
 * remembered school is only a fallback for the old /apply-admission and
 * /fee-voucher addresses, because on a parent's phone there is nothing
 * remembered and the page must not guess.
 */
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

const KEY = 'schoolSlug';

export function rememberedSlug() {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}

/** Keep the school's name and logo for its sign-in page on this device. */
export function rememberSchool(school) {
  if (!school?.slug) return;
  try {
    localStorage.setItem(KEY, school.slug);
    localStorage.setItem('registeredSchoolName', school.name || '');
    // Another school's logo must never stay behind on a shared computer.
    if (school.logoUrl) localStorage.setItem('schoolLogoPreview', school.logoUrl);
    else localStorage.removeItem('schoolLogoPreview');
    if (school.brand?.primary) localStorage.setItem('brandPrimaryColor', school.brand.primary);
  } catch { /* private mode: the page still works, it just is not remembered */ }
}

export function schoolLinks(slug, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  const s = encodeURIComponent(slug || '');
  return {
    home: `${origin}/s/${s}`,
    apply: `${origin}/s/${s}/apply`,
    fees: `${origin}/s/${s}/fees`,
    login: `${origin}/login?slug=${s}`,
    loginAs: (role) => `${origin}/login?slug=${s}&role=${encodeURIComponent(role)}`,
  };
}

/** Same rules as the server (backend/src/utils/slug.js), for instant feedback. */
export function slugProblem(slug) {
  const s = String(slug || '');
  if (s.length < 3) return 'Use at least 3 characters.';
  if (s.length > 40) return 'Use at most 40 characters.';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return 'Use only small letters, numbers and single dashes.';
  return null;
}

export const toSlug = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/** The school a public page belongs to: /s/<slug>, then ?slug=, then this device's school. */
export function useSchoolSlug({ allowRemembered = true } = {}) {
  const params = useParams();
  const [search] = useSearchParams();
  const fromUrl = params.slug || search.get('slug') || '';
  return { slug: (fromUrl || (allowRemembered ? rememberedSlug() : '')).toLowerCase(), fromUrl: !!fromUrl };
}

/** Name, logo, brand colours, campuses and classes of a school, by slug. */
export function usePublicSchool(slug) {
  return useQuery({
    queryKey: ['public-school', slug],
    queryFn: () => api.get(`/public/school/${encodeURIComponent(slug)}`).then((r) => r.data.data),
    enabled: !!slug,
    retry: false,
    staleTime: 5 * 60_000,
  });
}
