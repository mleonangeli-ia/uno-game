import { CardColor } from '../engine/types'

const COLORS: { color: CardColor; label: string; bg: string }[] = [
  { color: 'red',    label: 'Rojo',     bg: '#E53935' },
  { color: 'yellow', label: 'Amarillo', bg: '#FDD835' },
  { color: 'green',  label: 'Verde',    bg: '#43A047' },
  { color: 'blue',   label: 'Azul',     bg: '#1E88E5' },
]

interface Props {
  onChoose: (color: CardColor) => void
}

export default function ColorPicker({ onChoose }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: '#1a1a2e', borderRadius: 20, padding: 32,
        border: '2px solid rgba(255,255,255,0.2)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        textAlign: 'center',
      }}>
        <h2 style={{ color: '#fff', marginBottom: 24, fontSize: 20, fontWeight: 700 }}>
          🌈 Elegí un color
        </h2>
        <div style={{ display: 'flex', gap: 16 }}>
          {COLORS.map(({ color, label, bg }) => (
            <button
              key={color}
              onClick={() => onChoose(color)}
              style={{
                width: 80, height: 80,
                background: bg,
                border: 'none', borderRadius: 12,
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                transition: 'transform 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>●</span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: color === 'yellow' ? '#333' : '#fff',
              }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
