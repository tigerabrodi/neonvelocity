import { convexAuth } from '@convex-dev/auth/server'

import type { MutationCtx } from './_generated/server'
import passwordProvider from './passwordProvider'

const MAX_PLAYERS = 4

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [passwordProvider],
  callbacks: {
    async createOrUpdateUser(ctx: MutationCtx, args) {
      if (args.existingUserId) {
        return args.existingUserId
      }

      const username = args.profile.username as string

      // First create the user
      const userId = await ctx.db.insert('users', {
        email: args.profile.email!,
        username,
        updatedAt: Date.now(),
        roomId: null,
      })

      const roomId = await ctx.db.insert('rooms', {
        ownerId: userId,
        status: 'lobby',
        createdAt: Date.now(),
        maxPlayers: MAX_PLAYERS,
        // since first player progress is always the owner himself
        nextPlayerNumber: 2,
      })

      await ctx.db.patch(userId, {
        roomId: roomId,
      })

      await ctx.db.insert('playerProgress', {
        userId,
        roomId,
        playerName: username,
        playerNumber: 1,
        currentTextIndex: 0,
        currentElementIndex: 0,
        currentLetterIndex: 0,
        totalCharactersTyped: 0,
        currentStreak: 0,
        distancePosition: 0,
        isFinished: false,
      })

      return userId
    },
  },
})
