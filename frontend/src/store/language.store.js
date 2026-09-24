/**
 * IlmForge — Language Store
 * Persists selected language and provides translation helper
 */
import { create } from 'zustand';
import { t, LANGUAGES } from '../i18n/translations';

const STORAGE_KEY = 'ilmforge_language';

/**
 * Roman Urdu was removed as a selectable language. A browser that still has
 * 'roman' saved would otherwise render every label through a locale that no
 * longer appears in the switcher, with no way back to English from the UI.
 */
const SUPPORTED = new Set(LANGUAGES.map((l) => l.code));
const readLang = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED.has(saved)) return saved;
  if (saved) localStorage.setItem(STORAGE_KEY, 'en');
  return 'en';
};

const useLanguageStore = create((set, get) => ({
  lang: readLang(),

  setLang: (lang) => {
    localStorage.setItem(STORAGE_KEY, lang);
    // Apply RTL for Urdu
    const langObj = LANGUAGES.find(l => l.code === lang);
    document.documentElement.setAttribute('dir', langObj?.dir || 'ltr');
    document.documentElement.setAttribute('lang', lang);
    // Apply Urdu font class
    if (lang === 'ur') {
      document.body.classList.add('lang-ur');
      document.body.classList.remove('lang-roman', 'lang-en');
    } else if (lang === 'roman') {
      document.body.classList.add('lang-roman');
      document.body.classList.remove('lang-ur', 'lang-en');
    } else {
      document.body.classList.add('lang-en');
      document.body.classList.remove('lang-ur', 'lang-roman');
    }
    set({ lang });
  },

  // Translate function shorthand
  t: (section, key) => t(section, key, get().lang),

  // Current language info
  currentLang: () => LANGUAGES.find(l => l.code === get().lang) || LANGUAGES[0],
}));

// Initialize direction on app load
const savedLang = readLang();
const savedLangObj = LANGUAGES.find(l => l.code === savedLang);
document.documentElement.setAttribute('dir', savedLangObj?.dir || 'ltr');
document.documentElement.setAttribute('lang', savedLang);
if (savedLang === 'ur') document.body.classList.add('lang-ur');
else document.body.classList.add('lang-en');

export default useLanguageStore;
