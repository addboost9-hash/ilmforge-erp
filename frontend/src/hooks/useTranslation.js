/**
 * IlmForge — useTranslation hook
 * Simple hook that returns the translate function for current language
 */
import useLanguageStore from '../store/language.store';
import { t } from '../i18n/translations';

export function useTranslation() {
  const lang = useLanguageStore(s => s.lang);

  const translate = (section, key, fallback) => {
    const result = t(section, key, lang);
    return result !== key ? result : (fallback || key);
  };

  return { t: translate, lang };
}

export default useTranslation;
