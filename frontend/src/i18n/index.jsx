import React, { createContext, useContext, useState } from 'react';
import pl from './pl.js';
import en from './en.js';
import de from './de.js';
import es from './es.js';

const LANGS = { pl, en, de, es };
const LangContext = createContext({ t: k => k, lang: 'pl', setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('vs_lang') || 'pl');
  const setLangPersist = (l) => { localStorage.setItem('vs_lang', l); setLang(l); };
  const t = (key) => LANGS[lang]?.[key] ?? LANGS.pl[key] ?? key;
  return <LangContext.Provider value={{ t, lang, setLang: setLangPersist }}>{children}</LangContext.Provider>;
}

export const useT = () => useContext(LangContext);

export function LanguageSwitcher() {
  const { lang, setLang } = useT();
  const langs = [
    { code: 'pl', flag: '🇵🇱', label: 'PL' },
    { code: 'en', flag: '🇬🇧', label: 'EN' },
    { code: 'de', flag: '🇩🇪', label: 'DE' },
    { code: 'es', flag: '🇪🇸', label: 'ES' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {langs.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          title={l.flag + ' ' + l.label}
          style={{
            padding: '3px 8px',
            borderRadius: 6,
            border: `1px solid ${lang === l.code ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
            background: lang === l.code ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
            color: lang === l.code ? 'var(--accent-light, #c4b5fd)' : 'var(--text-secondary, #aaa)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: lang === l.code ? 700 : 400,
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}
