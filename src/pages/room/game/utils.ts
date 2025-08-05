import { Doc } from '@convex/_generated/dataModel'

import { GOAL_DISTANCE } from '@/lib/constants'

export type LeaderboardPlayer = Doc<'playerProgress'> & {
  progressPercentage: number
}

export function getPlayersRanked(players: Array<Doc<'playerProgress'>>): Array<LeaderboardPlayer> {
  return players
    .map<LeaderboardPlayer>((player) => ({
      ...player,
      progressPercentage: Math.min((player.distancePosition / GOAL_DISTANCE) * 100, 100),
    }))
    .sort((a, b) => {
      // Finished players always go to top, sorted by finish time
      if (a.isFinished && b.isFinished) {
        return (a.finishTime || 0) - (b.finishTime || 0)
      }
      if (a.isFinished && !b.isFinished) return -1
      if (!a.isFinished && b.isFinished) return 1

      // Among non-finished, sort by distance
      return b.distancePosition - a.distancePosition
    })
}
const pr = new Intl.PluralRules('en-US', { type: 'ordinal' })

const suffixes = new Map([
  ['one', 'st'],
  ['two', 'nd'],
  ['few', 'rd'],
  ['other', 'th'],
])

export const formatOrdinals = (n: number) => {
  const rule = pr.select(n)
  const suffix = suffixes.get(rule)
  return `${n}${suffix}`
}
