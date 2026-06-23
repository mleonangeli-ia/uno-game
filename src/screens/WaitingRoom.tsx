import { useGameStore } from '../store/gameStore'
import { useBreakpoint } from '../hooks/useBreakpoint'
import QRCard from '../components/QRCard'
import { useT } from '../i18n'

const COLORS = ['#E53935', '#1E88E5', '#43A047', '#FDD835', '#9C27B0', '#FF9800']

export default function WaitingRoom() {
  const { roomCode, roomPlayers, isHost, startOnlineGame, leaveRoom } = useGameStore()
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'
  const t = useT()

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #1a472a 0%, #0d2818 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', padding: isMobile ? 16 : 24,
    }}>
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 16 : 24, alignItems: isMobile ? 'center' : 'flex-start',
        width: '100%', maxWidth: isMobile ? 420 : 820,
      }}>

        {/* ── IZQUIERDA: código + QR ── */}
        <div style={{
          flex: '0 0 auto', width: isMobile ? '100%' : 300,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              background: '#E53935', borderRadius: 12, padding: '5px 20px',
              transform: 'rotate(-4deg)',
              boxShadow: '0 6px 20px rgba(229,57,53,0.5)',
            }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#FFD700', fontStyle: 'italic', letterSpacing: -2 }}>
                UNO
              </span>
            </div>
          </div>

          {/* Código grande */}
          <div style={{
            textAlign: 'center',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 18, padding: '18px 24px',
            border: '2px solid rgba(255,255,255,0.12)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Código de sala
            </p>
            <span style={{
              fontSize: 48, fontWeight: 900, letterSpacing: 14,
              color: '#FFD700', fontFamily: 'monospace', display: 'block',
            }}>
              {roomCode}
            </span>
          </div>

          {/* QR */}
          {roomCode && <QRCard roomCode={roomCode} />}
        </div>

        {/* ── DERECHA: jugadores + acción ── */}
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
          borderRadius: 22, padding: '28px 30px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
              {t.waitingPlayers}
            </h2>
            <span style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)', borderRadius: 20,
              padding: '3px 12px', fontSize: 13,
            }}>
              {roomPlayers.length} / 6
            </span>
          </div>

          {/* Lista de jugadores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {roomPlayers.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(0,0,0,0.2)', borderRadius: 12,
                padding: '11px 14px',
                border: '1px solid rgba(255,255,255,0.06)',
                animation: 'fade-in 0.3s ease',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: COLORS[i % COLORS.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 17,
                  color: i === 3 ? '#333' : '#fff',
                  flexShrink: 0, boxShadow: `0 3px 10px ${COLORS[i % COLORS.length]}66`,
                }}>
                  {p.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                </div>
                {i === 0 && (
                  <span style={{
                    background: 'rgba(255,215,0,0.15)',
                    border: '1px solid rgba(255,215,0,0.4)',
                    color: '#FFD700', borderRadius: 6,
                    padding: '2px 9px', fontSize: 11, fontWeight: 700,
                  }}>
                    {t.hostTag}
                  </span>
                )}
              </div>
            ))}

            {/* Slots vacíos (mínimo 2 slots visibles libres) */}
            {Array.from({ length: Math.max(0, 2 - roomPlayers.length) }, (_, i) => (
              <div key={`empty-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(0,0,0,0.1)', borderRadius: 12,
                padding: '11px 14px',
                border: '1px dashed rgba(255,255,255,0.1)',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 22 }}>?</span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 14 }}>
                  {t.waitingSlot}
                </span>
              </div>
            ))}
          </div>

          {/* Instrucciones */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10, padding: '10px 14px',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              📱 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Desde el celular:</strong> escaneá el QR con la cámara<br />
              💻 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{t.scanInstPC}</strong> {t.scanInstPCD}<br />
              🔑 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{t.altCode}</strong> <strong style={{ color: '#FFD700' }}>{roomCode}</strong>
            </p>
          </div>

          {/* Botón iniciar / esperar */}
          {isHost ? (
            <button
              onClick={startOnlineGame}
              disabled={roomPlayers.length < 2}
              style={{
                padding: '15px 0', marginTop: 4,
                background: roomPlayers.length >= 2
                  ? 'linear-gradient(135deg, #E53935, #c62828)'
                  : 'rgba(255,255,255,0.07)',
                color: roomPlayers.length >= 2 ? '#FFD700' : 'rgba(255,255,255,0.25)',
                border: 'none', borderRadius: 12,
                fontSize: 16, fontWeight: 900, cursor: roomPlayers.length >= 2 ? 'pointer' : 'default',
                letterSpacing: 0.5,
                boxShadow: roomPlayers.length >= 2 ? '0 6px 20px rgba(229,57,53,0.35)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {roomPlayers.length < 2
                ? '⏳ Esperando jugadores...'
                : `🎮 ¡Iniciar con ${roomPlayers.length} jugadores!`}
            </button>
          ) : (
            <div style={{
              textAlign: 'center', padding: '14px',
              color: 'rgba(255,255,255,0.4)', fontSize: 14,
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
            }}>
              <span style={{ animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block' }}>⏳</span>
              {' '}Esperando que el host inicie...
            </div>
          )}

          <button onClick={leaveRoom} style={{
            padding: '9px 0',
            background: 'transparent',
            color: 'rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, fontSize: 13, cursor: 'pointer',
          }}>
            ← {t.leaveRoom}
          </button>
        </div>
      </div>
    </div>
  )
}
