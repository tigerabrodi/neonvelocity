import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'

import { query } from '../_generated/server'
import { sharedErrors } from '../errors'

export const getTextForPlayer = query({
  args: {
    gameId: v.id('games'),
  },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw sharedErrors.USER_NOT_AUTHENTICATED
    }

    const game = await ctx.db.get(gameId)
    const playerProgress = await ctx.db
      .query('playerProgress')
      .withIndex('by_user_game', (q) => q.eq('userId', userId).eq('gameId', gameId))
      .first()

    if (!game || !playerProgress) return null

    const { currentTextIndex, currentElementIndex, currentLetterIndex } = playerProgress
    const currentChunk = game.textElementsCollection[currentTextIndex]
    const currentElement = currentChunk[currentElementIndex]

    // Return current character and some context for display
    let currentChar: string
    if (currentElement.type === 'space') {
      currentChar = ' '
    } else {
      currentChar = currentElement.letters[currentLetterIndex]
    }

    return {
      currentChar,
      currentElement,
      currentChunk,
      playerProgress,
    }
  },
})

export const getPlayersForGame = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw sharedErrors.USER_NOT_AUTHENTICATED
    }

    return await ctx.db
      .query('playerProgress')
      .withIndex('by_game', (q) => q.eq('gameId', gameId))
      .collect()
  },
})

export const getPlayerProgress = query({
  args: {
    userId: v.id('users'),
    roomId: v.id('rooms'),
  },
  handler: async (ctx, { userId, roomId }) => {
    return await ctx.db
      .query('playerProgress')
      .withIndex('by_user_room', (q) => q.eq('userId', userId).eq('roomId', roomId))
      .first()
  },
})
