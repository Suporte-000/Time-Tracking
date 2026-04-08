import React, { createContext, useContext, useState, useCallback } from 'react';
import { type Language, type TranslationKey, getLanguage, setLanguage as saveLanguage, t as translate } from '../shared/i18n';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'pt-BR',
  setLang: () => {},
  t: (key) => key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(getLanguage());

  const setLang = useCallback((newLang: Language) => {
    saveLanguage(newLang);
    setLangState(newLang);
    // Persist language to SQLite config so main process can use it (e.g. notifications)
    window.electron?.updateConfig?.({ language: newLang } as any);
  }, []);

  const t = useCallback((key: TranslationKey) => translate(key, lang), [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
