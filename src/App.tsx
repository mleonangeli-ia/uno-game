import { useGameStore } from './store/gameStore'
import Setup from './screens/Setup'
import OnlineLobby from './screens/OnlineLobby'
import WaitingRoom from './screens/WaitingRoom'
import Game from './screens/Game'

export default function App() {
  const { game, onlineMode, roomCode } = useGameStore()

  if (game) return <Game />
  if (onlineMode && roomCode) return <WaitingRoom />
  if (onlineMode) return <OnlineLobby />
  return <Setup />
}
