# RFC-001: UNO Web — Especificación técnica

**Versión:** 1.0  
**Estado:** Final (inferido de código fuente)  
**Stack:** Node.js + Express + Socket.io · React 18 + TypeScript · Zustand · Vite

---

## Índice

1. [Resumen](#1-resumen)
2. [Motivación y alcance](#2-motivación-y-alcance)
3. [Arquitectura general](#3-arquitectura-general)
4. [Modelo de datos](#4-modelo-de-datos)
5. [Motor de juego (engine)](#5-motor-de-juego-engine)
6. [Protocolo cliente-servidor](#6-protocolo-cliente-servidor)
7. [API HTTP](#7-api-http)
8. [Gestión de estado en el cliente](#8-gestión-de-estado-en-el-cliente)
9. [Componentes de UI](#9-componentes-de-ui)
10. [Sistema de diseño responsivo](#10-sistema-de-diseño-responsivo)
11. [Reglas del juego implementadas](#11-reglas-del-juego-implementadas)
12. [Invariantes y restricciones de seguridad](#12-invariantes-y-restricciones-de-seguridad)
13. [Limitaciones conocidas](#13-limitaciones-conocidas)

---

## 1. Resumen

Este documento especifica el diseño técnico del juego UNO web, capaz de operar en dos modos:

- **Modo local**: 2–4 jugadores en el mismo dispositivo (con soporte de bots).
- **Modo online**: N jugadores reales en dispositivos distintos conectados por WebSocket, sin límite fijo (hasta 6 por sala por restricción de UX).

El sistema es **autoritative-server**: toda la lógica de juego corre en el servidor; los clientes son presentación pura. El estado que cada cliente recibe está personalizado —solo contiene sus propias cartas en claro, las de los demás enmascaradas.

---

## 2. Motivación y alcance

### En alcance

- Motor de juego completo con reglas oficiales de UNO.
- Multijugador en tiempo real vía Socket.io.
- Modo local con bots (IA simple).
- Salas identificadas por código de 4 caracteres.
- QR code auto-generado para que otros dispositivos se unan sin tipear URLs.
- UI responsive: mobile (< 600px), tablet (600–1024px), desktop (> 1024px).

### Fuera de alcance

- Autenticación/cuentas de usuario.
- Persistencia de partidas (no hay base de datos).
- Reconexión tras desconexión inesperada.
- Apilamiento de cartas +2/+4 (house rule).
- Modo espectador.

---

## 3. Arquitectura general

```
┌─────────────────────────────────────────────────────┐
│                   Navegador (cliente)                │
│                                                      │
│  React App (Vite dev / build estático)               │
│  ├── src/screens/        — pantallas                 │
│  ├── src/components/     — UI reutilizable           │
│  ├── src/store/          — Zustand (estado global)   │
│  ├── src/engine/         — lógica pura (shared)      │
│  ├── src/socket/         — socket.io-client          │
│  └── src/hooks/          — hooks utilitarios         │
│                                                      │
│  WebSocket (/socket.io)    HTTP GET (/api/*)         │
└──────────────────┬────────────────────┬─────────────┘
                   │                    │
┌──────────────────▼────────────────────▼─────────────┐
│              Node.js Server  :3001                   │
│                                                      │
│  Express                                             │
│  ├── GET /api/network-info   — IPs de la máquina     │
│  └── Socket.io               — eventos de juego      │
│       └── Map<code, Room>    — estado en memoria     │
│                                                      │
│  src/engine/  (mismo código que el cliente, TS puro) │
└─────────────────────────────────────────────────────┘
```

**Decisión clave:** el directorio `src/engine/` es compartido entre cliente y servidor. No hay duplicación de lógica de negocio. El cliente la usa en modo local; el servidor la usa para toda partida online.

---

## 4. Modelo de datos

### 4.1 Primitivas de carta

```typescript
type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild'
type CardType  = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4'

interface Card {
  id: string          // UUID aleatorio (Math.random().toString(36))
  color: CardColor
  type: CardType
  value: number | null  // 0–9 para numéricas; null para especiales
}
```

**Carta oculta** (usada en estado enmascarado para otros jugadores):
```typescript
const HIDDEN: Card = { id: 'hidden', color: 'wild', type: 'number', value: null }
```

### 4.2 Jugador

```typescript
interface Player {
  id: string      // 'p0', 'p1', … 'p5'
  name: string
  hand: Card[]
  isBot: boolean  // siempre false en modo online
}
```

### 4.3 Estado de juego

```typescript
type GamePhase = 'playing' | 'color-pick' | 'round-end' | 'game-end'

interface GameState {
  players: Player[]
  deck: Card[]
  discardPile: Card[]
  currentPlayerIndex: number
  direction: 1 | -1           // 1 = sentido horario, -1 = antihorario
  currentColor: CardColor     // color activo (puede diferir del top del descarte en wildcards)
  phase: GamePhase
  unoSaid: Record<string, boolean>  // playerId → si dijo UNO
  scores: Record<string, number>    // playerId → puntos acumulados
  roundWinner: string | null
  message: string                   // texto descriptivo de la última acción
  pendingWild: Card | null          // comodín jugado esperando elección de color
  drawnThisTurn: Card | null        // carta robada este turno (puede jugarse o no)
}
```

### 4.4 Composición del mazo

108 cartas según reglas oficiales:

| Tipo | Por color | Colores | Total |
|------|-----------|---------|-------|
| Número 0 | 1 | 4 | 4 |
| Números 1–9 | 2 cada uno | 4 | 72 |
| Skip | 2 | 4 | 8 |
| Reverse | 2 | 4 | 8 |
| Draw Two | 2 | 4 | 8 |
| Wild | — | — | 4 |
| Wild Draw Four | — | — | 4 |
| **Total** | | | **108** |

---

## 5. Motor de juego (engine)

El engine es **puro**: funciones sin efectos secundarios que reciben `GameState` y devuelven `GameState` nuevo. No hay mutación in-place.

### 5.1 Inicialización (`initGame`)

```
initGame(players) →
  1. Crear mazo de 108 cartas
  2. Shuffle Fisher-Yates
  3. Repartir 7 cartas a cada jugador
  4. Buscar primera carta no-Wild4 para el descarte inicial
  5. Construir GameState base (phase: 'playing')
  6. Aplicar efecto de carta inicial si corresponde
```

**Efectos de carta inicial:**
- `skip` → avanzar turno (primer jugador pierde su turno)
- `reverse` → invertir dirección (con 2 jugadores equivale a skip)
- `draw2` → primer jugador roba 2 y pierde turno
- `wild` → fase `color-pick` para el primer jugador
- `wild4` → **nunca** puede ser carta inicial (excluida en paso 4)

### 5.2 Índice del siguiente jugador

```typescript
nextIdx = ((currentIdx + direction) % n + n) % n
```

El doble módulo garantiza resultado positivo con `direction = -1`.

### 5.3 Función `advance`

Mueve `currentPlayerIndex` al siguiente y resetea `drawnThisTurn = null`. En modo online no hay más fases especiales entre turnos (se eliminó `pass-device`).

### 5.4 Acciones disponibles

| Acción | Precondición | Efecto |
|--------|-------------|--------|
| `actionPlayCard(state, cardId)` | `canPlay(card, state) === true` | Aplica efecto de carta, avanza turno |
| `actionDraw(state)` | No robó este turno | Roba 1 carta; si es jugable → `drawnThisTurn`; si no → avanza turno |
| `actionPassAfterDraw(state)` | `drawnThisTurn !== null` | Avanza turno sin jugar la carta robada |
| `actionChooseColor(state, color)` | `phase === 'color-pick'` | Setea `currentColor`, aplica efecto de +4 si corresponde |
| `actionSayUno(state, playerId)` | Cualquier momento | Marca `unoSaid[playerId] = true` |
| `actionCatchUno(state, targetId)` | Target tiene 1 carta y `!unoSaid[targetId]` | Target roba 2 cartas |
| `newRound(state)` | `phase` es `round-end` o `game-end` | Re-inicializa con scores preservados |

### 5.5 Regla `canPlay`

```
canPlay(card, state):
  if card.type === 'wild'  → true siempre
  if card.type === 'wild4' → true solo si el jugador NO tiene cartas del color actual
  if card.color === state.currentColor → true
  if card.type coincide con top del descarte (no-number) → true
  if card.type === 'number' y card.value === top.value → true
  → false
```

### 5.6 Efectos de cartas especiales

| Carta | Efecto |
|-------|--------|
| `skip` | Calcula `skipTo = nextIdx(nextIdx)`, avanza a ese índice |
| `reverse` | Invierte `direction`; con 2 jugadores actúa como skip |
| `draw2` | Siguiente jugador roba 2, fase avanza al índice después del afectado |
| `wild` | Fase `color-pick`; turno no avanza hasta elegir color |
| `wild4` | Fase `color-pick`; al elegir: siguiente roba 4 y pierde turno |

### 5.7 Fin de ronda y puntuación

Cuando `newHand.length === 0`:
```
points = Σ handPoints(p.hand) para p ≠ winner
  donde handPoints(c):
    number  → c.value
    skip/reverse/draw2 → 20
    wild/wild4 → 50

scores[winner.id] += points
gameOver = scores[winner.id] >= 500
```

### 5.8 IA de bots

Estrategia greedy con prioridad de tipo:

```
priority = ['wild4', 'wild', 'draw2', 'skip', 'reverse', 'number']
```

1. Filtra cartas jugables.
2. Ordena por prioridad (cartas especiales primero).
3. Juega la primera.
4. Si queda en `color-pick`: elige el color más frecuente en su mano.
5. Si no tiene jugables: roba.

---

## 6. Protocolo cliente-servidor

### 6.1 Conexión

El cliente usa `socket.io-client` con `autoConnect: false`. La conexión se establece explícitamente al llamar `createRoom` o `joinRoom`.

Vite proxea `/socket.io` al servidor en `:3001` durante desarrollo.

### 6.2 Estructura de Room (servidor)

```typescript
interface RoomPlayer {
  socketId: string    // ID del socket de Socket.io
  playerId: string    // 'p0', 'p1', … (orden de unión)
  name: string
}

interface Room {
  code: string           // 4 chars uppercase alfanumérico
  players: RoomPlayer[]
  hostSocketId: string   // quien puede iniciar la partida
  gameState: GameState | null
}
```

### 6.3 Eventos Cliente → Servidor

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `create-room` | `{ name }` | Crea sala nueva; responde con `room-created` |
| `join-room` | `{ code, name }` | Valida y une al jugador; responde con `room-joined` |
| `start-game` | `{ code }` | Solo host; inicia la partida |
| `play-card` | `{ code, cardId }` | Juega una carta |
| `draw-card` | `{ code }` | Roba del mazo |
| `pass-after-draw` | `{ code }` | Pasa sin jugar la carta robada |
| `choose-color` | `{ code, color }` | Elige color tras comodín |
| `say-uno` | `{ code, playerId }` | Declara UNO |
| `catch-uno` | `{ code, targetId }` | Denuncia que alguien no dijo UNO |
| `new-round` | `{ code }` | Inicia nueva ronda (cualquier jugador puede pedirlo) |

### 6.4 Eventos Servidor → Cliente

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `room-created` | `{ code, myPlayerId, players }` | Confirmación de creación |
| `room-joined` | `{ code, myPlayerId, players }` | Confirmación de unión |
| `room-updated` | `{ players }` | Broadcast cuando alguien nuevo se une |
| `room-error` | `string` | Error de sala (no existe, llena, etc.) |
| `game-state` | `GameState` (enmascarado) | Estado personalizado tras cada acción |
| `player-left` | `{ name, players }` | Un jugador se desconectó |

### 6.5 Enmascaramiento de estado

Antes de enviar `game-state` a cada jugador, el servidor aplica `maskFor`:

```typescript
function maskFor(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId
        ? p                                    // sus cartas en claro
        : { ...p, hand: p.hand.map(() => HIDDEN) }  // cartas ajenas → HIDDEN
    ),
  }
}
```

El cliente detecta cartas ocultas por `card.id === 'hidden'` y las renderiza boca abajo.

### 6.6 Flujo de sala (happy path)

```
Host                          Servidor                        Jugador B
  │── create-room ──────────────►│                                │
  │◄── room-created ─────────────│                                │
  │                              │◄──── join-room ────────────────│
  │◄── room-updated ─────────────│──── room-joined ──────────────►│
  │── start-game ────────────────►│                               │
  │◄── game-state (masked) ──────│──── game-state (masked) ──────►│
  │── play-card ─────────────────►│                               │
  │◄── game-state ───────────────│──── game-state ───────────────►│
  │                             ...                               │
```

### 6.7 Desconexión

Al desconectarse un socket:
1. Se elimina al jugador de `room.players`.
2. Si era el host, se reasigna `hostSocketId` al primer jugador restante.
3. Si la sala queda vacía, se elimina del Map.
4. Se emite `player-left` al resto.

No hay reconexión implementada: si el juego ya inició y un jugador se cae, su slot queda vacío pero el juego continúa.

---

## 7. API HTTP

### `GET /api/network-info`

**Propósito:** Devuelve las IPs IPv4 locales (no loopback) de la máquina que corre el servidor. El cliente las usa para construir la URL del QR code.

**Response:**
```json
{ "ips": ["192.168.1.42", "10.0.0.5"] }
```

**Lógica:** Itera `os.networkInterfaces()`, filtra `family === 'IPv4' && !internal`.

**Uso:** El componente `QRCard` construye `http://{ips[0]}:{port}/?join={roomCode}` y genera el QR.

---

## 8. Gestión de estado en el cliente

### 8.1 Store unificado (Zustand)

Un único store (`useGameStore`) maneja ambos modos de juego. Las acciones son isomorfas: en modo local modifican el estado directamente; en modo online emiten el evento socket equivalente y esperan `game-state` del servidor.

```typescript
// Acción isomorfa (ejemplo)
playCard: (cardId) => {
  if (onlineMode && roomCode) {
    socket.emit('play-card', { code: roomCode, cardId })
    // El store se actualiza al recibir 'game-state'
  } else {
    set({ game: actionPlayCard(game, cardId) })
  }
}
```

### 8.2 Campos del store

```typescript
// Estado de partida
game: GameState | null

// Modo online
onlineMode: boolean
roomCode: string | null
myPlayerId: string | null        // 'p0'–'p5'; null en modo local
roomPlayers: OnlinePlayer[]      // lista pública { name, id }
isHost: boolean
roomError: string | null
```

### 8.3 Listeners de socket

Los listeners se registran una sola vez en la inicialización del store (closure de Zustand):

```typescript
socket.on('game-state', (state) => set({ game: state }))
socket.on('room-created', ({ code, myPlayerId, players }) =>
  set({ roomCode: code, myPlayerId, roomPlayers: players, isHost: true }))
// etc.
```

### 8.4 Derivaciones en la pantalla de juego

```typescript
// Modo local: myPlayer = currentPlayer (quien tiene el turno)
// Modo online: myPlayer = siempre el jugador que soy yo
const myPlayer = onlineMode && myPlayerId
  ? game.players.find(p => p.id === myPlayerId) ?? currentPlayer
  : currentPlayer

// Mi turno en local: no es un bot
// Mi turno en online: soy el currentPlayer
const isMyTurn = onlineMode
  ? currentPlayer.id === myPlayerId && game.phase === 'playing'
  : !currentPlayer.isBot && game.phase === 'playing'
```

---

## 9. Componentes de UI

### 9.1 Árbol de pantallas

```
App
├── Setup              — configuración local (jugadores/bots) + acceso a online
├── OnlineLobby        — crear sala / unirse con código; lee ?join= de URL
├── WaitingRoom        — sala de espera: QR, lista de jugadores, botón iniciar
└── Game
    ├── ColorPicker    — modal de selección de color (overlay)
    ├── [top bar]      — scores + color activo + dirección
    ├── [opponents]    — chips de oponentes con conteo de cartas
    ├── [center table] — mazo (pila visual) + descarte (aura de color)
    ├── [turn banner]  — "¡Tu turno!" / "Bot pensando…" / "Turno de X"
    └── [hand]         — cartas del jugador activo/propio
```

### 9.2 `CardView`

Props:
```typescript
{
  card: Card
  onClick?: () => void
  disabled?: boolean
  playable?: boolean   // muestra glow verde + badge "▲ jugá"
  faceDown?: boolean   // muestra dorso UNO
  size?: 'sm' | 'md' | 'lg'  // sm=52×76, md=72×104, lg=100×146
}
```

Comportamiento:
- `playable && isClickable` → animación CSS `glow-playable` + badge flotante.
- `hovered && isClickable` → `translateY(-16px)` + escala 1.06.
- `faceDown` → render de dorso con texto "UNO" en dorado.
- Sin `filter: grayscale` en cartas no jugables (el usuario quiere ver sus colores).

### 9.3 `QRCard`

1. Fetch a `/api/network-info` para obtener IPs locales.
2. Construye URL: `http://{ip}:{port}/?join={roomCode}`.
3. Genera QR con `qrcode.toDataURL()` (PNG base64).
4. Fallback a `window.location.origin` si falla el fetch.
5. Botón "📋 Copiar" usa `navigator.clipboard.writeText`.

### 9.4 Flujo de unión por QR

```
Escanear QR → abrir URL con ?join=ABCD
  → App renderiza Setup (no tiene game ni onlineMode)
  → useEffect en OnlineLobby detecta ?join=ABCD
  → setCode('ABCD'), setTab('join')
  → window.history.replaceState limpia el param
  → usuario solo ingresa nombre y presiona "Unirse"
```

---

## 10. Sistema de diseño responsivo

### 10.1 Breakpoints

```typescript
// src/hooks/useBreakpoint.ts
mobile:  width < 600px
tablet:  600px – 1023px
desktop: ≥ 1024px
```

El hook usa `window.resize` para reactividad.

### 10.2 Adaptaciones por breakpoint

| Elemento | Mobile | Desktop |
|----------|--------|---------|
| Cartas en mano | `md` (72×104) | `lg` (100×146) |
| Cartas de bots | `sm` (52×76) | `sm` (52×76) |
| Fan de mini-cartas (oponentes) | Oculto | Visible |
| Layout WaitingRoom | 1 columna | 2 columnas |
| Nombre en puntajes | Truncado a 5 chars | Completo |
| Color en header | Abreviado (3 chars) | Nombre completo |
| minHeight | `100dvh` | `100dvh` |
| Mensaje de turno | Separado del banner | Inline en el banner |

### 10.3 `100dvh` vs `100vh`

Se usa `minHeight: '100dvh'` (dynamic viewport height) en todas las pantallas para evitar el problema clásico en Safari/Chrome mobile donde la barra de navegación recorta el contenido. `dvh` excluye la UI del navegador del cálculo.

---

## 11. Reglas del juego implementadas

| Regla | Estado |
|-------|--------|
| Mazo de 108 cartas (composición oficial) | ✅ |
| 7 cartas iniciales por jugador | ✅ |
| Carta inicial especial aplica efecto | ✅ |
| Wild4 nunca puede ser carta inicial | ✅ |
| Jugar por color, número o símbolo | ✅ |
| Robar 1 si no hay jugada válida | ✅ |
| Carta robada puede jugarse inmediatamente (opcional) | ✅ |
| Skip: siguiente pierde turno | ✅ |
| Reverse: invierte dirección | ✅ |
| Reverse con 2 jugadores = Skip | ✅ |
| Draw Two: siguiente roba 2 y pierde turno | ✅ |
| Wild: elige color libremente | ✅ |
| Wild Draw Four: elige color + siguiente roba 4 | ✅ |
| Wild4 ilegal si tenés carta del color activo | ✅ |
| Gritar UNO con 1 carta | ✅ |
| Penalización (+2 cartas) por no gritar UNO | ✅ |
| Puntuación por ronda (valores de cartas del perdedor) | ✅ |
| Meta de 500 puntos para ganar la partida | ✅ |
| No apilamiento de +2/+4 | ✅ (no implementado, conforme a reglas oficiales) |

---

## 12. Invariantes y restricciones de seguridad

- **Estado autoritativo:** Solo el servidor modifica `GameState` en modo online. El cliente no puede alterar el estado directamente.
- **Validación en engine:** `canPlay` valida cada carta antes de aplicar efectos. Una carta inválida devuelve el estado inalterado con un mensaje de error.
- **Enmascaramiento garantizado:** `maskFor` siempre se aplica antes de enviar a cada cliente. El servidor nunca expone manos ajenas.
- **Autorización de inicio:** Solo el host (primera persona que creó la sala) puede emitir `start-game`.
- **Tamaño máximo de sala:** 6 jugadores. Rechazado en servidor con `room-error`.
- **Partida en curso:** `join-room` falla si `room.gameState !== null`.

---

## 13. Limitaciones conocidas

| Limitación | Descripción |
|------------|-------------|
| Sin persistencia | Las salas viven en memoria del proceso. Un reinicio del servidor destruye todas las partidas. |
| Sin reconexión | Si un jugador pierde conexión durante la partida, su slot queda bloqueado. |
| IPs en QR sin HTTPS | La URL generada es `http://`, no funciona para acceso desde fuera de la red local. |
| Puerto Vite hardcodeado | `QRCard` usa `window.location.port` que puede variar si el puerto 5173 está ocupado. |
| `new-round` sin control de host | Cualquier jugador puede solicitar nueva ronda (no solo el ganador o el host). |
| Bot en local no espera turno visual | El bot juega después de 900ms para dar sensación de "pensamiento", pero no hay feedback visual durante ese tiempo más allá de los puntos animados. |
| UNO timing no enforced | La penalización por no gritar UNO depende de que otro jugador presione el botón manualmente. No hay ventana de tiempo automática. |

---

*Documento generado por ingeniería inversa del código fuente. Versión del código analizada: estado final del branch principal a junio 2026.*
