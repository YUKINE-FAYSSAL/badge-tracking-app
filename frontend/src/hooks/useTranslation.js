// src/hooks/useTranslation.js
import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

// Import translation files directly
import enTranslations from '../locales/en.json';
import frTranslations from '../locales/fr.json';

const translations = {
  en: enTranslations,
  fr: frTranslations
};

export const useTranslation = () => {
  const { language } = useLanguage();
  const [currentTranslations, setCurrentTranslations] = useState(translations[language] || translations.en);

  useEffect(() => {
    setCurrentTranslations(translations[language] || translations.en);
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = currentTranslations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return the last part of the key if translation not found
        return keys[keys.length - 1];
      }
    }
    
    return value || keys[keys.length - 1];
  };

  return { t, language };
};