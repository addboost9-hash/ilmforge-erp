/**
 * useBranding — central hook for school branding
 * Returns logo, primaryColor, schoolName, tagline from the auth store.
 * Falls back to localStorage so the login page looks branded even before login.
 */
import useAuthStore from '../store/auth.store';

const ls = (k, d = '') => { try { return localStorage.getItem(k) || d; } catch { return d; } };

export function useBranding() {
  const { branding, school } = useAuthStore();

  return {
    logo:         branding?.logo         || ls('schoolLogoPreview', ''),
    primaryColor: branding?.primaryColor || ls('brandPrimaryColor', '#0D9488'),
    schoolName:   branding?.schoolName   || school?.name || ls('registeredSchoolName', 'EduForge Pro'),
    tagline:      branding?.tagline      || ls('brandTagline', 'School Management Platform'),
    motto:        branding?.motto        || ls('brandMotto', ''),
    /* helper: CSS gradient using primary color */
    gradient:     (deg = '135deg') => {
      const c = branding?.primaryColor || ls('brandPrimaryColor', '#0D9488');
      return `linear-gradient(${deg}, ${c} 0%, ${c}CC 100%)`;
    },
  };
}
