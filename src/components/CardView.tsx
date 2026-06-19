import { useState } from 'react'
import type { Card, CardColor, CardType } from '../engine/types'

// ── Paleta de colores ────────────────────────────────────────────────────────

const BG: Record<CardColor, string> = {
  red:    '#E8171E',
  blue:   '#0062B0',
  green:  '#1B9A3D',
  yellow: '#F5D800',
  wild:   '#111',
}

const FG: Record<CardColor, string> = {
  red: '#fff', blue: '#fff', green: '#fff', yellow: '#1a1a1a', wild: '#fff',
}

// ── Label de esquina ─────────────────────────────────────────────────────────

function cornerLabel(type: CardType, value: number | null): string {
  if (type === 'number') return String(value ?? '')
  if (type === 'skip')    return '⊘'
  if (type === 'reverse') return '⇄'
  if (type === 'draw2')   return '+2'
  if (type === 'wild')    return 'W'
  if (type === 'wild4')   return 'W+4'
  return ''
}

// ── Contenido central de cada tipo de carta ──────────────────────────────────

function CenterContent({ card }: { card: Card }) {
  const bg  = BG[card.color]
  // IDs únicos por carta para clipPath (evita colisiones entre múltiples instancias en el DOM)
  const uid = `cp-${card.id.replace(/\W/g, '')}`

  switch (card.type) {

    case 'number':
      return (
        <text
          x="50" y="93" textAnchor="middle"
          fill={bg} fontSize="60" fontWeight="900"
          fontFamily="'Arial Black', Arial, sans-serif"
          letterSpacing="-2"
        >
          {card.value}
        </text>
      )

    case 'skip':
      return (
        <g fill="none" stroke={bg} strokeWidth="7.5" strokeLinecap="round">
          <circle cx="50" cy="72" r="22"/>
          <line x1="34" y1="56" x2="66" y2="88"/>
        </g>
      )

    case 'reverse':
      return (
        <g>
          {/* Arco superior */}
          <path d="M28 60 A23 15 0 0 1 72 60"
            fill="none" stroke={bg} strokeWidth="7" strokeLinecap="round"/>
          <polygon points="24,55 24,70 37,63" fill={bg}/>
          {/* Arco inferior */}
          <path d="M72 88 A23 15 0 0 1 28 88"
            fill="none" stroke={bg} strokeWidth="7" strokeLinecap="round"/>
          <polygon points="76,83 76,98 63,91" fill={bg}/>
        </g>
      )

    case 'draw2':
      return (
        <g>
          {/* Carta trasera */}
          <rect x="20" y="46" width="34" height="48" rx="5"
            fill="white" stroke={bg} strokeWidth="2.5"/>
          {/* Carta delantera */}
          <rect x="32" y="38" width="34" height="48" rx="5"
            fill="white" stroke={bg} strokeWidth="2.5"/>
          <text x="49" y="70" textAnchor="middle"
            fill={bg} fontSize="19" fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif">
            +2
          </text>
        </g>
      )

    case 'wild':
      return (
        <>
          <defs>
            <clipPath id={uid}>
              <ellipse cx="50" cy="72" rx="28" ry="39"
                transform="rotate(-25 50 72)"/>
            </clipPath>
          </defs>
          {/* Cuatro cuadrantes de color */}
          <g clipPath={`url(#${uid})`}>
            <rect x="22" y="33" width="28" height="39" fill="#E8171E"/>
            <rect x="50" y="33" width="28" height="39" fill="#0062B0"/>
            <rect x="22" y="72" width="28" height="39" fill="#F5D800"/>
            <rect x="50" y="72" width="28" height="39" fill="#1B9A3D"/>
          </g>
          {/* Borde del óvalo */}
          <ellipse cx="50" cy="72" rx="28" ry="39" fill="none"
            stroke="white" strokeWidth="2.5" transform="rotate(-25 50 72)"/>
        </>
      )

    case 'wild4':
      return (
        <>
          <defs>
            <clipPath id={uid}>
              <ellipse cx="50" cy="72" rx="28" ry="39"
                transform="rotate(-25 50 72)"/>
            </clipPath>
          </defs>
          <g clipPath={`url(#${uid})`}>
            <rect x="22" y="33" width="28" height="39" fill="#E8171E"/>
            <rect x="50" y="33" width="28" height="39" fill="#0062B0"/>
            <rect x="22" y="72" width="28" height="39" fill="#F5D800"/>
            <rect x="50" y="72" width="28" height="39" fill="#1B9A3D"/>
          </g>
          <ellipse cx="50" cy="72" rx="28" ry="39" fill="none"
            stroke="white" strokeWidth="2.5" transform="rotate(-25 50 72)"/>
          {/* +4 encima */}
          <text
            x="50" y="79" textAnchor="middle"
            fill="white" fontSize="23" fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
            stroke="#111" strokeWidth="3" paintOrder="stroke"
          >
            +4
          </text>
        </>
      )

    default:
      return null
  }
}

// ── Dorso de carta ───────────────────────────────────────────────────────────

function CardBack({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 100 146" style={{ display: 'block', borderRadius: 10 }}>
      {/* Fondo rojo */}
      <rect width="100" height="146" rx="10" fill="#E8171E"/>
      {/* Borde exterior blanco */}
      <rect x="4" y="4" width="92" height="138" rx="7"
        fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"/>
      {/* Óvalo amarillo */}
      <ellipse cx="50" cy="73" rx="30" ry="42"
        fill="#F5D800" transform="rotate(-25 50 73)"/>
      {/* Borde del óvalo en rojo */}
      <ellipse cx="50" cy="73" rx="30" ry="42"
        fill="none" stroke="#E8171E" strokeWidth="4"
        transform="rotate(-25 50 73)"/>
      {/* Texto */}
      <text
        x="50" y="81" textAnchor="middle"
        fill="#E8171E" fontSize="21" fontWeight="900" fontStyle="italic"
        fontFamily="'Arial Black', Arial, sans-serif"
      >
        UNO
      </text>
    </svg>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  card: Card
  onClick?: () => void
  disabled?: boolean
  playable?: boolean
  faceDown?: boolean
  small?: boolean
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CardView({ card, onClick, disabled, playable, faceDown, small }: Props) {
  const [hovered, setHovered] = useState(false)

  const W = small ? 52 : 100
  const H = small ? 76 : 146

  if (faceDown) {
    return (
      <div style={{ width: W, height: H, flexShrink: 0,
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)', borderRadius: 10 }}>
        <CardBack w={W} h={H}/>
      </div>
    )
  }

  const bg = BG[card.color]
  const fg = FG[card.color]
  const lbl = cornerLabel(card.type, card.value)
  const isClickable = !!onClick && !disabled
  const liftY = hovered && isClickable ? -16 : (playable && isClickable ? -8 : 0)

  return (
    <div style={{
      position: 'relative', display: 'inline-flex',
      flexDirection: 'column', alignItems: 'center', flexShrink: 0,
    }}>
      {/* Badge "▲ jugá" */}
      {playable && isClickable && (
        <div style={{
          position: 'absolute',
          top: hovered ? -34 : -28,
          left: '50%', transform: 'translateX(-50%)',
          background: '#43A047', color: '#fff',
          fontSize: 11, fontWeight: 800, borderRadius: 20,
          padding: '3px 10px', whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(67,160,71,0.7)',
          zIndex: 20, transition: 'top 0.15s ease', letterSpacing: 0.5,
        }}>
          ▲ jugá
        </div>
      )}

      <div
        onClick={isClickable ? onClick : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: W, height: H, flexShrink: 0,
          cursor: isClickable ? 'pointer' : 'default',
          transform: `translateY(${liftY}px) scale(${hovered && isClickable ? 1.06 : 1})`,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          boxShadow: hovered && isClickable
            ? '0 14px 30px rgba(0,0,0,0.65)'
            : playable && isClickable
              ? '0 0 0 3px #66BB6A, 0 4px 12px rgba(0,0,0,0.45)'
              : '0 4px 12px rgba(0,0,0,0.45)',
          borderRadius: 10,
          animation: playable && isClickable && !hovered
            ? 'glow-playable 1.4s ease-in-out infinite' : undefined,
          userSelect: 'none',
        }}
      >
        <svg
          width={W} height={H}
          viewBox="0 0 100 146"
          style={{ display: 'block', borderRadius: 10 }}
        >
          {/* ── Fondo ── */}
          <rect width="100" height="146" rx="10" fill={bg}/>

          {/* ── Borde blanco interior ── */}
          <rect x="4" y="4" width="92" height="138" rx="7"
            fill="none" stroke="white" strokeWidth="3"/>

          {/* ── Óvalo blanco central (solo cartas no-wild) ── */}
          {card.type !== 'wild' && card.type !== 'wild4' && (
            <ellipse cx="50" cy="72" rx="27" ry="38"
              fill="white" transform="rotate(-25 50 72)"/>
          )}

          {/* ── Gráfico central ── */}
          <CenterContent card={card}/>

          {/* ── Esquina superior izquierda ── */}
          <text
            x="9" y="22"
            fill={fg} fontSize={lbl.length > 2 ? 12 : 16} fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
          >
            {lbl}
          </text>

          {/* ── Esquina inferior derecha (rotada 180°) ── */}
          <g transform="rotate(180 50 73)">
            <text
              x="9" y="22"
              fill={fg} fontSize={lbl.length > 2 ? 12 : 16} fontWeight="900"
              fontFamily="'Arial Black', Arial, sans-serif"
            >
              {lbl}
            </text>
          </g>
        </svg>
      </div>
    </div>
  )
}
