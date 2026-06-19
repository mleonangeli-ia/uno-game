import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { networkInterfaces } from 'os'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
import {
  initGame, actionPlayCard, actionDraw, actionPassAfterDraw,
  actionChooseColor, actionSayUno, actionCatchUno, newRound,
} from '../src/engine/engine.js'
import type { GameState, CardColor, Card } from '../src/engine/types.js'

const app = express()
app.use(cors())

// En producción servimos el build de React como archivos estáticos
if (isProd) {
  const distPath = join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')))
}

// Devuelve las IPs locales de la máquina para que el cliente arme el QR
app.get('/api/network-info', (_req, res) => {
  const ifaces = networkInterfaces()
  const ips: string[] = []
  for (const nets of Object.values(ifaces)) {
    for (const net of nets ?? []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address)
    }
  }
  res.json({ ips })
})

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomPlayer {
  socketId: string
  playerId: string
  name: string
}

interface Room {
  code: string
  players: RoomPlayer[]
  hostSocketId: string
  gameState: GameState | null
}

const rooms = new Map<string, Room>()

// ── Helpers ───────────────────────────────────────────────────────────────────

function genCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase()
}

const HIDDEN: Card = { id: 'hidden', color: 'wild', type: 'number', value: null }

function maskFor(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? p : { ...p, hand: p.hand.map(() => ({ ...HIDDEN })) }
    ),
  }
}

function broadcast(room: Room) {
  if (!room.gameState) return
  for (const rp of room.players) {
    io.to(rp.socketId).emit('game-state', maskFor(room.gameState, rp.playerId))
  }
}

function publicPlayers(room: Room) {
  return room.players.map(p => ({ name: p.name, id: p.playerId }))
}

function roomOf(socketId: string): Room | null {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.socketId === socketId)) return room
  }
  return null
}

// ── Socket events ─────────────────────────────────────────────────────────────

io.on('connection', (socket) => {

  socket.on('create-room', ({ name }: { name: string }) => {
    let code = genCode()
    while (rooms.has(code)) code = genCode()

    const playerId = 'p0'
    const room: Room = {
      code, hostSocketId: socket.id, gameState: null,
      players: [{ socketId: socket.id, playerId, name }],
    }
    rooms.set(code, room)
    socket.join(code)

    socket.emit('room-created', { code, myPlayerId: playerId, players: publicPlayers(room) })
  })

  socket.on('join-room', ({ code, name }: { code: string; name: string }) => {
    const room = rooms.get(code.toUpperCase())
    if (!room)            return socket.emit('room-error', 'Sala no encontrada')
    if (room.gameState)   return socket.emit('room-error', 'El juego ya empezó')
    if (room.players.length >= 6) return socket.emit('room-error', 'Sala llena (máx. 6)')

    const playerId = `p${room.players.length}`
    room.players.push({ socketId: socket.id, playerId, name })
    socket.join(code)

    const players = publicPlayers(room)
    io.to(code).emit('room-updated', { players })
    socket.emit('room-joined', { code, myPlayerId: playerId, players })
  })

  socket.on('start-game', ({ code }: { code: string }) => {
    const room = rooms.get(code)
    if (!room || room.hostSocketId !== socket.id) return
    if (room.players.length < 2)
      return socket.emit('room-error', 'Necesitás al menos 2 jugadores')

    room.gameState = initGame(room.players.map(p => ({ name: p.name, isBot: false })))
    broadcast(room)
  })

  // Generic action handler
  function act(code: string, fn: (s: GameState) => GameState) {
    const room = rooms.get(code)
    if (!room?.gameState) return
    room.gameState = fn(room.gameState)
    broadcast(room)
  }

  socket.on('play-card',      ({ code, cardId }: { code: string; cardId: string }) =>
    act(code, s => actionPlayCard(s, cardId)))

  socket.on('draw-card',      ({ code }: { code: string }) =>
    act(code, s => actionDraw(s)))

  socket.on('pass-after-draw',({ code }: { code: string }) =>
    act(code, s => actionPassAfterDraw(s)))

  socket.on('choose-color',   ({ code, color }: { code: string; color: CardColor }) =>
    act(code, s => actionChooseColor(s, color)))

  socket.on('say-uno',        ({ code, playerId }: { code: string; playerId: string }) =>
    act(code, s => actionSayUno(s, playerId)))

  socket.on('catch-uno',      ({ code, targetId }: { code: string; targetId: string }) =>
    act(code, s => actionCatchUno(s, targetId)))

  socket.on('new-round',      ({ code }: { code: string }) =>
    act(code, s => newRound(s)))

  socket.on('disconnect', () => {
    const room = roomOf(socket.id)
    if (!room) return
    const idx = room.players.findIndex(p => p.socketId === socket.id)
    if (idx === -1) return
    const [gone] = room.players.splice(idx, 1)
    if (room.players.length === 0) {
      rooms.delete(room.code)
    } else {
      if (room.hostSocketId === socket.id) room.hostSocketId = room.players[0].socketId
      io.to(room.code).emit('player-left', {
        name: gone.name,
        players: publicPlayers(room),
      })
    }
  })
})

const PORT = process.env.PORT ?? 3001
httpServer.listen(PORT, () => console.log(`🃏 UNO server on :${PORT}`))
