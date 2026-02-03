import { useTranslation } from 'react-i18next';

export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir = lng === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  };

  const currentLanguage = i18n.language;
  const isRTL = currentLanguage === 'he';

  return {
    currentLanguage,
    changeLanguage,
    isRTL,
  };
}
