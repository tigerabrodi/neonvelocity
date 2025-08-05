import { api } from '@convex/_generated/api'
import { Doc } from '@convex/_generated/dataModel'
import { useQuery } from 'convex/react'

import { formatOrdinals, getPlayersRanked } from '../utils'

type InGameProps = {
  currentGame: Doc<'games'>
  currentUser: Doc<'users'>
}

export function BottomPersonalStats({ currentGame, currentUser }: InGameProps) {
  const playerProgresses = useQuery(api.playerProgress.queries.getPlayersForGame, {
    gameId: currentGame._id,
  })

  const playersRanked = getPlayersRanked(playerProgresses ?? [])

  const myPosition = playersRanked.findIndex((player) => player.userId === currentUser._id) + 1
  const myLeaderboardPlayer = playersRanked.find((player) => player.userId === currentUser._id)

  return (
    <div className="flex justify-center gap-8 text-center">
      <div className="flex flex-col gap-1">
        <div className="text-accent text-2xl font-bold">{formatOrdinals(myPosition)}</div>
        <div className="text-muted-foreground text-sm">Position</div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-primary text-2xl font-bold">
          {myLeaderboardPlayer?.progressPercentage.toFixed(0)}%
        </div>
        <div className="text-muted-foreground text-sm">Progress</div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-neon-orange text-2xl font-bold">
          {myLeaderboardPlayer?.currentStreak}
        </div>
        <div className="text-muted-foreground text-sm">Streak</div>
      </div>
    </div>
  )
}
