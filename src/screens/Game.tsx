import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { useBreakpoint } from '../hooks/useBreakpoint'
import CardView from '../components/CardView'
import ColorPicker from '../components/ColorPicker'
import LanguageSelector from '../components/LanguageSelector'
import { canPlay } from '../engine/rules'
import { CardColor } from '../engine/types'
import { useT } from '../i18n'

const COLOR_HEX: Record<CardColor, string> = {
  red: '#E8171E', yellow: '#F5D800', green: '#1B9A3D',
  blue: '#0062B0', wild: '#7B1FA2',
}
const COLOR_NAME: Record<CardColor, string> = {
  red: 'Rojo', yellow: 'Amarillo', green: 'Verde', blue: 'Azul', wild: 'Comodín',
}
const CARD_W = { sm: 52, lg: 100 }
const CARD_H = { sm: 76, lg: 146 }

function BotDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.7)',
          display: 'inline-block',
          animation: 'dot-bounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  )
}

// ── Fan de cartas ─────────────────────────────────────────────────────────────
function FanHand({
  hand, playableIds, drawnThisTurn, canPlayCard, isBot, small,
}: {
  hand: { id: string; color: CardColor; type: string; value: number | null }[]
  playableIds: Set<string>
  drawnThisTurn: { id: string } | null
  canPlayCard: (id: string) => void
  isBot: boolean
  small: boolean
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const cw = small ? CARD_W.sm : CARD_W.lg
  const ch = small ? CARD_H.sm : CARD_H.lg
  const n = hand.length

  // Para muchas cartas o mobile, usar scroll plano
  const useFan = !small && n <= 12

  if (!useFan) {
    return (
      <div style={{
        display: 'flex', gap: small ? 4 : 6,
        overflowX: 'auto', paddingBottom: 6, paddingTop: 12,
        justifyContent: n <= 6 ? 'center' : 'flex-start',
        WebkitOverflowScrolling: 'touch',
      }}>
        {hand.map(card => {
          if (card.id === 'hidden' || isBot) return (
            <div key={card.id + Math.random()} style={{ flexShrink: 0 }}>
              <CardView card={card as any} faceDown small />
            </div>
          )
          const canPlay = playableIds.has(card.id) && !(drawnThisTurn && card.id !== drawnThisTurn.id)
          return (
            <div key={card.id} style={{ flexShrink: 0 }}>
              <CardView card={card as any} small={small} playable={canPlay}
                onClick={canPlay ? () => canPlayCard(card.id) : undefined} />
            </div>
          )
        })}
      </div>
    )
  }

  // Fan layout
  const spread = Math.min(52, n * 5.5) // grados totales del abanico
  const fanH = ch + 70 // altura del contenedor del fan
  const cardSpacing = Math.min(cw * 0.68, (360 / Math.max(n, 1)))

  return (
    <div style={{
      position: 'relative',
      height: fanH,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      {hand.map((card, i) => {
        const mid = (n - 1) / 2
        const rel = i - mid
        const angle = n > 1 ? (rel / Math.max(mid, 1)) * (spread / 2) : 0
        const yDrop = Math.abs(angle) * 2.2
        const isHov = hovered === card.id
        const hidden = card.id === 'hidden' || isBot
        const canPlayThis = !hidden && playableIds.has(card.id) &&
          !(drawnThisTurn && card.id !== drawnThisTurn.id)

        const xOffset = rel * cardSpacing

        return (
          <div
            key={card.id}
            onMouseEnter={() => !hidden && setHovered(card.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `calc(50% - ${cw / 2}px + ${xOffset}px)`,
              transform: isHov
                ? `rotate(${angle}deg) translateY(-22px) scale(1.08)`
                : `rotate(${angle}deg) translateY(${yDrop}px)`,
              transformOrigin: 'bottom center',
              zIndex: isHov ? 100 : i,
              transition: 'transform 0.15s ease, z-index 0s',
              cursor: canPlayThis ? 'pointer' : 'default',
            }}
          >
            {hidden
              ? <CardView card={card as any} faceDown small={isBot} />
              : <CardView
                  card={card as any}
                  playable={canPlayThis}
                  onClick={canPlayThis ? () => canPlayCard(card.id) : undefined}
                />
            }
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Game() {
  const {
    game, playCard, draw, passAfterDraw, chooseColor,
    sayUno, catchUno, startNewRound, resetToSetup, runBot,
    onlineMode, myPlayerId,
  } = useGameStore()

  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'
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

  const t = useT()
  const currentPlayer = game.players[game.currentPlayerIndex]
  const topDiscard = game.discardPile[game.discardPile.length - 1]

  const myPlayer = onlineMode && myPlayerId
    ? (game.players.find(p => p.id === myPlayerId) ?? currentPlayer)
    : currentPlayer

  const isMyTurn = onlineMode
    ? currentPlayer.id === myPlayerId && game.phase === 'playing'
    : !currentPlayer.isBot && game.phase === 'playing'

  // ── ROUND / GAME END ────────────────────────────────────────────────────────
  if (game.phase === 'round-end' || game.phase === 'game-end') {
    const winner = game.players.find(p => p.id === game.roundWinner)
    const isGameEnd = game.phase === 'game-end'
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'radial-gradient(ellipse at 50% 40%, #1a1a3e 0%, #0d0d1a 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: isMobile ? '24px 16px' : 24,
        animation: 'fade-in 0.4s ease',
      }}>
        <div style={{ fontSize: isMobile ? 64 : 88 }}>{isGameEnd ? '🏆' : '🎉'}</div>
        <h1 style={{
          color: '#FFD700', fontSize: isMobile ? 22 : 28,
          textAlign: 'center', margin: 0, fontWeight: 900,
          textShadow: '0 2px 12px rgba(255,215,0,0.4)',
        }}>
          {isGameEnd ? t.gameOver : t.roundOver}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: isMobile ? 14 : 16, margin: 0, textAlign: 'center', padding: '0 8px' }}>
          {game.message}
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: 20,
          padding: isMobile ? '16px 20px' : '20px 28px',
          width: '100%', maxWidth: 360,
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
            {t.scoresLabel}
          </p>
          {game.players.slice().sort((a, b) => (game.scores[b.id] || 0) - (game.scores[a.id] || 0)).map((p, rank) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 18, width: 26 }}>{['🥇','🥈','🥉',''][rank] || ''}</span>
              <span style={{ flex: 1, color: p.id === winner?.id ? '#FFD700' : '#fff', fontWeight: p.id === winner?.id ? 800 : 500, fontSize: 14 }}>
                {p.isBot ? '🤖 ' : '👤 '}{p.name}
              </span>
              <div style={{
                background: p.id === winner?.id ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '4px 12px',
                color: p.id === winner?.id ? '#FFD700' : '#fff', fontWeight: 800, fontSize: 17,
              }}>
                {game.scores[p.id] || 0}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {!isGameEnd && (
            <button onClick={startNewRound} style={{
              padding: '13px 26px',
              background: 'linear-gradient(135deg, #E8171E, #c0121a)',
              color: '#FFD700', border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(232,23,30,0.45)',
            }}>{t.newRound}</button>
          )}
          <button onClick={resetToSetup} style={{
            padding: '13px 26px', background: 'rgba(255,255,255,0.08)',
            color: '#fff', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>{t.mainMenu}</button>
        </div>
      </div>
    )
  }

  // ── PLAYING ─────────────────────────────────────────────────────────────────
  const myHand = myPlayer.hand
  const playableIds = new Set(isMyTurn ? myHand.filter(c => canPlay(c, game)).map(c => c.id) : [])
  const myIdx = game.players.indexOf(myPlayer)
  const opponents = game.players.filter((_, i) => i !== myIdx)
  const colorHex = COLOR_HEX[game.currentColor]
  const canDraw = isMyTurn && !game.drawnThisTurn

  const fanH = smallCards ? CARD_H.sm + 30 : CARD_H.lg + 70

  return (
    <div style={{
      minHeight: '100dvh',
      background: `
        radial-gradient(ellipse at 50% 45%, #2d6a4f 0%, #1b4332 40%, #081c15 100%)
      `,
      display: 'flex', flexDirection: 'column',
    }}>
      {game.phase === 'color-pick' && (onlineMode ? isMyTurn : !currentPlayer.isBot) && (
        <ColorPicker onChoose={(c: CardColor) => chooseColor(c)} />
      )}

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '8px 12px' : '10px 20px',
        background: 'rgba(0,0,0,0.5)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        gap: 8, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={resetToSetup} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: '4px 10px',
            cursor: 'pointer', fontSize: 11, fontWeight: 700,
          }}>{t.exitBtn}</button>
          <LanguageSelector compact />
        </div>

        {/* Scores */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', flex: 1 }}>
          {game.players.map(p => {
            const isActive = p.id === currentPlayer.id
            return (
              <div key={p.id} style={{
                background: isActive ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.06)',
                borderRadius: 20, padding: isMobile ? '3px 9px' : '4px 13px',
                border: `1px solid ${isActive ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.07)'}`,
                display: 'flex', gap: 4, alignItems: 'center',
                transition: 'all 0.3s',
              }}>
                <span style={{ fontSize: isMobile ? 9 : 11 }}>{p.isBot ? '🤖' : '👤'}</span>
                <span style={{ color: isActive ? '#FFD700' : 'rgba(255,255,255,0.8)', fontSize: isMobile ? 10 : 12, fontWeight: isActive ? 800 : 600 }}>
                  {isMobile && p.name.length > 5 ? p.name.slice(0, 5) + '…' : p.name}
                </span>
                <span style={{
                  color: '#FFD700', fontSize: isMobile ? 11 : 13, fontWeight: 900,
                  background: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '0 5px',
                }}>
                  {game.scores[p.id] ?? 0}
                </span>
              </div>
            )
          })}
        </div>

        {/* Color + dirección */}
        <div style={{
          background: colorHex, borderRadius: 20,
          padding: isMobile ? '4px 10px' : '5px 15px',
          color: game.currentColor === 'yellow' ? '#1a1a00' : '#fff',
          fontSize: isMobile ? 11 : 12, fontWeight: 900, flexShrink: 0,
          boxShadow: `0 0 16px ${colorHex}bb`,
          display: 'flex', gap: 4, alignItems: 'center',
          transition: 'background 0.4s, box-shadow 0.4s',
        }}>
          <span style={{ fontSize: 13 }}>{game.direction === 1 ? '→' : '←'}</span>
          <span>{isMobile ? game.currentColor.slice(0,3).toUpperCase() : COLOR_NAME[game.currentColor]}</span>
        </div>
      </div>

      {/* ── OPPONENTS ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: isMobile ? 6 : 10,
        padding: isMobile ? '8px 10px 2px' : '12px 20px 4px', flexWrap: 'wrap',
      }}>
        {opponents.map(p => {
          const isTheirTurn = p.id === currentPlayer.id
          const unoAlert = p.hand.length === 1 && !game.unoSaid[p.id]
          return (
            <div key={p.id} style={{
              background: isTheirTurn
                ? 'rgba(255,215,0,0.12)'
                : 'rgba(0,0,0,0.4)',
              borderRadius: isMobile ? 12 : 16,
              padding: isMobile ? '7px 11px' : '9px 15px',
              display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 9,
              border: `1px solid ${isTheirTurn ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.07)'}`,
              boxShadow: isTheirTurn ? '0 0 20px rgba(255,215,0,0.12)' : 'none',
              transition: 'all 0.3s',
            }}>
              <span style={{ fontSize: isMobile ? 14 : 17 }}>{p.isBot ? '🤖' : '👤'}</span>
              <span style={{ color: '#fff', fontSize: isMobile ? 12 : 14, fontWeight: 700 }}>
                {isMobile && p.name.length > 7 ? p.name.slice(0, 7) + '…' : p.name}
              </span>

              {/* Mini cartas boca abajo en abanico (solo desktop) */}
              {!isMobile && p.hand.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 22, position: 'relative', width: Math.min(p.hand.length, 8) * 7 + 14 }}>
                  {p.hand.slice(0, 8).map((_, idx, arr) => {
                    const totalAngle = Math.min(30, arr.length * 4)
                    const angle = arr.length > 1 ? (idx / (arr.length - 1) - 0.5) * totalAngle : 0
                    return (
                      <div key={idx} style={{
                        position: 'absolute',
                        bottom: 0,
                        left: `${idx * 7}px`,
                        width: 12, height: 18, borderRadius: 3,
                        background: 'linear-gradient(135deg, #a71919, #e53935)',
                        border: '1.5px solid rgba(255,255,255,0.5)',
                        transform: `rotate(${angle}deg)`,
                        transformOrigin: 'bottom center',
                        boxShadow: '1px 1px 3px rgba(0,0,0,0.5)',
                        zIndex: idx,
                      }}/>
                    )
                  })}
                </div>
              )}

              <span style={{
                background: unoAlert ? '#E8171E' : 'rgba(255,255,255,0.1)',
                color: '#fff', borderRadius: 20, padding: isMobile ? '2px 8px' : '3px 9px',
                fontSize: isMobile ? 11 : 12, fontWeight: 800,
                animation: unoAlert ? 'pulse 0.8s ease-in-out infinite' : undefined,
                boxShadow: unoAlert ? '0 0 10px rgba(232,23,30,0.6)' : 'none',
                transition: 'all 0.2s',
              }}>
                {p.hand.length}{p.hand.length === 1 ? ' ⚠️' : ''}
              </span>

              {unoAlert && (
                <button onClick={() => catchUno(p.id)} style={{
                  background: '#E8171E', border: 'none',
                  color: '#FFD700', borderRadius: 8, padding: isMobile ? '3px 9px' : '4px 11px',
                  fontSize: isMobile ? 11 : 12, fontWeight: 900, cursor: 'pointer',
                  animation: 'pulse 0.8s ease-in-out infinite',
                  boxShadow: '0 2px 10px rgba(232,23,30,0.5)',
                }}>¡UNO!</button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── CENTER TABLE ─────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: isMobile ? 32 : 64, padding: isMobile ? '4px 16px' : '8px 32px',
        minHeight: isMobile ? 160 : 220,
        position: 'relative',
      }}>
        {/* Felt circle under piles */}
        <div style={{
          position: 'absolute',
          width: isMobile ? 240 : 380, height: isMobile ? 140 : 200,
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.05)',
          pointerEvents: 'none',
        }}/>

        {/* Mazo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          <div
            onClick={canDraw ? draw : undefined}
            style={{
              position: 'relative',
              cursor: canDraw ? 'pointer' : 'default',
              opacity: canDraw ? 1 : 0.38,
              transition: 'opacity 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => { if (canDraw) e.currentTarget.style.transform = 'scale(1.06) translateY(-3px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {/* Stack layers */}
            {[{ t: -7, l: -7, o: 0.5 }, { t: -3.5, l: -3.5, o: 0.7 }].map((off, i) => (
              <div key={i} style={{
                position: 'absolute', top: off.t, left: off.l,
                width: cw, height: ch,
                background: `linear-gradient(135deg, #8b0000, #c0121a)`,
                borderRadius: 10,
                border: `2.5px solid rgba(255,255,255,${off.o})`,
                boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
                zIndex: i,
              }}/>
            ))}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <CardView card={{ id: 'back', color: 'red', type: 'number', value: null }} faceDown small={smallCards} />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? 11 : 12 }}>
              {game.deck.length} cartas
            </div>
            {canDraw && (
              <div style={{ color: '#4CAF50', fontSize: isMobile ? 11 : 12, fontWeight: 800, marginTop: 2, animation: 'pulse 1.4s ease-in-out infinite' }}>
                ↑ {t.drawPile}
              </div>
            )}
          </div>
        </div>

        {/* Descarte con aura de color */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          {topDiscard && (
            <div style={{
              padding: isMobile ? 6 : 10,
              background: `${colorHex}18`,
              borderRadius: 16,
              boxShadow: `0 0 ${isMobile ? 24 : 44}px ${isMobile ? 8 : 14}px ${colorHex}55, 0 0 80px 24px ${colorHex}18`,
              transition: 'box-shadow 0.5s ease, background 0.5s ease',
            }}>
              <CardView card={topDiscard} small={smallCards} />
            </div>
          )}
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: isMobile ? 11 : 12 }}>{t.discardLabel}</span>
        </div>
      </div>

      {/* ── TURN BANNER ──────────────────────────────────────────────────────── */}
      <div style={{
        margin: isMobile ? '0 10px 6px' : '0 18px 8px',
        borderRadius: 14,
        padding: isMobile ? '9px 12px' : '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: isMyTurn
          ? 'rgba(27,154,61,0.2)'
          : currentPlayer.isBot ? 'rgba(0,0,0,0.35)' : 'rgba(245,216,0,0.1)',
        border: `1px solid ${
          isMyTurn ? 'rgba(27,154,61,0.5)'
          : currentPlayer.isBot ? 'rgba(255,255,255,0.07)'
          : 'rgba(245,216,0,0.25)'}`,
        boxShadow: isMyTurn ? '0 0 20px rgba(27,154,61,0.15)' : 'none',
        gap: 8, transition: 'all 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          {isMyTurn ? (
            <>
              <span style={{ fontSize: 17 }}>✨</span>
              <span style={{ color: '#fff', fontSize: isMobile ? 13 : 14, fontWeight: 800 }}>{t.yourTurn}</span>
            </>
          ) : currentPlayer.isBot ? (
            <>
              <span style={{ fontSize: 17 }}>🤖</span>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: isMobile ? 12 : 13, fontWeight: 700 }}>
                {currentPlayer.name}
              </span>
              <BotDots />
            </>
          ) : (
            <>
              <span style={{ fontSize: 17 }}>⏳</span>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: isMobile ? 12 : 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.msgTurn(currentPlayer.name)}
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {isMyTurn && myHand.length === 1 && !game.unoSaid[myPlayer.id] && (
            <button onClick={sayUno} style={{
              padding: isMobile ? '5px 13px' : '6px 16px',
              background: 'linear-gradient(135deg, #E8171E, #a00)',
              color: '#FFD700', border: 'none', borderRadius: 10,
              fontSize: isMobile ? 12 : 13, fontWeight: 900, cursor: 'pointer',
              boxShadow: '0 3px 14px rgba(232,23,30,0.55)',
              animation: 'pulse 0.85s ease-in-out infinite', letterSpacing: 0.5,
            }}>🗣️ {t.unoBtn}</button>
          )}
          {isMyTurn && game.drawnThisTurn && (
            <button onClick={passAfterDraw} style={{
              padding: isMobile ? '5px 10px' : '6px 13px',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10, fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: 'pointer',
            }}>{t.passBtn}</button>
          )}
          {!isMobile && (
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, maxWidth: 200, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {game.message}
            </span>
          )}
        </div>
      </div>

      {isMobile && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 11, padding: '0 12px 3px', minHeight: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {game.message}
        </div>
      )}

      {/* ── HAND ─────────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(0,0,0,0.5)',
        borderTop: `2px solid ${isMyTurn ? 'rgba(27,154,61,0.5)' : 'rgba(255,255,255,0.06)'}`,
        padding: isMobile ? '4px 12px 14px' : '6px 20px 18px',
        transition: 'border-color 0.3s',
        minHeight: fanH + 30,
      }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 2, textAlign: 'center' }}>
          {onlineMode ? `${myPlayer.name} (${t.meTag})` : myPlayer.name}
          {' · '}{myHand.length} {myHand.length === 1 ? t.cardWord : t.cardsWord}
        </div>

        <FanHand
          hand={myHand as any}
          playableIds={playableIds}
          drawnThisTurn={game.drawnThisTurn}
          canPlayCard={(id) => playCard(id)}
          isBot={myPlayer.isBot}
          small={smallCards}
        />
      </div>
    </div>
  )
}
