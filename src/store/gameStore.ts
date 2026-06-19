import { create } from 'zustand'
import { GameState, CardColor } from '../engine/types'
import {
  initGame, actionPlayCard, actionDraw, actionPassAfterDraw,
  actionChooseColor, actionSayUno, actionCatchUno,
  botPlay, newRound,
} from '../engine/engine'
import { socket } from '../socket/socket'

export interface OnlinePlayer {
  name: string
  id: string
}

interface GameStore {
  // ── Local game ──────────────────────────────────────────────────────────────
  game: GameState | null

  // ── Online state ─────────────────────────────────────────────────────────────
  onlineMode: boolean
  roomCode: string | null
  myPlayerId: string | null
  roomPlayers: OnlinePlayer[]
  isHost: boolean
  roomError: string | null

  // ── Local actions ────────────────────────────────────────────────────────────
  startGame: (players: { name: string; isBot: boolean }[]) => void
  playCard: (cardId: string) => void
  draw: () => void
  passAfterDraw: () => void
  chooseColor: (color: CardColor) => void
  sayUno: () => void
  catchUno: (targetId: string) => void
  startNewRound: () => void
  resetToSetup: () => void
  runBot: () => void

  // ── Online actions ───────────────────────────────────────────────────────────
  createRoom: (name: string) => void
  joinRoom: (code: string, name: string) => void
  startOnlineGame: () => void
  leaveRoom: () => void
  clearRoomError: () => void
}

export const useGameStore = create<GameStore>((set, get) => {

  // ── Wire up socket events once ───────────────────────────────────────────────
  socket.on('room-created', ({ code, myPlayerId, players }) => {
    set({ roomCode: code, myPlayerId, roomPlayers: players, isHost: true, roomError: null })
  })

  socket.on('room-joined', ({ code, myPlayerId, players }) => {
    set({ roomCode: code, myPlayerId, roomPlayers: players, isHost: false, roomError: null })
  })

  socket.on('room-updated', ({ players }) => {
    set({ roomPlayers: players })
  })

  socket.on('room-error', (msg: string) => {
    set({ roomError: msg })
  })

  socket.on('game-state', (state: GameState) => {
    set({ game: state })
  })

  socket.on('player-left', ({ players }) => {
    set({ roomPlayers: players })
  })

  socket.on('disconnect', () => {
    // handled by leaveRoom or natural disconnect
  })

  return {
    game: null,
    onlineMode: false,
    roomCode: null,
    myPlayerId: null,
    roomPlayers: [],
    isHost: false,
    roomError: null,

    // ── Local ──────────────────────────────────────────────────────────────────

    startGame: (players) => set({ game: initGame(players) }),

    playCard: (cardId) => {
      const { onlineMode, roomCode, game } = get()
      if (onlineMode && roomCode) {
        socket.emit('play-card', { code: roomCode, cardId })
      } else {
        set({ game: game ? actionPlayCard(game, cardId) : null })
      }
    },

    draw: () => {
      const { onlineMode, roomCode, game } = get()
      if (onlineMode && roomCode) {
        socket.emit('draw-card', { code: roomCode })
      } else {
        set({ game: game ? actionDraw(game) : null })
      }
    },

    passAfterDraw: () => {
      const { onlineMode, roomCode, game } = get()
      if (onlineMode && roomCode) {
        socket.emit('pass-after-draw', { code: roomCode })
      } else {
        set({ game: game ? actionPassAfterDraw(game) : null })
      }
    },

    chooseColor: (color) => {
      const { onlineMode, roomCode, game } = get()
      if (onlineMode && roomCode) {
        socket.emit('choose-color', { code: roomCode, color })
      } else {
        set({ game: game ? actionChooseColor(game, color) : null })
      }
    },

    sayUno: () => {
      const { onlineMode, roomCode, game, myPlayerId } = get()
      if (onlineMode && roomCode) {
        socket.emit('say-uno', { code: roomCode, playerId: myPlayerId })
      } else if (game) {
        const id = game.players[game.currentPlayerIndex].id
        set({ game: actionSayUno(game, id) })
      }
    },

    catchUno: (targetId) => {
      const { onlineMode, roomCode, game } = get()
      if (onlineMode && roomCode) {
        socket.emit('catch-uno', { code: roomCode, targetId })
      } else {
        set({ game: game ? actionCatchUno(game, targetId) : null })
      }
    },

    startNewRound: () => {
      const { onlineMode, roomCode, game } = get()
      if (onlineMode && roomCode) {
        socket.emit('new-round', { code: roomCode })
      } else {
        set({ game: game ? newRound(game) : null })
      }
    },

    resetToSetup: () => {
      const { onlineMode } = get()
      if (onlineMode) {
        get().leaveRoom()
      } else {
        set({ game: null })
      }
    },

    runBot: () => {
      const { game } = get()
      if (!game) return
      const player = game.players[game.currentPlayerIndex]
      if (!player.isBot || game.phase !== 'playing') return
      const next = botPlay(game)
      set({ game: next })
      setTimeout(() => {
        const { game: g, runBot } = get()
        if (g && g.players[g.currentPlayerIndex].isBot && g.phase === 'playing') runBot()
      }, 900)
    },

    // ── Online ─────────────────────────────────────────────────────────────────

    createRoom: (name) => {
      socket.connect()
      set({ onlineMode: true, game: null, roomCode: null, myPlayerId: null, roomPlayers: [], roomError: null })
      socket.emit('create-room', { name })
    },

    joinRoom: (code, name) => {
      socket.connect()
      set({ onlineMode: true, game: null, roomCode: null, myPlayerId: null, roomPlayers: [], roomError: null })
      socket.emit('join-room', { code: code.toUpperCase(), name })
    },

    startOnlineGame: () => {
      const { roomCode } = get()
      if (roomCode) socket.emit('start-game', { code: roomCode })
    },

    leaveRoom: () => {
      socket.disconnect()
      set({
        onlineMode: false, game: null, roomCode: null,
        myPlayerId: null, roomPlayers: [], isHost: false, roomError: null,
      })
    },

    clearRoomError: () => set({ roomError: null }),
  }
})
