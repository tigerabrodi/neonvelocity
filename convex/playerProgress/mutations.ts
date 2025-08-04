import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'

import { mutation } from '../_generated/server'
import { sharedErrors } from '../errors'

import { removePlayerAndReorder } from './utils'

// Server-side cleanup mutation
export const cleanupPlayerProgress = mutation({
  args: {
    currentRoomId: v.id('rooms'),
  },
  handler: async (ctx, { currentRoomId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw sharedErrors.USER_NOT_AUTHENTICATED
    }

    // Get all player progress for this user across all rooms
    const allPlayerProgress = await ctx.db
      .query('playerProgress')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    // Check if current room is owned by user
    const currentRoom = await ctx.db.get(currentRoomId)
    const isOwner = currentRoom?.ownerId === userId

    // Find user's own room if they own one
    let ownRoomId = null
    if (isOwner) {
      ownRoomId = currentRoomId
    } else {
      const ownedRoom = await ctx.db
        .query('rooms')
        .withIndex('by_owner', (q) => q.eq('ownerId', userId))
        .first()
      ownRoomId = ownedRoom?._id
    }

    // Remove from all rooms except:
    // 1. The current room they're visiting
    // 2. Their own room (if they own one)
    for (const progress of allPlayerProgress) {
      const shouldKeep =
        progress.roomId === currentRoomId || (ownRoomId && progress.roomId === ownRoomId)

      if (!shouldKeep) {
        // Remove player and reorder room
        await removePlayerAndReorder({ ctx, roomId: progress.roomId, userId: progress.userId })
      }
    }
  },
})
