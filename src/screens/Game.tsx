import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { useBreakpoint } from '../hooks/useBreakpoint'
import CardView from '../components/CardView'
import ColorPicker from '../components/ColorPicker'
import { canPlay } from '../engine/rules'
import { CardColor } from '../engine/types'

const COLOR_HEX: Record<CardColor, string> = {
  red: '#E53935', yellow: '#FDD835', green: '#43A047',
  blue: '#1E88E5', wild: '#9C27B0',
}
const COLOR_NAME: Record<CardColor, string> = {
  red: 'Rojo', yellow: 'Amarillo', green: 'Verde', blue: 'Azul', wild: 'Comodín',
}
// Dimensiones del card SVG: small=52×76, default=100×146
const CARD_W = { sm: 52, lg: 100 }
const CARD_H = { sm: 76, lg: 146 }

function BotDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: '#fff',
          display: 'inline-block',
          animation: 'dot-bounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  )
}

export default function Game() {
  const {
    game, playCard, draw, passAfterDraw, chooseColor,
    sayUno, catchUno, startNewRound, resetToSetup, runBot,
    onlineMode, myPlayerId,
  } = useGameStore()

  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'
  // En mobile usamos small (52×76), en desktop full (100×146)
  const smallCards = isMobile
  const cw = smallCards ? CARD_W.sm : CARD_W.lg
  const ch = smallCards ? CARD_H.sm : CARD_H.lg

  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!game || onlineMode) return
    const player = game.players[game.currentPlayerIndex]
    if (!player.isBot) return
    if (game.phase === 'playing') {
      botTimer.current = setTimeout(() => runBot(), 900)
    } else if (game.phase === 'color-pick') {
      botTimer.current = setTimeout(() => {
        const counts: Record<string, number> = { red: 0, yellow: 0, green: 0, blue: 0 }
        player.hand.forEach(c => { if (counts[c.color] !== undefined) counts[c.color]++ })
        const best = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as CardColor
        chooseColor(best)
      }, 600)
    }
    return () => { if (botTimer.current) clearTimeout(botTimer.current) }
  }, [game?.phase, game?.currentPlayerIndex, onlineMode])

  if (!game) return null

  const currentPlayer = game.players[game.currentPlayerIndex]
  const topDiscard = game.discardPile[game.discardPile.length - 1]

  const myPlayer = onlineMode && myPlayerId
    ? (game.players.find(p => p.id === myPlayerId) ?? currentPlayer)
    : currentPlayer

  const isMyTurn = onlineMode
    ? currentPlayer.id === myPlayerId && game.phase === 'playing'
    : !currentPlayer.isBot && game.phase === 'playing'

  // ── ROUND / GAME END ─────────────────────────────────────────────────────────
  if (game.phase === 'round-end' || game.phase === 'game-end') {
    const winner = game.players.find(p => p.id === game.roundWinner)
    const isGameEnd = game.phase === 'game-end'
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        gap: 16, padding: isMobile ? '24px 16px' : 24,
        animation: 'fade-in 0.4s ease',
      }}>
        <div style={{ fontSize: isMobile ? 56 : 80 }}>{isGameEnd ? '🏆' : '🎉'}</div>
        <h1 style={{ color: '#FFD700', fontSize: isMobile ? 22 : 26, textAlign: 'center', margin: 0 }}>
          {isGameEnd ? '¡Partida terminada!' : '¡Ronda terminada!'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? 14 : 16, margin: 0, textAlign: 'center', padding: '0 8px' }}>
          {game.message}
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: 18,
          padding: isMobile ? '16px 20px' : '20px 28px',
          width: '100%', maxWidth: 360,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
            Puntajes — Meta: 500 pts
          </p>
          {game.players.slice().sort((a, b) => (game.scores[b.id] || 0) - (game.scores[a.id] || 0)).map((p, rank) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 16, width: 24 }}>{rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '  '}</span>
              <span style={{ flex: 1, color: p.id === winner?.id ? '#FFD700' : '#fff', fontWeight: p.id === winner?.id ? 700 : 400, fontSize: 14 }}>
                {p.isBot ? '🤖 ' : '👤 '}{p.name}
              </span>
              <div style={{
                background: p.id === winner?.id ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '3px 10px',
                color: p.id === winner?.id ? '#FFD700' : '#fff', fontWeight: 700, fontSize: 16,
              }}>
                {game.scores[p.id] || 0}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {!isGameEnd && (
            <button onClick={startNewRound} style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #E53935, #c62828)',
              color: '#FFD700', border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(229,57,53,0.4)',
            }}>▶ Nueva ronda</button>
          )}
          <button onClick={resetToSetup} style={{
            padding: '12px 24px', background: 'rgba(255,255,255,0.08)',
            color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>🏠 Menú</button>
        </div>
      </div>
    )
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────────
  const myHand = myPlayer.hand
  const playableIds = new Set(isMyTurn ? myHand.filter(c => canPlay(c, game)).map(c => c.id) : [])
  const myIdx = game.players.indexOf(myPlayer)
  const opponents = game.players.filter((_, i) => i !== myIdx)
  const colorHex = COLOR_HEX[game.currentColor]
  const canDraw = isMyTurn && !game.drawnThisTurn

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse at 50% 40%, #1e5631 0%, #0d2818 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {game.phase === 'color-pick' && (onlineMode ? isMyTurn : !currentPlayer.isBot) && (
        <ColorPicker onChoose={(c: CardColor) => chooseColor(c)} />
      )}

      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '8px 10px' : '10px 16px',
        background: 'rgba(0,0,0,0.45)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        gap: 6, flexWrap: 'wrap',
      }}>
        <button onClick={resetToSetup} style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.6)', borderRadius: 8,
          padding: isMobile ? '4px 8px' : '4px 10px',
          cursor: 'pointer', fontSize: isMobile ? 10 : 11, flexShrink: 0,
        }}>✕</button>

        {/* Scores */}
        <div style={{ display: 'flex', gap: isMobile ? 4 : 6, flexWrap: 'wrap', justifyContent: 'center', flex: 1 }}>
          {game.players.map(p => {
            const isActive = p.id === currentPlayer.id
            return (
              <div key={p.id} style={{
                background: isActive ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.07)',
                borderRadius: 20, padding: isMobile ? '3px 8px' : '4px 12px',
                border: `1px solid ${isActive ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.08)'}`,
                display: 'flex', gap: 4, alignItems: 'center',
              }}>
                <span style={{ fontSize: isMobile ? 9 : 11 }}>{p.isBot ? '🤖' : '👤'}</span>
                <span style={{ color: isActive ? '#FFD700' : '#fff', fontSize: isMobile ? 10 : 12, fontWeight: isActive ? 700 : 500 }}>
                  {isMobile && p.name.length > 5 ? p.name.slice(0, 5) + '…' : p.name}
                </span>
                <span style={{ color: '#FFD700', fontSize: isMobile ? 11 : 13, fontWeight: 800, background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '0 4px' }}>
                  {game.scores[p.id] ?? 0}
                </span>
              </div>
            )
          })}
        </div>

        {/* Color + direction */}
        <div style={{
          background: colorHex, borderRadius: 20,
          padding: isMobile ? '3px 10px' : '5px 14px',
          color: game.currentColor === 'yellow' ? '#222' : '#fff',
          fontSize: isMobile ? 11 : 12, fontWeight: 800, flexShrink: 0,
          boxShadow: `0 0 12px ${colorHex}99`,
          display: 'flex', gap: 4, alignItems: 'center',
        }}>
          <span>{game.direction === 1 ? '→' : '←'}</span>
          <span>{isMobile ? game.currentColor.slice(0, 3).toUpperCase() : COLOR_NAME[game.currentColor]}</span>
        </div>
      </div>

      {/* ── OPPONENTS ── */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        gap: isMobile ? 6 : 10,
        padding: isMobile ? '8px 10px 4px' : '12px 16px 6px',
        flexWrap: 'wrap',
      }}>
        {opponents.map(p => {
          const isTheirTurn = p.id === currentPlayer.id
          const hasUnoAlert = p.hand.length === 1 && !game.unoSaid[p.id]
          return (
            <div key={p.id} style={{
              background: isTheirTurn ? 'rgba(255,215,0,0.1)' : 'rgba(0,0,0,0.35)',
              borderRadius: isMobile ? 10 : 14,
              padding: isMobile ? '6px 10px' : '8px 14px',
              display: 'flex', alignItems: 'center',
              gap: isMobile ? 6 : 8,
              border: `1px solid ${isTheirTurn ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <span style={{ fontSize: isMobile ? 14 : 16 }}>{p.isBot ? '🤖' : '👤'}</span>
              <span style={{ color: '#fff', fontSize: isMobile ? 12 : 14, fontWeight: 600 }}>
                {isMobile && p.name.length > 7 ? p.name.slice(0, 7) + '…' : p.name}
              </span>

              {/* Mini card fan — solo en desktop/tablet */}
              {!isMobile && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {p.hand.slice(0, 10).map((_, i) => (
                    <div key={i} style={{
                      width: 10, height: 16, borderRadius: 3,
                      background: 'linear-gradient(135deg, #b71c1c, #e53935)',
                      border: '1.5px solid rgba(255,255,255,0.6)',
                      marginLeft: i === 0 ? 0 : -4,
                    }} />
                  ))}
                  {p.hand.length > 10 && (
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginLeft: 4 }}>
                      +{p.hand.length - 10}
                    </span>
                  )}
                </div>
              )}

              <span style={{
                background: hasUnoAlert ? '#E53935' : 'rgba(255,255,255,0.12)',
                color: '#fff', borderRadius: 20, padding: isMobile ? '2px 7px' : '2px 8px',
                fontSize: isMobile ? 11 : 12, fontWeight: 700,
                animation: hasUnoAlert ? 'pulse 0.8s ease-in-out infinite' : undefined,
              }}>
                {p.hand.length}{p.hand.length === 1 ? ' ⚠️' : ''}
              </span>

              {hasUnoAlert && (
                <button onClick={() => catchUno(p.id)} style={{
                  background: '#E53935', border: 'none',
                  color: '#fff', borderRadius: 8, padding: isMobile ? '3px 8px' : '4px 10px',
                  fontSize: isMobile ? 11 : 12, fontWeight: 800, cursor: 'pointer',
                  animation: 'pulse 0.8s ease-in-out infinite',
                }}>¡UNO!</button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── CENTER TABLE ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: isMobile ? 28 : 56, padding: isMobile ? '8px 16px' : '12px 24px',
        minHeight: isMobile ? 160 : 200,
      }}>
        {/* Draw pile */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          <div
            onClick={canDraw ? draw : undefined}
            style={{
              position: 'relative', cursor: canDraw ? 'pointer' : 'default',
              opacity: canDraw ? 1 : 0.4,
              transition: 'opacity 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => { if (canDraw) e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {[{ t: -6, l: -6 }, { t: -3, l: -3 }].map((off, i) => (
              <div key={i} style={{
                position: 'absolute', top: off.t, left: off.l,
                width: cw, height: ch,
                background: 'linear-gradient(135deg, #a71919, #c0392b)',
                borderRadius: 10, border: '3px solid rgba(255,255,255,0.5)',
                boxShadow: '0 3px 8px rgba(0,0,0,0.5)', zIndex: i,
              }} />
            ))}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <CardView card={{ id: 'back', color: 'red', type: 'number', value: null }} faceDown small={smallCards} />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? 11 : 13 }}>
              {game.deck.length} cartas
            </div>
            {canDraw && (
              <div style={{ color: '#4CAF50', fontSize: isMobile ? 11 : 12, fontWeight: 700, marginTop: 2, animation: 'pulse 1.5s ease-in-out infinite' }}>
                ↑ Robar
              </div>
            )}
          </div>
        </div>

        {/* Discard pile */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          {topDiscard && (
            <div style={{
              borderRadius: 14, padding: isMobile ? 5 : 8,
              background: `${colorHex}20`,
              boxShadow: `0 0 ${isMobile ? 20 : 36}px ${isMobile ? 6 : 10}px ${colorHex}55, 0 0 60px 20px ${colorHex}1a`,
              transition: 'box-shadow 0.5s ease',
            }}>
              <CardView card={topDiscard} small={smallCards} />
            </div>
          )}
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? 11 : 13 }}>Descarte</span>
        </div>
      </div>

      {/* ── TURN BANNER ── */}
      <div style={{
        margin: isMobile ? '0 10px 6px' : '0 16px 8px',
        borderRadius: 12, padding: isMobile ? '9px 12px' : '11px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: isMyTurn
          ? 'rgba(76,175,80,0.15)'
          : currentPlayer.isBot ? 'rgba(0,0,0,0.3)' : 'rgba(255,193,7,0.1)',
        border: `1px solid ${isMyTurn ? 'rgba(76,175,80,0.4)' : currentPlayer.isBot ? 'rgba(255,255,255,0.08)' : 'rgba(255,193,7,0.3)'}`,
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {isMyTurn ? (
            <>
              <span style={{ fontSize: 16 }}>✨</span>
              <span style={{ color: '#fff', fontSize: isMobile ? 13 : 14, fontWeight: 700 }}>¡Tu turno!</span>
            </>
          ) : currentPlayer.isBot ? (
            <>
              <span style={{ fontSize: 16 }}>🤖</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? 12 : 13, fontWeight: 600 }}>
                {isMobile && currentPlayer.name.length > 8 ? currentPlayer.name.slice(0, 8) + '…' : currentPlayer.name}
              </span>
              <BotDots />
            </>
          ) : (
            <>
              <span style={{ fontSize: 16 }}>⏳</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? 12 : 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Turno de {currentPlayer.name}
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {isMyTurn && myHand.length === 1 && !game.unoSaid[myPlayer.id] && (
            <button onClick={sayUno} style={{
              padding: isMobile ? '5px 12px' : '6px 14px',
              background: 'linear-gradient(135deg, #E53935, #c62828)',
              color: '#FFD700', border: 'none', borderRadius: 10,
              fontSize: isMobile ? 12 : 13, fontWeight: 900, cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(229,57,53,0.5)',
              animation: 'pulse 0.9s ease-in-out infinite', letterSpacing: 1,
            }}>¡UNO!</button>
          )}
          {isMyTurn && game.drawnThisTurn && (
            <button onClick={passAfterDraw} style={{
              padding: isMobile ? '5px 10px' : '6px 12px',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 10, fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: 'pointer',
            }}>Pasar →</button>
          )}
          {!isMobile && (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, maxWidth: 180, textAlign: 'right' }}>
              {game.message}
            </span>
          )}
        </div>
      </div>

      {/* Mensaje en mobile (fuera del banner para no apretarlo) */}
      {isMobile && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11, padding: '0 12px 4px', minHeight: 16 }}>
          {game.message}
        </div>
      )}

      {/* ── HAND ── */}
      <div style={{
        background: 'rgba(0,0,0,0.4)',
        borderTop: `2px solid ${isMyTurn ? 'rgba(76,175,80,0.45)' : 'rgba(255,255,255,0.06)'}`,
        padding: isMobile ? '10px 10px 16px' : '14px 16px 22px',
        transition: 'border-color 0.3s',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 6, textAlign: 'center' }}>
          {onlineMode ? `${myPlayer.name} (vos)` : myPlayer.name}
          {' · '}{myHand.length} {myHand.length === 1 ? 'carta' : 'cartas'}
        </div>
        <div style={{
          display: 'flex', gap: isMobile ? 4 : 6,
          overflowX: 'auto', paddingBottom: 4,
          justifyContent: myHand.length <= (isMobile ? 5 : 7) ? 'center' : 'flex-start',
          paddingTop: 10,
          WebkitOverflowScrolling: 'touch',
        }}>
          {myHand.map(card => {
            if (card.id === 'hidden' || myPlayer.isBot) {
              return (
                <div key={card.id + Math.random()} style={{ flexShrink: 0 }}>
                  <CardView card={card} faceDown small />
                </div>
              )
            }
            const isPlayable = playableIds.has(card.id)
            const isDrawnRestricted = !!game.drawnThisTurn && card.id !== game.drawnThisTurn.id
            const canPlayThis = isPlayable && !isDrawnRestricted
            return (
              <div key={card.id} style={{ flexShrink: 0 }}>
                <CardView
                  card={card}
                  small={smallCards}
                  playable={canPlayThis}
                  onClick={canPlayThis ? () => playCard(card.id) : undefined}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
