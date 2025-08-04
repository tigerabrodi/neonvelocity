import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'

import { query } from '../_generated/server'
import { sharedErrors } from '../errors'

export const getPlayersInRoom = query({
  args: { roomId: v.id('rooms') },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw sharedErrors.USER_NOT_AUTHENTICATED
    }

    return await ctx.db
      .query('playerProgress')
      .withIndex('by_room', (q) => q.eq('roomId', roomId))
      .collect()
  },
})

export const getRoomById = query({
  args: { roomId: v.id('rooms') },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw sharedErrors.USER_NOT_AUTHENTICATED
    }

    return await ctx.db.get(roomId)
  },
})
