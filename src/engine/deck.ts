import { Card, CardColor, CardType } from './types'

const COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue']

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

function card(color: CardColor, type: CardType, value: number | null): Card {
  return { id: uid(), color, type, value }
}

export function createDeck(): Card[] {
  const cards: Card[] = []

  for (const color of COLORS) {
    cards.push(card(color, 'number', 0))
    for (let v = 1; v <= 9; v++) {
      cards.push(card(color, 'number', v))
      cards.push(card(color, 'number', v))
    }
    for (let i = 0; i < 2; i++) {
      cards.push(card(color, 'skip', null))
      cards.push(card(color, 'reverse', null))
      cards.push(card(color, 'draw2', null))
    }
  }

  for (let i = 0; i < 4; i++) {
    cards.push(card('wild', 'wild', null))
    cards.push(card('wild', 'wild4', null))
  }

  return shuffle(cards)
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function drawFromDeck(
  deck: Card[],
  discard: Card[],
  count: number
): { drawn: Card[]; deck: Card[]; discard: Card[] } {
  let d = [...deck]
  let disc = [...discard]

  if (d.length < count) {
    const top = disc[disc.length - 1]
    d = [...d, ...shuffle(disc.slice(0, -1))]
    disc = [top]
  }

  return { drawn: d.slice(0, count), deck: d.slice(count), discard: disc }
}
