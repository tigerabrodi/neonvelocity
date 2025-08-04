import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'

import { mutation } from '../_generated/server'
import { removePlayerAndReorder } from '../playerProgress/utils'

export const ROOM_ERRORS = {
  OWNER_CANT_LEAVE_ACTIVE_GAME: {
    code: 'OWNER_CANT_LEAVE_ACTIVE_GAME',
    message: 'Owner cannot leave active game',
  },
  CANT_JOIN_ACTIVE_GAME: {
    code: 'CANT_JOIN_ACTIVE_GAME',
    message: 'Cannot join active game',
  },
  ROOM_NOT_FOUND: {
    code: 'ROOM_NOT_FOUND',
    message: 'Room not found',
  },
  ROOM_IS_FULL: {
    code: 'ROOM_IS_FULL',
    message: 'Room is full',
  },
} as const

export const playAgain = mutation({
  args: {
    roomId: v.id('rooms'),
  },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Verify ownership
    const room = await ctx.db.get(roomId)
    if (!room || room.ownerId !== userId) {
      throw new Error('Not authorized')
    }

    // Reset room to lobby
    await ctx.db.patch(roomId, { status: 'lobby' })

    // Reset all player progress in room
    const players = await ctx.db
      .query('playerProgress')
      .withIndex('by_room', (q) => q.eq('roomId', roomId))
      .collect()

    for (const player of players) {
      // eslint-disable-next-line no-await-in-loop
      await ctx.db.patch(player._id, {
        gameId: undefined,
        currentTextIndex: 0,
        currentElementIndex: 0,
        currentLetterIndex: 0,
        totalCharactersTyped: 0,
        currentStreak: 0,
        distancePosition: 0,
        isFinished: false,
        finishTime: undefined,
      })
    }
  },
})

export const kickPlayer = mutation({
  args: {
    roomId: v.id('rooms'),
    targetUserId: v.id('users'),
  },
  handler: async (ctx, { roomId, targetUserId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Verify ownership
    const room = await ctx.db.get(roomId)
    if (!room || room.ownerId !== userId) {
      throw new Error('Not authorized to kick players')
    }

    // Remove target player and reorder
    await removePlayerAndReorder({ ctx, roomId, userId: targetUserId })
  },
})

// Join room with validation and player number assignment
export const joinRoom = mutation({
  args: {
    roomId: v.id('rooms'),
  },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Check if user already in room
    const existingPlayer = await ctx.db
      .query('playerProgress')
      .withIndex('by_user_room', (q) => q.eq('userId', userId).eq('roomId', roomId))
      .first()

    if (existingPlayer) {
      return // Already in room
    }

    // Get room and validate
    const room = await ctx.db.get(roomId)
    if (!room) throw new Error('Room not found')

    const isOwner = room.ownerId === userId

    // If owner and their room is playing, they can't leave - redirect them back
    if (isOwner && room.status === 'playing') {
      throw new ConvexError({
        code: 'OWNER_CANT_LEAVE_ACTIVE_GAME',
        message: 'Owner cannot leave active game',
      })
    }

    // If room is playing and user is not owner, they can't join
    if (room.status === 'playing' && !isOwner) {
      throw new ConvexError({
        code: 'CANT_JOIN_ACTIVE_GAME',
        message: 'Cannot join active game',
      })
    }

    const isRoomFull = room.nextPlayerNumber > room.maxPlayers
    if (isRoomFull) {
      throw new Error('Room is full')
    }

    // Get user for name
    const user = await ctx.db.get(userId)
    if (!user) throw new Error('User not found')

    // Assign player number
    const assignedPlayerNumber = room.nextPlayerNumber

    // Create player progress
    await ctx.db.insert('playerProgress', {
      gameId: null, // in lobby
      roomId,
      userId,
      playerName: user.username,
      playerNumber: assignedPlayerNumber,
      currentTextIndex: 0,
      currentElementIndex: 0,
      currentLetterIndex: 0,
      totalCharactersTyped: 0,
      currentStreak: 0,
      distancePosition: 0,
      isFinished: false,
    })

    await ctx.db.patch(roomId, {
      nextPlayerNumber: assignedPlayerNumber + 1,
    })
  },
})

export const leaveRoom = mutation({
  args: {
    roomId: v.id('rooms'),
  },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('User not authenticated')
    }

    await removePlayerAndReorder({ ctx, roomId, userId })
  },
})
