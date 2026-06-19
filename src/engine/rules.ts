import { Card, CardColor, GameState } from './types'

export function canPlay(card: Card, state: GameState): boolean {
  if (card.type === 'wild') return true

  if (card.type === 'wild4') {
    const hand = state.players[state.currentPlayerIndex].hand
    const hasColor = hand.some(c => c.color === state.currentColor && c.id !== card.id)
    return !hasColor
  }

  const top = state.discardPile[state.discardPile.length - 1]
  if (!top) return true

  if (card.color === state.currentColor) return true
  if (card.type !== 'number' && card.type === top.type) return true
  if (card.type === 'number' && top.type === 'number' && card.value === top.value) return true

  return false
}

export function handPoints(hand: Card[]): number {
  return hand.reduce((sum, c) => {
    if (c.type === 'number') return sum + (c.value ?? 0)
    if (c.type === 'skip' || c.type === 'reverse' || c.type === 'draw2') return sum + 20
    return sum + 50  // wild / wild4
  }, 0)
}

export function colorLabel(color: CardColor): string {
  return { red: 'Rojo', yellow: 'Amarillo', green: 'Verde', blue: 'Azul', wild: 'Comodín' }[color]
}

export function cardLabel(card: Card): string {
  if (card.type === 'number') return String(card.value)
  if (card.type === 'skip') return '⊘'
  if (card.type === 'reverse') return '⇄'
  if (card.type === 'draw2') return '+2'
  if (card.type === 'wild') return '🌈'
  return '+4'
}
