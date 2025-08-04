import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'

import { query } from '../_generated/server'

export const getCurrentGame = query({
  args: { roomId: v.id('rooms') },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('User not authenticated')
    }

    return await ctx.db
      .query('games')
      .withIndex('by_room', (q) => q.eq('roomId', roomId))
      .order('desc')
      .first()
  },
})
