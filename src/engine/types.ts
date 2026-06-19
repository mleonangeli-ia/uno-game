export type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild'
export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4'

export interface Card {
  id: string
  color: CardColor
  type: CardType
  value: number | null
}

export interface Player {
  id: string
  name: string
  hand: Card[]
  isBot: boolean
}

export type GamePhase =
  | 'playing'       // turno activo
  | 'color-pick'    // eligiendo color tras comodín
  | 'round-end'     // alguien ganó la ronda
  | 'game-end'      // alguien llegó a 500 puntos

export interface GameState {
  players: Player[]
  deck: Card[]
  discardPile: Card[]
  currentPlayerIndex: number
  direction: 1 | -1
  currentColor: CardColor
  phase: GamePhase
  unoSaid: Record<string, boolean>
  scores: Record<string, number>
  roundWinner: string | null
  message: string
  pendingWild: Card | null   // comodín esperando elección de color
  drawnThisTurn: Card | null // carta robada este turno (puede jugarse)
}
