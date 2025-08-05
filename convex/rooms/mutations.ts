import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'

import { mutation } from '../_generated/server'
import { sharedErrors } from '../errors'
import { removePlayerAndReorder } from '../playerProgress/utils'

import { roomErrors } from './errors'

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
      throw sharedErrors.USER_NOT_AUTHENTICATED
    }

    // Verify ownership
    const room = await ctx.db.get(roomId)
    if (!room || room.ownerId !== userId) {
      throw roomErrors.NOT_AUTHORIZED_TO_START_GAME
    }

    // Reset room to lobby
    await ctx.db.patch(roomId, { status: 'lobby', currentGameId: undefined })

    // Reset all player progress in room
    const players = await ctx.db
      .query('playerProgress')
      .withIndex('by_room', (q) => q.eq('roomId', roomId))
      .collect()

    for (const player of players) {
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

export const removeCurrentUserFromRoom = mutation({
  args: {
    roomId: v.id('rooms'),
    roomEventId: v.id('roomEvents'),
  },
  handler: async (ctx, { roomId, roomEventId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw sharedErrors.USER_NOT_AUTHENTICATED
    }

    // Remove target player and reorder
    await removePlayerAndReorder({ ctx, roomId, userId: userId })

    // Check if room event exists before trying to delete it
    const roomEvent = await ctx.db.get(roomEventId)
    if (roomEvent) {
      await ctx.db.delete(roomEventId)
    }
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
      throw sharedErrors.USER_NOT_AUTHENTICATED
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
    if (!room) throw roomErrors.ROOM_NOT_FOUND

    const isOwner = room.ownerId === userId

    // If owner and their room is playing, they can't leave - redirect them back
    if (isOwner && room.status === 'playing') {
      throw roomErrors.OWNER_CANT_LEAVE_ACTIVE_GAME
    }

    // If room is playing and user is not owner, they can't join
    if (room.status === 'playing' && !isOwner) {
      throw roomErrors.CANT_JOIN_ACTIVE_GAME
    }

    const isRoomFull = room.nextPlayerNumber > room.maxPlayers
    if (isRoomFull) {
      throw roomErrors.ROOM_IS_FULL
    }

    // Get user for name
    const user = await ctx.db.get(userId)
    if (!user) throw new Error('SHOULD NEVER HAPPEN')

    // Assign player number
    const assignedPlayerNumber = room.nextPlayerNumber

    // Create player progress
    await ctx.db.insert('playerProgress', {
      gameId: undefined, // in lobby
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
      throw sharedErrors.USER_NOT_AUTHENTICATED
    }

    await removePlayerAndReorder({ ctx, roomId, userId })
  },
})

export const kickPlayerEvent = mutation({
  args: {
    roomId: v.id('rooms'),
    targetUserId: v.id('users'),
  },
  handler: async (ctx, { roomId, targetUserId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw sharedErrors.USER_NOT_AUTHENTICATED
    }

    const room = await ctx.db.get(roomId)
    if (!room) throw roomErrors.ROOM_NOT_FOUND

    if (room.ownerId !== userId) {
      throw roomErrors.NOT_AUTHORIZED_TO_KICK_PLAYER
    }

    await ctx.db.insert('roomEvents', {
      fromUserId: userId,
      toUserId: targetUserId,
      roomId,
      type: 'player_kicked',
    })
  },
})

export const resetGame = mutation({
  args: {
    roomId: v.id('rooms'),
    ownerId: v.id('users'),
  },
  handler: async (ctx, { roomId, ownerId }) => {
    // Verify ownership
    const room = await ctx.db.get(roomId)
    if (!room || room.ownerId !== ownerId) {
      throw roomErrors.NOT_AUTHORIZED_TO_RESET_GAME
    }

    // Get current game to cancel scheduled function
    const currentGame = await ctx.db
      .query('games')
      .withIndex('by_room', (q) => q.eq('roomId', roomId))
      .order('desc')
      .first()

    if (currentGame?.scheduledEndId) {
      await ctx.scheduler.cancel(currentGame.scheduledEndId)
    }

    // Reset all player progress in room
    const players = await ctx.db
      .query('playerProgress')
      .withIndex('by_room', (q) => q.eq('roomId', roomId))
      .collect()

    for (const player of players) {
      await ctx.db.patch(player._id, {
        gameId: undefined, // Back to lobby state
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

    // Reset room to lobby
    await ctx.db.patch(roomId, {
      status: 'lobby',
      currentGameId: undefined, // Clear game reference
    })

    // Delete the game
    if (currentGame) {
      await ctx.db.delete(currentGame._id)
    }
  },
})
