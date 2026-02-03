export const getDirection = (language: string): 'ltr' | 'rtl' => {
  return language === 'he' ? 'rtl' : 'ltr';
};
