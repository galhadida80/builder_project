import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const useLanguage = () => {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language;
  const isRTL = currentLanguage === 'he';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage, isRTL]);

  const changeLanguage = (lang: 'en' | 'he') => {
    i18n.changeLanguage(lang);
  };

  return {
    currentLanguage,
    isRTL,
    changeLanguage,
  };
};
