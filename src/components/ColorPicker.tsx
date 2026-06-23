import { CardColor } from '../engine/types'
import { useT } from '../i18n'

const COLORS: { color: CardColor; bg: string; key: keyof ReturnType<typeof useT> }[] = [
  { color: 'red',    bg: '#E8171E', key: 'colorRed'    },
  { color: 'yellow', bg: '#F5D800', key: 'colorYellow' },
  { color: 'green',  bg: '#1B9A3D', key: 'colorGreen'  },
  { color: 'blue',   bg: '#0062B0', key: 'colorBlue'   },
]

interface Props { onChoose: (color: CardColor) => void }

export default function ColorPicker({ onChoose }: Props) {
  const t = useT()
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: '#1a1a2e', borderRadius: 22, padding: '28px 32px',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
        textAlign: 'center',
        animation: 'fade-in 0.2s ease',
      }}>
        <h2 style={{ color: '#fff', marginBottom: 20, fontSize: 18, fontWeight: 800 }}>
          🌈 {t.pickColor}
        </h2>
        <div style={{ display: 'flex', gap: 14 }}>
          {COLORS.map(({ color, bg, key }) => (
            <button key={color} onClick={() => onChoose(color)} style={{
              width: 80, height: 80, background: bg, border: 'none', borderRadius: 14,
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 5,
              boxShadow: `0 4px 16px ${bg}77`,
              transition: 'transform 0.12s, box-shadow 0.12s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = `0 8px 24px ${bg}99` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.boxShadow = `0 4px 16px ${bg}77` }}
            >
              <span style={{ fontSize: 30, lineHeight: 1 }}>●</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: color === 'yellow' ? '#333' : '#fff' }}>
                {t[key] as string}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
