import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { useT } from '../i18n'
import LanguageSelector from '../components/LanguageSelector'
import { useBreakpoint } from '../hooks/useBreakpoint'

export default function OnlineLobby() {
  const { createRoom, joinRoom, leaveRoom, roomError, clearRoomError } = useGameStore()
  const t = useT()
  const isMobile = useBreakpoint() === 'mobile'
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [tab, setTab] = useState<'create' | 'join'>('create')

  // Si la URL tiene ?join=XXXX, pre-carga el código y cambia a la tab de unirse
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')
    if (joinCode) {
      setCode(joinCode.toUpperCase().slice(0, 4))
      setTab('join')
      // Limpia el param de la URL sin recargar
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (roomError) {
      const t = setTimeout(clearRoomError, 3000)
      return () => clearTimeout(t)
    }
  }, [roomError])

  const canSubmit = name.trim().length >= 2
  const canJoin = canSubmit && code.trim().length === 4

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (canSubmit) createRoom(name.trim())
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (canJoin) joinRoom(code.trim(), name.trim())
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #1a472a 0%, #0d2818 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', padding: isMobile ? 16 : 20,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
        borderRadius: isMobile ? 20 : 24,
        padding: isMobile ? '28px 20px' : '36px 44px',
        width: '100%', maxWidth: 400,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-block',
            background: '#E53935', borderRadius: 14, padding: '6px 24px',
            transform: 'rotate(-5deg)',
            boxShadow: '0 6px 20px rgba(229,57,53,0.5)',
          }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: '#FFD700', fontStyle: 'italic', letterSpacing: -2 }}>
              UNO
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 10, fontSize: 13 }}>
            Multijugador en línea
          </p>
        </div>

        {/* Error */}
        {roomError && (
          <div style={{
            background: 'rgba(229,57,53,0.2)', border: '1px solid rgba(229,57,53,0.5)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            color: '#ff8a80', fontSize: 13, textAlign: 'center',
          }}>
            ❌ {roomError}
          </div>
        )}

        {/* Nombre */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Tu nombre
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Martín"
            maxLength={16}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10, color: '#fff', fontSize: 15, outline: 'none',
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          {(['create', 'join'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px 0',
              background: tab === t ? '#E53935' : 'transparent',
              color: '#fff', border: 'none',
              fontWeight: tab === t ? 700 : 400, fontSize: 14, cursor: 'pointer',
              transition: 'background 0.2s',
            }}>
              {t === 'create' ? '➕ Crear sala' : '🔗 Unirse'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate}>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                width: '100%', padding: '13px 0',
                background: canSubmit
                  ? 'linear-gradient(135deg, #E53935, #c62828)'
                  : 'rgba(255,255,255,0.1)',
                color: canSubmit ? '#FFD700' : 'rgba(255,255,255,0.3)',
                border: 'none', borderRadius: 12,
                fontSize: 16, fontWeight: 900, cursor: canSubmit ? 'pointer' : 'default',
                letterSpacing: 1,
              }}
            >
              Crear sala
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Código de sala
              </label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="ABCD"
                maxLength={4}
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10, color: '#fff', fontSize: 22,
                  fontWeight: 700, letterSpacing: 6, textAlign: 'center',
                  outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!canJoin}
              style={{
                padding: '13px 0',
                background: canJoin
                  ? 'linear-gradient(135deg, #1E88E5, #1565C0)'
                  : 'rgba(255,255,255,0.1)',
                color: canJoin ? '#fff' : 'rgba(255,255,255,0.3)',
                border: 'none', borderRadius: 12,
                fontSize: 16, fontWeight: 700, cursor: canJoin ? 'pointer' : 'default',
              }}
            >
              Unirse a la sala
            </button>
          </form>
        )}

        <button onClick={leaveRoom} style={{
          width: '100%', marginTop: 14,
          padding: '9px 0',
          background: 'transparent',
          color: 'rgba(255,255,255,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, fontSize: 13, cursor: 'pointer',
        }}>
          ← Volver al menú
        </button>
      </div>
    </div>
  )
}
