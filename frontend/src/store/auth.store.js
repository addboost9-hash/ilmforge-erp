import { create } from 'zustand';
import api from '../api/client';

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

/* ── store ───────────────────────────────────────── */
const useAuthStore = create((set) => ({
  user:            ls('user'),
  school:          ls('school'),
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
      const { accessToken, refreshToken, user, school } = data.data;
      localStorage.setItem('accessToken',  accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user',   JSON.stringify(user));
      localStorage.setItem('school', JSON.stringify(school));
      if (school?.campuses?.[0]?.id) {
        localStorage.setItem('campusId', school.campuses[0].id);
      }
      /* persist school name for branding */
      if (school?.name) {
        localStorage.setItem('registeredSchoolName', school.name);
      }
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
    if (updates.logo)         localStorage.setItem('schoolLogoPreview',    updates.logo);
    if (updates.primaryColor) localStorage.setItem('brandPrimaryColor',    updates.primaryColor);
    if (updates.tagline)      localStorage.setItem('brandTagline',         updates.tagline);
    if (updates.motto)        localStorage.setItem('brandMotto',           updates.motto);
    if (updates.schoolName)   localStorage.setItem('registeredSchoolName', updates.schoolName);
    applyBranding();
    set(s => ({ branding: { ...s.branding, ...updates } }));
  },

  /* logout ──────────────────────── */
  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    /* keep branding across logout so login page still looks branded */
    const logo         = lsStr('schoolLogoPreview', '');
    const primaryColor = lsStr('brandPrimaryColor', '#0D9488');
    const schoolName   = lsStr('registeredSchoolName', '');
    localStorage.clear();
    if (logo)        localStorage.setItem('schoolLogoPreview',    logo);
    if (primaryColor)localStorage.setItem('brandPrimaryColor',    primaryColor);
    if (schoolName)  localStorage.setItem('registeredSchoolName', schoolName);
    set({ user: null, school: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  /* helpers ─────────────────────── */
  updateUser:   (user)   => { localStorage.setItem('user', JSON.stringify(user)); set({ user }); },
  updateSchool: (school) => { localStorage.setItem('school', JSON.stringify(school)); set({ school }); },
}));

/* Apply branding on app boot */
applyBranding();

export default useAuthStore;
