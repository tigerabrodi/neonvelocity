import { api } from '@convex/_generated/api'
import { Doc } from '@convex/_generated/dataModel'
import { useQuery } from 'convex/react'

import { Countdown } from './components/Countdown'
import { GameResults } from './components/GameResults'
import { InGame } from './components/InGame'

type GameProps = {
  room: Doc<'rooms'>
  currentUser: Doc<'users'>
}

export function Game({ room, currentUser }: GameProps) {
  const currentGame = useQuery(api.games.queries.getCurrentGame, { roomId: room._id })

  if (!currentGame) {
    return null
  }

  return (
    <>
      {(currentGame.status === 'playing' || currentGame.status === 'countdown') && (
        <InGame currentGame={currentGame} currentUser={currentUser} />
      )}
      {currentGame.status === 'finished' && (
        <GameResults currentGame={currentGame} room={room} currentUser={currentUser} />
        // <InGame currentGame={currentGame} currentUser={currentUser} />
      )}
      {currentGame.status === 'countdown' && <Countdown gameStatus={currentGame.status} />}
    </>
  )
}
