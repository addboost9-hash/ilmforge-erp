/**
 * IlmForge — Language Store
 * Persists selected language and provides translation helper
 */
import { create } from 'zustand';
import { t, LANGUAGES } from '../i18n/translations';

const STORAGE_KEY = 'ilmforge_language';

const useLanguageStore = create((set, get) => ({
  lang: localStorage.getItem(STORAGE_KEY) || 'en',

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
const savedLang = localStorage.getItem(STORAGE_KEY) || 'en';
const savedLangObj = LANGUAGES.find(l => l.code === savedLang);
document.documentElement.setAttribute('dir', savedLangObj?.dir || 'ltr');
document.documentElement.setAttribute('lang', savedLang);
if (savedLang === 'ur') document.body.classList.add('lang-ur');
else if (savedLang === 'roman') document.body.classList.add('lang-roman');

export default useLanguageStore;
