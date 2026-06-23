import { useLangStore } from '../i18n'
import { LANGUAGES, Lang } from '../i18n/langs'

export default function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLangStore()

  return (
    <div style={{ display: 'flex', gap: compact ? 4 : 6 }}>
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code as Lang)}
          title={l.label}
          style={{
            padding: compact ? '3px 7px' : '5px 10px',
            background: lang === l.code ? 'rgba(255,255,255,0.18)' : 'transparent',
            border: `1px solid ${lang === l.code ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 8, cursor: 'pointer',
            fontSize: compact ? 14 : 16,
            transition: 'all 0.15s',
            opacity: lang === l.code ? 1 : 0.55,
          }}
        >
          {l.flag}
        </button>
      ))}
    </div>
  )
}
