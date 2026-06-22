import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

const PLAYER_COLORS = ['#E8171E', '#0062B0', '#1B9A3D', '#F5D800']

// Cartas decorativas de fondo
const DECO = [
  { color: '#E8171E', label: '7', angle: -25, top: '8%',  left: '4%',  delay: '0s' },
  { color: '#0062B0', label: '+2', angle: 15,  top: '12%', right: '5%', delay: '0.4s' },
  { color: '#1B9A3D', label: '⊘', angle: -10, bottom: '20%', left: '3%', delay: '0.8s' },
  { color: '#F5D800', label: '⇄', angle: 20,  bottom: '15%', right: '4%', delay: '0.2s' },
  { color: '#111',   label: 'W',  angle: -18, top: '40%',  left: '2%',  delay: '1.1s' },
  { color: '#E8171E', label: '3', angle: 12,  top: '55%', right: '3%', delay: '0.6s' },
]

export default function Setup() {
  const { startGame, createRoom } = useGameStore()
  const [count, setCount] = useState(2)
  const [players, setPlayers] = useState([
    { name: 'Jugador 1', isBot: false },
    { name: 'Bot 1',     isBot: true  },
    { name: 'Bot 2',     isBot: true  },
    { name: 'Bot 3',     isBot: true  },
  ])

  function setName(i: number, name: string) {
    setPlayers(p => p.map((pl, j) => j === i ? { ...pl, name } : pl))
  }

  function toggleBot(i: number) {
    setPlayers(p => p.map((pl, j) => {
      if (j !== i) return pl
      const isBot = !pl.isBot
      return { ...pl, isBot, name: isBot ? `Bot ${j}` : `Jugador ${j + 1}` }
    }))
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse at 50% 60%, #1b4332 0%, #0d2818 55%, #051209 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, position: 'relative', overflow: 'hidden',
    }}>
      {/* Cartas decorativas flotantes */}
      {DECO.map((d, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: d.top, bottom: d.bottom,
          left: d.left, right: d.right,
          width: 56, height: 82,
          background: d.color,
          borderRadius: 8,
          border: '2px solid rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: d.color === '#F5D800' ? '#333' : '#fff',
          fontSize: 20, fontWeight: 900,
          opacity: 0.18,
          ['--r' as string]: `${d.angle}deg`,
          animation: `float 4s ease-in-out ${d.delay} infinite`,
          pointerEvents: 'none',
        }}>
          {d.label}
        </div>
      ))}

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
        borderRadius: 24,
        padding: '36px 36px 32px',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        width: '100%', maxWidth: 400,
        position: 'relative', zIndex: 1,
        animation: 'fade-in 0.5s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-block', position: 'relative',
            background: '#E8171E',
            borderRadius: 18, padding: '10px 32px',
            transform: 'rotate(-4deg)',
            boxShadow: '0 10px 32px rgba(232,23,30,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}>
            <span style={{
              fontSize: 52, fontWeight: 900, color: '#FFD700',
              fontStyle: 'italic', letterSpacing: -2,
              textShadow: '2px 3px 6px rgba(0,0,0,0.4)',
            }}>
              UNO
            </span>
            {/* Inner oval decoration */}
            <div style={{
              position: 'absolute', inset: 4,
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: 14, pointerEvents: 'none',
            }}/>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: 14, fontSize: 13, letterSpacing: 0.5 }}>
            El clásico juego de cartas
          </p>
        </div>

        {/* Cantidad */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Jugadores
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => setCount(n)} style={{
                flex: 1, padding: '11px 0',
                background: count === n
                  ? 'linear-gradient(135deg, #E8171E, #c0121a)'
                  : 'rgba(255,255,255,0.08)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontWeight: 800, fontSize: 17, cursor: 'pointer',
                boxShadow: count === n ? '0 4px 14px rgba(232,23,30,0.4)' : 'none',
                transition: 'all 0.15s',
              }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de jugadores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
          {Array.from({ length: count }, (_, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: PLAYER_COLORS[i],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: i === 3 ? '#1a1a00' : '#fff',
                fontWeight: 900, fontSize: 15, flexShrink: 0,
                boxShadow: `0 3px 10px ${PLAYER_COLORS[i]}66`,
              }}>
                {i + 1}
              </div>
              <input
                value={players[i].name}
                onChange={e => setName(i, e.target.value)}
                disabled={players[i].isBot}
                style={{
                  flex: 1, padding: '9px 12px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600,
                  outline: 'none',
                  opacity: players[i].isBot ? 0.45 : 1,
                }}
              />
              <button onClick={() => toggleBot(i)} style={{
                padding: '7px 11px',
                background: players[i].isBot ? 'rgba(255,255,255,0.12)' : 'rgba(30,136,229,0.4)',
                color: players[i].isBot ? 'rgba(255,255,255,0.5)' : '#7ec8ff',
                border: `1px solid ${players[i].isBot ? 'rgba(255,255,255,0.15)' : 'rgba(30,136,229,0.5)'}`,
                borderRadius: 9, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}>
                {players[i].isBot ? '🤖 Bot' : '👤 Human'}
              </button>
            </div>
          ))}
        </div>

        {/* Botón local */}
        <button
          onClick={() => startGame(players.slice(0, count))}
          style={{
            width: '100%', padding: '15px 0',
            background: 'linear-gradient(135deg, #E8171E 0%, #c0121a 100%)',
            color: '#FFD700', border: 'none', borderRadius: 14,
            fontSize: 19, fontWeight: 900, cursor: 'pointer',
            letterSpacing: 0.5,
            boxShadow: '0 8px 24px rgba(232,23,30,0.45)',
            transition: 'transform 0.12s, box-shadow 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.025)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(232,23,30,0.55)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';     e.currentTarget.style.boxShadow = '0 8px 24px rgba(232,23,30,0.45)' }}
        >
          ¡JUGAR!
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }}/>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>o</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }}/>
        </div>

        {/* Botón online */}
        <button
          onClick={() => createRoom(players[0].isBot ? 'Jugador' : players[0].name)}
          style={{
            width: '100%', padding: '13px 0',
            background: 'rgba(30,136,229,0.15)',
            color: '#7ec8ff',
            border: '1px solid rgba(30,136,229,0.4)',
            borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,136,229,0.28)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,136,229,0.15)' }}
        >
          🌐 Multijugador online
        </button>
      </div>
    </div>
  )
}
