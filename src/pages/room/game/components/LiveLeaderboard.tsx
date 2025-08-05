import { api } from '@convex/_generated/api'
import { Doc } from '@convex/_generated/dataModel'
import { useQuery } from 'convex/react'
import { Crown, Trophy } from 'lucide-react'

import { getPlayersRanked, LeaderboardPlayer } from '../utils'

import { cn } from '@/lib/utils'

interface LiveLeaderboardProps {
  currentGame: Doc<'games'>
  currentUser: Doc<'users'>
}

interface PlayerRowProps {
  player: LeaderboardPlayer
  position: number
  isCurrentPlayer: boolean
}

const playerColors = {
  1: 'text-player-1',
  2: 'text-player-2',
  3: 'text-player-3',
  4: 'text-player-4',
} as const

const PlayerRow = ({ player, position, isCurrentPlayer }: PlayerRowProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded px-2 py-1 text-xs transition-all duration-300',
        {
          'bg-primary/20 border-primary/30 border': isCurrentPlayer,
          'bg-muted/20': !isCurrentPlayer,
        }
      )}
    >
      <div className="mr-1 flex items-center gap-2">
        <span
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-full pt-1 text-xs font-bold',
            {
              'bg-neon-yellow text-background': position === 1,
              'bg-muted text-foreground': position === 2,
              'bg-neon-orange text-background': position === 3,
              'bg-muted text-muted-foreground': position > 3,
            }
          )}
        >
          {position}
        </span>

        <div
          className={`h-2 w-2 rounded-full ${
            playerColors[player.playerNumber as keyof typeof playerColors]
          }`}
        />

        <span
          className={cn('max-w-20 truncate font-medium', {
            'text-primary': isCurrentPlayer,
            'text-foreground': !isCurrentPlayer,
          })}
        >
          {player.playerName}
          {isCurrentPlayer && <Crown className="ml-1 inline h-3 w-3" />}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cn('font-bold', {
            'text-accent': player.isFinished,
            'text-muted-foreground': !player.isFinished,
          })}
        >
          {player.isFinished ? 'DONE' : `${Math.round(player.progressPercentage)}%`}
        </span>
      </div>
    </div>
  )
}

export const LiveLeaderboard = ({ currentGame, currentUser }: LiveLeaderboardProps) => {
  const players = useQuery(api.games.queries.getPlayersForGame, { gameId: currentGame._id })

  if (!players || players.length === 0) {
    return null
  }

  // Calculate leaderboard with progress percentages and rankings
  const leaderboard = getPlayersRanked(players)

  return (
    <div className="bg-card/50 border-border rounded-lg border p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2">
        <Trophy className="text-neon-yellow mb-0.5 h-4 w-4" />
        <h3 className="text-foreground text-sm font-semibold">Live Standings</h3>
      </div>

      <div className="flex flex-col gap-1">
        {leaderboard.map((player, index) => {
          const isCurrentPlayer = currentUser._id === player.userId
          const position = index + 1

          return (
            <PlayerRow
              key={player.userId}
              player={player}
              position={position}
              isCurrentPlayer={isCurrentPlayer}
            />
          )
        })}
      </div>
    </div>
  )
}
