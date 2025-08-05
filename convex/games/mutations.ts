import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'

import { internal } from '../_generated/api'
import { internalMutation, mutation } from '../_generated/server'
import { TEXT_CHUNKS } from '../constants'
import { sharedErrors } from '../errors'

import { gameErrors } from './errors'

export const GOAL_DISTANCE = 500

export const typeCharacter = mutation({
  args: {
    gameId: v.id('games'),
    typedChar: v.string(),
  },
  handler: async (ctx, { gameId, typedChar }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw sharedErrors.USER_NOT_AUTHENTICATED
    }

    const game = await ctx.db.get(gameId)
    if (!game || game.status !== 'playing') {
      throw gameErrors.GAME_NOT_ACTIVE
    }

    const playerProgress = await ctx.db
      .query('playerProgress')
      .withIndex('by_user_game', (q) => q.eq('userId', userId).eq('gameId', gameId))
      .first()

    if (!playerProgress || playerProgress.isFinished) {
      return // Player not in game or already finished
    }

    // Get expected character
    const { currentTextIndex, currentElementIndex, currentLetterIndex } = playerProgress
    const currentChunk = game.textElementsCollection[currentTextIndex]
    const currentElement = currentChunk[currentElementIndex]

    let expectedChar: string
    if (currentElement.type === 'space') {
      expectedChar = ' '
    } else {
      expectedChar = currentElement.letters[currentLetterIndex]
    }

    const isCorrect = typedChar === expectedChar

    // Calculate new progress
    let newTotalChars = playerProgress.totalCharactersTyped
    let newStreak = playerProgress.currentStreak
    let newTextIndex = currentTextIndex
    let newElementIndex = currentElementIndex
    let newLetterIndex = currentLetterIndex

    if (isCorrect) {
      newTotalChars++
      newStreak++

      // Advance position
      if (currentElement.type === 'space') {
        // Move to next element
        newElementIndex++
        newLetterIndex = 0
      } else {
        // Move to next letter or next element
        const isLastLetter = currentLetterIndex + 1 >= currentElement.letters.length
        if (isLastLetter) {
          newElementIndex++
          newLetterIndex = 0
        } else {
          newLetterIndex++
        }
      }

      // Check if we need to move to next chunk
      const isLastElementOfChunk = newElementIndex >= currentChunk.length
      if (isLastElementOfChunk) {
        newTextIndex = (newTextIndex + 1) % game.textElementsCollection.length
        newElementIndex = 0
        newLetterIndex = 0
      }
    } else {
      // Wrong character: reset streak only
      newStreak = 0
    }

    /*******************************************************************************
     * STREAK CALCULATION LOGIC
     *
     * The streak system rewards players for typing consecutive correct characters
     * and penalizes them for mistakes by resetting the streak to 0.
     *
     * HOW IT WORKS:
     * 1. When a character is typed correctly:
     *    - newStreak = previousStreak + 1
     *    - Player advances in the text
     *
     * 2. When a character is typed incorrectly:
     *    - newStreak = 0 (streak is reset)
     *    - Player doesn't advance in the text
     *
     * 3. Streak Multiplier Calculation:
     *    - Base multiplier: 1.0 (no streak)
     *    - For every 10 correct characters in a row: +0.1 to multiplier
     *    - Maximum multiplier: 3.0 (capped to prevent excessive rewards)
     *    - Formula: Math.min(newStreak / 10 + 1, 3)
     *
     * EXAMPLES:
     * - 0 streak: 1.0x multiplier (0/10 + 1 = 1.0)
     * - 5 streak: 1.5x multiplier (5/10 + 1 = 1.5)
     * - 10 streak: 2.0x multiplier (10/10 + 1 = 2.0)
     * - 20 streak: 3.0x multiplier (20/10 + 1 = 3.0, but capped at 3.0)
     * - 30 streak: 3.0x multiplier (30/10 + 1 = 4.0, but capped at 3.0)
     *
     * 4. Final Distance Calculation:
     *    - newDistance = totalCharactersTyped * streakMultiplier
     *    - This means players with higher streaks progress faster toward the goal
     *
     * IMPORTANT: Distance CAN DECREASE when making mistakes!
     * Example: 30-streak player types incorrectly on 31st character:
     * - Before: distance = 30 * 3.0 = 90
     * - After:  distance = 30 * 1.0 = 30 (drops by 60 units!)
     * - This creates a harsh penalty that becomes more severe with higher streaks
     *******************************************************************************/
    // const streakMultiplier = Math.min(newStreak / 10 + 1, 3)
    const streakMultiplier = newStreak < 3 ? 0 : Math.min(newStreak / 10 + 1, 3)
    const newDistance = newTotalChars * streakMultiplier

    // Check if finished (reached goal distance)
    const isFinished = newDistance >= GOAL_DISTANCE

    // Update player progress
    await ctx.db.patch(playerProgress._id, {
      currentTextIndex: newTextIndex,
      currentElementIndex: newElementIndex,
      currentLetterIndex: newLetterIndex,
      totalCharactersTyped: newTotalChars,
      currentStreak: newStreak,
      distancePosition: newDistance,
      isFinished,
      finishTime: isFinished ? Date.now() : undefined,
    })

    // Add this after updating player progress in typeCharacter
    if (isFinished) {
      // Check if all players have finished
      const allPlayers = await ctx.db
        .query('playerProgress')
        .withIndex('by_game', (q) => q.eq('gameId', gameId))
        .collect()

      const hasAllPlayersFinished = allPlayers.every((player) => player.isFinished)

      if (hasAllPlayersFinished) {
        // Cancel the scheduled end function
        const game = await ctx.db.get(gameId)
        if (game?.scheduledEndId) {
          await ctx.scheduler.cancel(game.scheduledEndId)
        }

        // End the game immediately
        await ctx.scheduler.runAfter(0, internal.games.mutations.endGame, { gameId })
      }
    }
  },
})

const DEFAULT_DURATION_MS = 60000 // 1 min

export const startGame = mutation({
  args: {
    roomId: v.id('rooms'),
    ownerId: v.id('users'),
    durationMs: v.optional(v.number()), // defaults to 60000
  },
  handler: async (ctx, { roomId, ownerId, durationMs = DEFAULT_DURATION_MS * 5 }) => {
    // Verify ownership
    const room = await ctx.db.get(roomId)
    if (!room || room.ownerId !== ownerId) {
      throw gameErrors.NOT_AUTHORIZED_TO_START_GAME
    }

    if (room.status !== 'lobby') {
      throw gameErrors.GAME_ALREADY_IN_PROGRESS
    }

    // Generate random text collection (5-7 chunks)
    const chunkCount = Math.floor(Math.random() * 3) + 5 // 5-7
    const selectedChunks = []
    for (let i = 0; i < chunkCount; i++) {
      const randomIndex = Math.floor(Math.random() * TEXT_CHUNKS.length)
      selectedChunks.push(TEXT_CHUNKS[randomIndex])
    }

    // Create game
    const gameId = await ctx.db.insert('games', {
      roomId,
      status: 'countdown',
      textElementsCollection: selectedChunks,
      durationMs,
    })

    // Update room status

    await ctx.db.patch(roomId, { status: 'playing', currentGameId: gameId })
    // Update all players in room to reference this game
    const players = await ctx.db
      .query('playerProgress')
      .withIndex('by_room', (q) => q.eq('roomId', roomId))
      .collect()

    for (const player of players) {
      await ctx.db.patch(player._id, {
        gameId,
        // Reset progress for new game
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

    // Schedule game start (after countdown)
    const countdownMs = 3000 // 3 second countdown
    await ctx.scheduler.runAfter(countdownMs, internal.games.mutations.actuallyStartGame, {
      gameId,
    })

    return gameId
  },
})

export const actuallyStartGame = internalMutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId)
    if (!game) return

    const startTime = Date.now()

    // Update game to playing status
    await ctx.db.patch(gameId, {
      status: 'playing',
      startTime,
    })

    // Schedule game end
    const scheduledEndId = await ctx.scheduler.runAfter(
      game.durationMs,
      internal.games.mutations.endGame,
      {
        gameId,
      }
    )

    await ctx.db.patch(gameId, { scheduledEndId })
  },
})

export const endGame = internalMutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId)
    if (!game || game.status === 'finished') return

    // Update game status
    await ctx.db.patch(gameId, {
      status: 'finished',
      endTime: Date.now(),
    })

    // Keep room status as "playing" to show results
    // Owner will manually start new game to go back to lobby
  },
})
