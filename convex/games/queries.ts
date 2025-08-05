import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'

import { query } from '../_generated/server'
import { sharedErrors } from '../errors'
import { roomErrors } from '../rooms/errors'

import { gameErrors } from './errors'

export const getCurrentGame = query({
  args: { roomId: v.id('rooms') },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw sharedErrors.USER_NOT_AUTHENTICATED
    }

    const room = await ctx.db.get(roomId)
    if (!room) {
      throw roomErrors.ROOM_NOT_FOUND
    }

    if (room.currentGameId === null) {
      return null
    }

    const game = await ctx.db.get(room.currentGameId)
    if (!game) {
      throw gameErrors.GAME_NOT_FOUND
    }

    return game
  },
})

export const getPlayersForGame = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw sharedErrors.USER_NOT_AUTHENTICATED
    }

    const players = await ctx.db
      .query('playerProgress')
      .withIndex('by_game', (q) => q.eq('gameId', gameId))
      .collect()
    return players
  },
})
