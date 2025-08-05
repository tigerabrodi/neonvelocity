import { api } from '@convex/_generated/api'
import { Doc } from '@convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'

import { BottomPersonalStats } from './BottomPersonalStats'
import { GameTimer } from './GameTimer'
import { LiveLeaderboard } from './LiveLeaderboard'
import { PlayerCar } from './PlayerCar'
import { TypingArea } from './TypingArea'

import { Button } from '@/components/ui/button'
import { getErrorMessage, handlePromise } from '@/lib/utils'

type InGameProps = {
  currentGame: Doc<'games'>
  currentRoom: Doc<'rooms'>
  currentUser: Doc<'users'>
}

export function InGame({ currentGame, currentUser, currentRoom }: InGameProps) {
  const playerProgresses = useQuery(api.playerProgress.queries.getPlayersForGame, {
    gameId: currentGame._id,
  })

  const resetGame = useMutation(api.rooms.mutations.resetGame)

  const handleResetGame = async () => {
    const [error] = await handlePromise(
      resetGame({ roomId: currentRoom._id, ownerId: currentUser._id })
    )

    if (error) {
      toast.error(getErrorMessage({ error }))
    }
  }

  const isOwner = currentRoom.ownerId === currentUser._id

  return (
    <div className="bg-background min-h-screen p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {/* Header with Timer and Leaderboard */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-primary text-3xl font-bold">Neon Velocity</h1>
          </div>
          <div className="flex items-start gap-4">
            {isOwner && <Button onClick={handleResetGame}>Reset Game</Button>}

            <LiveLeaderboard currentGame={currentGame} currentUser={currentUser} />
            <GameTimer
              gameStartTime={currentGame.startTime ?? null}
              gameDurationMs={currentGame.durationMs}
              gameStatus={currentGame.status}
            />
          </div>
        </div>

        {/* Racing Track */}
        <div className="flex flex-col gap-8">
          {playerProgresses?.map((playerProgress) => (
            <PlayerCar key={playerProgress._id} playerProgress={playerProgress} />
          ))}
        </div>

        {/* Typing Area */}
        <div className="flex flex-col gap-4">
          <h2 className="text-foreground text-center text-xl font-semibold">Your Race</h2>
          <TypingArea gameId={currentGame._id} gameStatus={currentGame.status} />
        </div>

        {/* Game Stats */}
        <BottomPersonalStats currentGame={currentGame} currentUser={currentUser} />
      </div>
    </div>
  )
}
