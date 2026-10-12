import { create } from 'zustand';
import api from '../api/client';
import { clearSession, clearOfflineData } from '../utils/session';
import { syncSchoolBranding } from '../utils/schoolBranding';

/* ── helpers ─────────────────────────────────────── */
const ls = (key, fallback = null) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const lsStr = (key, fallback = '') => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};

/* ── branding helper — apply CSS vars from stored prefs ── */
export function applyBranding() {
  const color = lsStr('brandPrimaryColor', '#0D9488');
  const sidebar = lsStr('brandSidebarColor', '#0D1117');
  try {
    document.documentElement.style.setProperty('--teal',  color);
    document.documentElement.style.setProperty('--brand-primary', color);
    document.documentElement.style.setProperty('--sidebar-bg', sidebar);
  } catch {}
}

/* A copy saved before the server stopped sending them may still hold the
   school's private settings (its WhatsApp gateway token) and licence key.
   Drop those from this browser on start-up. */
const storedSchool = () => {
  const school = ls('school');
  if (school && (school.settingsJson !== undefined || school.licenseKey !== undefined)) {
    const { settingsJson, licenseKey, licenseExpiry, ...safe } = school; // eslint-disable-line no-unused-vars
    try { localStorage.setItem('school', JSON.stringify(safe)); } catch { /* ignore */ }
    return safe;
  }
  return school;
};

/* ── store ───────────────────────────────────────── */
const useAuthStore = create((set) => ({
  user:            ls('user'),
  school:          storedSchool(),
  isAuthenticated: !!lsStr('accessToken'),
  isLoading:       false,
  error:           null,

  /* branding — persisted in localStorage */
  branding: {
    logo:         lsStr('schoolLogoPreview', ''),
    primaryColor: lsStr('brandPrimaryColor', '#0D9488'),
    schoolName:   lsStr('registeredSchoolName', ''),
    tagline:      lsStr('brandTagline', ''),
    motto:        lsStr('brandMotto', ''),
  },

  /* login ───────────────────────── */
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', credentials);
      const { accessToken, refreshToken, user: loggedInUser, school, mustChangePassword } = data.data;
      // mustChangePassword travels as a top-level login response field (not
      // nested in the user object) — fold it into the stored user so route
      // guards can gate on it. The backend has tracked/returned this flag
      // correctly all along; nothing in the frontend ever read it.
      const user = { ...loggedInUser, mustChangePassword: !!mustChangePassword };
      // A new sign-in starts with no offline copies of anyone else's data
      // (the last person may have closed the browser without signing out).
      clearOfflineData();
      localStorage.setItem('accessToken',  accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user',   JSON.stringify(user));
      localStorage.setItem('school', JSON.stringify(school));
      // Store campusId — prefer main campus, fall back to first campus
      const mainCampus = school?.campuses?.find(c => c.isMain) || school?.campuses?.[0];
      if (mainCampus?.id) {
        localStorage.setItem('campusId', mainCampus.id);
      }
      // Store slug for public fee voucher URL
      if (school?.slug) {
        localStorage.setItem('schoolSlug', school.slug);
      }
      // The school's name, logo and address for every printed document:
      // the logo used to stay behind on the computer it was chosen on.
      syncSchoolBranding(school);
      applyBranding();
      set({
        user, school,
        isAuthenticated: true,
        isLoading: false,
        branding: {
          logo:         lsStr('schoolLogoPreview', ''),
          primaryColor: lsStr('brandPrimaryColor', '#0D9488'),
          schoolName:   school?.name || '',
          tagline:      lsStr('brandTagline', ''),
          motto:        lsStr('brandMotto', ''),
        },
      });
      return { success: true, data: data.data };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg, data: err.response?.data };
    }
  },

  /* update branding ─────────────── */
  updateBranding: (updates) => {
    // A full browser storage must not undo a save the server already made.
    const put = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage full */ } };
    if (updates.logo)         put('schoolLogoPreview',    updates.logo);
    if (updates.primaryColor) put('brandPrimaryColor',    updates.primaryColor);
    if (updates.tagline)      put('brandTagline',         updates.tagline);
    if (updates.motto)        put('brandMotto',           updates.motto);
    if (updates.schoolName)   put('registeredSchoolName', updates.schoolName);
    applyBranding();
    set(s => ({ branding: { ...s.branding, ...updates } }));
  },

  /* logout ──────────────────────── */
  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    /* Keeps the school's branding and web name (so the sign-in page still
       shows the school) and any attendance still waiting for the internet;
       drops the offline copies of this user's data. */
    await clearSession();
    set({ user: null, school: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  /* helpers ─────────────────────── */
  updateUser:   (user)   => { localStorage.setItem('user', JSON.stringify(user)); set({ user }); },
  updateSchool: (school) => {
    try { localStorage.setItem('school', JSON.stringify(school)); } catch { /* storage full */ }
    syncSchoolBranding(school);
    set((s) => ({ school, branding: { ...s.branding, logo: school?.logoUrl || s.branding.logo, schoolName: school?.name || s.branding.schoolName } }));
  },

  /* The school's details as saved now: a logo or name changed on another
     computer reaches this one without signing in again. */
  refreshSchool: async () => {
    try {
      const { data } = await api.get('/auth/me', { silent: true });
      const fresh = data?.data?.school;
      if (!fresh?.id) return;
      const current = ls('school') || {};
      // /auth/me sends the public fields only; keep the campuses from sign-in.
      useAuthStore.getState().updateSchool({ ...current, ...fresh, campuses: current.campuses || fresh.campuses });
    } catch { /* offline or signed out: keep what is stored */ }
  },
}));

/* Apply branding on app boot */
applyBranding();

export default useAuthStore;
