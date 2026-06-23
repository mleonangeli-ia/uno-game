import { GameState, Card, CardColor, Player } from './types'
import { createDeck, drawFromDeck } from './deck'
import { canPlay, handPoints } from './rules'
import { getT } from '../i18n'

const cl = (c: CardColor) => getT().colorLabel(c)

// ─── helpers ────────────────────────────────────────────────────────────────

function nextIdx(state: GameState): number {
  const n = state.players.length
  return ((state.currentPlayerIndex + state.direction) % n + n) % n
}

function advance(state: GameState): GameState {
  const idx = nextIdx(state)
  return { ...state, currentPlayerIndex: idx, phase: 'playing', drawnThisTurn: null }
}

function msg(state: GameState, text: string): GameState {
  return { ...state, message: text }
}

// ─── init ────────────────────────────────────────────────────────────────────

export function initGame(players: { name: string; isBot: boolean }[]): GameState {
  const deck = createDeck()
  const gamePlayers: Player[] = players.map((p, i) => ({
    id: `p${i}`,
    name: p.name,
    hand: [],
    isBot: p.isBot,
  }))

  let cursor = 0
  for (const p of gamePlayers) {
    for (let i = 0; i < 7; i++) p.hand.push(deck[cursor++])
  }

  let remaining = deck.slice(cursor)

  let startIdx = remaining.findIndex(c => c.type !== 'wild4')
  if (startIdx === -1) startIdx = 0
  const startCard = remaining[startIdx]
  remaining = [...remaining.slice(0, startIdx), ...remaining.slice(startIdx + 1)]

  const scores: Record<string, number> = {}
  gamePlayers.forEach(p => { scores[p.id] = 0 })

  let state: GameState = {
    players: gamePlayers,
    deck: remaining,
    discardPile: [startCard],
    currentPlayerIndex: 0,
    direction: 1,
    currentColor: startCard.color === 'wild' ? 'red' : startCard.color,
    phase: 'playing',
    unoSaid: {},
    scores,
    roundWinner: null,
    message: '',
    pendingWild: null,
    drawnThisTurn: null,
  }

  state = applyStartCardEffect(state, startCard)
  if (!state.message) {
    state = msg(state, getT().msgTurn(state.players[state.currentPlayerIndex].name))
  }
  return state
}

function applyStartCardEffect(state: GameState, card: Card): GameState {
  if (card.type === 'skip') {
    return advance(msg(state, getT().msgSkipInit))
  }
  if (card.type === 'reverse') {
    const newDir = -1 as -1
    if (state.players.length === 2) return { ...state, direction: newDir }
    const n = state.players.length
    const idx = ((0 + newDir) % n + n) % n
    return { ...state, direction: newDir, currentPlayerIndex: idx, phase: 'playing' }
  }
  if (card.type === 'draw2') {
    const { drawn, deck, discard } = drawFromDeck(state.deck, state.discardPile, 2)
    const newPlayers = state.players.map((p, i) =>
      i === 0 ? { ...p, hand: [...p.hand, ...drawn] } : p
    )
    return advance(msg({ ...state, players: newPlayers, deck, discardPile: discard },
      getT().msgDraw2Init(state.players[0].name)))
  }
  if (card.type === 'wild') {
    return { ...state, phase: 'color-pick', pendingWild: card,
      message: getT().msgWildInit(state.players[0].name) }
  }
  return state
}

// ─── actions ─────────────────────────────────────────────────────────────────

export function actionPlayCard(state: GameState, cardId: string): GameState {
  const player = state.players[state.currentPlayerIndex]
  const card = player.hand.find(c => c.id === cardId)
  if (!card) return state
  if (!canPlay(card, state)) return msg(state, getT().msgInvalid)

  const newHand = player.hand.filter(c => c.id !== cardId)
  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  )

  const newState: GameState = {
    ...state,
    players: newPlayers,
    discardPile: [...state.discardPile, card],
    currentColor: card.color === 'wild' ? state.currentColor : card.color,
    drawnThisTurn: null,
    unoSaid: { ...state.unoSaid, [player.id]: false },
  }

  if (newHand.length === 0) return handleWin(newState, player)

  return applyCardEffect(newState, card)
}

function applyCardEffect(state: GameState, card: Card): GameState {
  const ni = nextIdx(state)
  const next = state.players[ni]

  switch (card.type) {
    case 'skip': {
      const skipTo = nextIdx({ ...state, currentPlayerIndex: ni })
      return msg({ ...state, currentPlayerIndex: skipTo, phase: 'playing', drawnThisTurn: null },
        getT().msgSkip(next.name, state.players[skipTo].name))
    }

    case 'reverse': {
      const newDir = (state.direction * -1) as 1 | -1
      if (state.players.length === 2) {
        return msg({ ...state, direction: newDir, drawnThisTurn: null, phase: 'playing' },
          getT().msgReverse2)
      }
      const n = state.players.length
      const newNi = ((state.currentPlayerIndex + newDir) % n + n) % n
      return msg({ ...state, direction: newDir, currentPlayerIndex: newNi, phase: 'playing', drawnThisTurn: null },
        getT().msgReverse(state.players[newNi].name))
    }

    case 'draw2': {
      const { drawn, deck, discard } = drawFromDeck(state.deck, state.discardPile, 2)
      const newPlayers = state.players.map((p, i) =>
        i === ni ? { ...p, hand: [...p.hand, ...drawn] } : p
      )
      const skipTo = nextIdx({ ...state, currentPlayerIndex: ni })
      return msg({
        ...state, players: newPlayers, deck, discardPile: discard,
        currentPlayerIndex: skipTo, phase: 'playing', drawnThisTurn: null,
      }, getT().msgDraw2(next.name, state.players[skipTo].name))
    }

    case 'wild':
    case 'wild4':
      return { ...state, phase: 'color-pick', pendingWild: card,
        message: getT().msgWild(state.players[state.currentPlayerIndex].name) }

    default:
      return advance(msg(state, getT().msgTurn(next.name)))
  }
}

export function actionChooseColor(state: GameState, color: CardColor): GameState {
  if (state.phase !== 'color-pick' || !state.pendingWild) return state
  const card = state.pendingWild
  const ni = nextIdx(state)
  const next = state.players[ni]

  const base: GameState = { ...state, currentColor: color, pendingWild: null, phase: 'playing' }

  if (card.type === 'wild4') {
    const { drawn, deck, discard } = drawFromDeck(base.deck, base.discardPile, 4)
    const newPlayers = base.players.map((p, i) =>
      i === ni ? { ...p, hand: [...p.hand, ...drawn] } : p
    )
    const skipTo = nextIdx({ ...base, currentPlayerIndex: ni })
    return msg({
      ...base, players: newPlayers, deck, discardPile: discard,
      currentPlayerIndex: skipTo, phase: 'playing', drawnThisTurn: null,
    }, getT().msgDraw4(cl(color), next.name))
  }

  return advance(msg({ ...base, drawnThisTurn: null },
    getT().msgColorChosen(cl(color), next.name)))
}

export function actionDraw(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex]
  const { drawn, deck, discard } = drawFromDeck(state.deck, state.discardPile, 1)
  const drawnCard = drawn[0]
  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: [...p.hand, drawnCard] } : p
  )
  const newState = { ...state, players: newPlayers, deck, discardPile: discard, drawnThisTurn: drawnCard }

  if (canPlay(drawnCard, newState)) {
    return msg(newState, getT().msgDrew(player.name))
  }

  return advance(msg({ ...newState, drawnThisTurn: null },
    getT().msgDrewPassed(player.name, newState.players[nextIdx(newState)].name)))
}

export function actionPassAfterDraw(state: GameState): GameState {
  return advance(msg({ ...state, drawnThisTurn: null },
    getT().msgTurnOf(state.players[nextIdx(state)].name)))
}

export function actionSayUno(state: GameState, playerId: string): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state
  return msg({ ...state, unoSaid: { ...state.unoSaid, [playerId]: true } },
    getT().msgUno(player.name))
}

export function actionCatchUno(state: GameState, targetId: string): GameState {
  const target = state.players.find(p => p.id === targetId)
  if (!target || target.hand.length !== 1 || state.unoSaid[targetId]) return state

  const targetIdx = state.players.findIndex(p => p.id === targetId)
  const { drawn, deck, discard } = drawFromDeck(state.deck, state.discardPile, 2)
  const newPlayers = state.players.map((p, i) =>
    i === targetIdx ? { ...p, hand: [...p.hand, ...drawn] } : p
  )
  return msg({ ...state, players: newPlayers, deck, discardPile: discard },
    getT().msgCatchUno(target.name))
}

// ─── bot AI ──────────────────────────────────────────────────────────────────

export function botPlay(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex]
  if (!player.isBot) return state

  const playable = player.hand.filter(c => canPlay(c, state))
  if (playable.length > 0) {
    const priority = ['wild4', 'wild', 'draw2', 'skip', 'reverse', 'number']
    playable.sort((a, b) => priority.indexOf(a.type) - priority.indexOf(b.type))
    let newState = actionPlayCard(state, playable[0].id)
    if (newState.phase === 'color-pick') {
      const colors: Record<string, number> = { red: 0, yellow: 0, green: 0, blue: 0 }
      player.hand.forEach(c => { if (c.color !== 'wild' && colors[c.color] !== undefined) colors[c.color]++ })
      const best = (Object.entries(colors).sort((a, b) => b[1] - a[1])[0][0]) as CardColor
      newState = actionChooseColor(newState, best)
    }
    return newState
  }

  return actionDraw(state)
}

// ─── round / game end ─────────────────────────────────────────────────────────

function handleWin(state: GameState, winner: Player): GameState {
  const points = state.players
    .filter(p => p.id !== winner.id)
    .reduce((sum, p) => sum + handPoints(p.hand), 0)

  const newScores = { ...state.scores, [winner.id]: (state.scores[winner.id] || 0) + points }
  const gameOver = newScores[winner.id] >= 500

  return {
    ...state,
    scores: newScores,
    roundWinner: winner.id,
    phase: gameOver ? 'game-end' : 'round-end',
    message: gameOver
      ? getT().msgGameWon(winner.name, newScores[winner.id])
      : getT().msgRoundWon(winner.name, points),
  }
}

export function newRound(state: GameState): GameState {
  const fresh = initGame(state.players.map(p => ({ name: p.name, isBot: p.isBot })))
  return { ...fresh, scores: state.scores }
}
