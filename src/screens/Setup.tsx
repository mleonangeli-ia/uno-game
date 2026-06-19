import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { useBreakpoint } from '../hooks/useBreakpoint'

export default function Setup() {
  const { startGame, createRoom } = useGameStore()
  const isMobile = useBreakpoint() === 'mobile'
  const [count, setCount] = useState(2)
  const [players, setPlayers] = useState([
    { name: 'Jugador 1', isBot: false },
    { name: 'Bot 1', isBot: true },
    { name: 'Bot 2', isBot: true },
    { name: 'Bot 3', isBot: true },
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
      background: 'linear-gradient(135deg, #1a472a 0%, #0d2818 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: isMobile ? 16 : 0,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
        borderRadius: isMobile ? 20 : 24,
        padding: isMobile ? '28px 20px' : '40px 48px',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        width: '100%', maxWidth: 420,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-block',
            background: '#E53935', borderRadius: 16, padding: '8px 28px',
            transform: 'rotate(-5deg)',
            boxShadow: '0 8px 24px rgba(229,57,53,0.5)',
          }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: '#FFD700', fontStyle: 'italic', letterSpacing: -2 }}>
              UNO
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 12, fontSize: 14 }}>
            El clásico juego de cartas
          </p>
        </div>

        {/* Player count */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: '#fff', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 10 }}>
            Cantidad de jugadores
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                style={{
                  flex: 1, padding: '10px 0',
                  background: count === n ? '#E53935' : 'rgba(255,255,255,0.1)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontWeight: 700, fontSize: 16, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Players */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {Array.from({ length: count }, (_, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: ['#E53935','#1E88E5','#43A047','#FDD835'][i],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: i === 3 ? '#333' : '#fff', fontWeight: 700, fontSize: 14,
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <input
                value={players[i].name}
                onChange={e => setName(i, e.target.value)}
                disabled={players[i].isBot}
                style={{
                  flex: 1, padding: '8px 12px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8, color: '#fff', fontSize: 14,
                  outline: 'none',
                  opacity: players[i].isBot ? 0.5 : 1,
                }}
              />
              <button
                onClick={() => toggleBot(i)}
                style={{
                  padding: '6px 10px',
                  background: players[i].isBot ? '#666' : '#1E88E5',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {players[i].isBot ? '🤖 Bot' : '👤 Human'}
              </button>
            </div>
          ))}
        </div>

        {/* Jugar local */}
        <button
          onClick={() => startGame(players.slice(0, count))}
          style={{
            width: '100%', padding: '14px 0',
            background: 'linear-gradient(135deg, #E53935, #c62828)',
            color: '#FFD700', border: 'none', borderRadius: 12,
            fontSize: 18, fontWeight: 900, cursor: 'pointer',
            letterSpacing: 1,
            boxShadow: '0 6px 20px rgba(229,57,53,0.4)',
            transition: 'transform 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          ¡JUGAR local!
        </button>

        {/* Separador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>o</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Jugar online */}
        <button
          onClick={() => createRoom(players[0].isBot ? 'Jugador' : players[0].name)}
          style={{
            width: '100%', marginTop: 12, padding: '13px 0',
            background: 'rgba(30,136,229,0.2)',
            color: '#64B5F6', border: '1px solid rgba(30,136,229,0.5)',
            borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer',
            transition: 'transform 0.1s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,136,229,0.35)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,136,229,0.2)' }}
        >
          🌐 Jugar online (multijugador)
        </button>
      </div>
    </div>
  )
}
