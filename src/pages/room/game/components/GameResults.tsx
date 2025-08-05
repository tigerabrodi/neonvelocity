import { api } from '@convex/_generated/api'
import { Doc } from '@convex/_generated/dataModel'
import { GOAL_DISTANCE } from '@convex/games/mutations'
import { useMutation, useQuery } from 'convex/react'
import { Award, Medal, Timer, Trophy } from 'lucide-react'
import { generatePath, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/constants'
import { cn, getErrorMessage, handlePromise } from '@/lib/utils'

type RankedPlayer = Doc<'playerProgress'> & {
  finalPosition: number
}

interface GameResultsProps {
  currentGame: Doc<'games'>
  room: Doc<'rooms'>
  currentUser: Doc<'users'>
}

// Shared utility functions
const formatTime = (seconds?: number) => {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatDistance = (distance?: number) => {
  if (!distance) return '0%'
  return `${Math.round(distance)}%`
}

// Calculate elapsed time from game start
const calculateElapsedTime = (finishTime?: number, gameStartTime?: number) => {
  if (!finishTime || !gameStartTime) return undefined
  return Math.floor((finishTime - gameStartTime) / 1000) // Convert to seconds
}

interface PodiumItemProps {
  player: RankedPlayer
  index: number
  gameStartTime?: number
}

const PodiumItem = ({ player, index, gameStartTime }: PodiumItemProps) => {
  const heights = ['h-32', 'h-24', 'h-20']

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="text-neon-yellow animate-neon-pulse h-6 w-6" />
      case 2:
        return <Medal className="text-muted-foreground h-6 w-6" />
      case 3:
        return <Award className="text-neon-orange h-6 w-6" />
      default:
        return (
          <div className="text-muted-foreground flex h-6 w-6 items-center justify-center text-sm font-bold">
            {position}
          </div>
        )
    }
  }

  const getPlayerColor = (playerNumber: number) => {
    const colors = {
      1: 'text-player-1',
      2: 'text-player-2',
      3: 'text-player-3',
      4: 'text-player-4',
    }
    return colors[playerNumber as keyof typeof colors] || 'text-muted-foreground'
  }

  const getPositionGlow = (position: number) => {
    if (position === 1) return 'shadow-[0_0_20px_hsl(var(--neon-yellow))]'
    if (position === 2) return 'shadow-lg'
    if (position === 3) return 'shadow-[0_0_15px_hsl(var(--neon-orange))]'
    return 'shadow-sm'
  }

  const elapsedTime = calculateElapsedTime(player.finishTime, gameStartTime)

  return (
    <div className="flex flex-col items-center">
      <div className="mb-2">{getPositionIcon(player.finalPosition)}</div>
      <div
        className={cn(
          `${heights[index]} bg-gradient-track border-border relative flex w-24 flex-col items-center justify-end rounded-t-lg border p-2`,
          getPositionGlow(player.finalPosition)
        )}
      >
        <div className="text-center">
          <div className={cn('text-sm font-bold', getPlayerColor(player.playerNumber))}>
            {player.playerName}
          </div>
          <div className="text-muted-foreground text-xs">
            {player.isFinished && elapsedTime !== undefined
              ? formatTime(elapsedTime)
              : formatDistance((player.distancePosition / GOAL_DISTANCE) * 100)}
          </div>
        </div>
        <div className="text-muted-foreground absolute -bottom-6 text-xs">
          #{player.finalPosition}
        </div>
      </div>
    </div>
  )
}

interface ResultRowProps {
  player: RankedPlayer
  gameStartTime?: number
}

const ResultRow = ({ player, gameStartTime }: ResultRowProps) => {
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="text-neon-yellow animate-neon-pulse h-6 w-6" />
      case 2:
        return <Medal className="text-muted-foreground h-6 w-6" />
      case 3:
        return <Award className="text-neon-orange h-6 w-6" />
      default:
        return (
          <div className="text-muted-foreground flex h-6 w-6 items-center justify-center text-sm font-bold">
            {position}
          </div>
        )
    }
  }

  const getPlayerColor = (playerNumber: number) => {
    const colors = {
      1: 'text-player-1',
      2: 'text-player-2',
      3: 'text-player-3',
      4: 'text-player-4',
    }
    return colors[playerNumber as keyof typeof colors] || 'text-muted-foreground'
  }

  const elapsedTime = calculateElapsedTime(player.finishTime, gameStartTime)

  return (
    <div className="hover:bg-muted/50 p-4 transition-colors">
      <div className="flex items-center gap-4">
        {/* Position & Icon */}
        <div className="flex w-16 items-center gap-2">
          {getPositionIcon(player.finalPosition)}
          <span className="text-lg font-bold">{player.finalPosition}</span>
        </div>

        {/* Player Name */}
        <div className="flex-1">
          <div className={cn('font-semibold', getPlayerColor(player.playerNumber))}>
            {player.playerName}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1">
            <Timer className="text-primary mb-1 h-4 w-4" />
            <span className="font-medium">
              {player.isFinished && elapsedTime !== undefined
                ? formatTime(elapsedTime)
                : formatDistance((player.distancePosition / GOAL_DISTANCE) * 100)}
            </span>
          </div>

          <div className="text-muted-foreground">
            {Math.round((player.distancePosition / GOAL_DISTANCE) * 100)}%
          </div>

          <div className="text-muted-foreground">{player.totalCharactersTyped} chars</div>
        </div>
      </div>
    </div>
  )
}

export const GameResults = ({ currentGame, room, currentUser }: GameResultsProps) => {
  const navigate = useNavigate()

  const players = useQuery(api.games.queries.getPlayersForGame, { gameId: currentGame._id })
  const playAgain = useMutation(api.rooms.mutations.playAgain)
  const leaveRoom = useMutation(api.rooms.mutations.leaveRoom)

  const isOwner = room.ownerId === currentUser._id

  if (!players) {
    return <div>Loading results...</div>
  }

  const rankedPlayers: Array<RankedPlayer> = players
    .sort((a, b) => {
      // First: Anyone who finished, sorted by finish time (earliest wins)
      if (a.isFinished && b.isFinished) {
        return (a.finishTime || 0) - (b.finishTime || 0)
      }
      if (a.isFinished && !b.isFinished) return -1
      if (!a.isFinished && b.isFinished) return 1

      // Second: Among non-finishers, sort by distance (highest wins)
      return b.distancePosition - a.distancePosition
    })
    .map((player, index) => ({
      ...player,
      finalPosition: index + 1,
    }))

  const handlePlayAgain = async () => {
    const [error] = await handlePromise(playAgain({ roomId: room._id }))
    if (error) {
      toast.error(error.message)
    }
  }

  const handleLeaveRoom = async () => {
    const [error] = await handlePromise(
      leaveRoom({
        roomId: room._id,
      })
    )

    if (error) {
      toast.error(getErrorMessage({ error, fallbackText: 'Failed to leave room' }))
    }

    void navigate(generatePath(ROUTES.roomDetail, { roomId: currentUser.roomId }))
  }

  const gameTimeSeconds = currentGame.durationMs ? Math.floor(currentGame.durationMs / 1000) : 60

  return (
    <div className="absolute top-[40%] left-1/2 flex w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-primary text-4xl font-bold">RACE COMPLETE!</h1>
        <div className="text-muted-foreground text-lg">
          Game Duration: {formatTime(gameTimeSeconds)}
        </div>
      </div>

      {/* Podium for top 3 */}
      <div className="mb-8 flex items-end justify-center gap-4">
        {[2, 1, 3].map((position, index) => {
          const player = rankedPlayers.find((p) => p.finalPosition === position)
          if (!player) return null

          return (
            <PodiumItem
              key={player.userId}
              player={player}
              index={index}
              gameStartTime={currentGame.startTime}
            />
          )
        })}
      </div>

      {/* Detailed Results Table */}
      <div className="bg-card border-border overflow-hidden rounded-lg border shadow-lg">
        <div className="bg-muted border-border border-b p-4">
          <h3 className="text-foreground text-lg font-semibold">Detailed Results</h3>
        </div>

        <div className="divide-border divide-y">
          {rankedPlayers.map((player) => (
            <ResultRow key={player.userId} player={player} gameStartTime={currentGame.startTime} />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {isOwner && (
          <Button
            onClick={handlePlayAgain}
            className="bg-gradient-neon hover:shadow-glow-primary font-bold"
          >
            Play Again!
          </Button>
        )}
        {!isOwner && (
          <Button
            variant="outline"
            className="border-destructive/30 hover:border-destructive text-destructive hover:bg-destructive/10"
            onClick={handleLeaveRoom}
          >
            Leave Room
          </Button>
        )}
      </div>
    </div>
  )
}
