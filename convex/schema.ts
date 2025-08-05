import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// Text element structure
export const ElementSchema = v.union(
  v.object({
    type: v.literal('word'),
    letters: v.array(v.string()),
    id: v.string(),
  }),
  v.object({
    type: v.literal('space'),
    id: v.string(),
  })
)

// Define the schema for the application
export default defineSchema({
  // Include Convex Auth tables
  ...authTables,

  users: defineTable({
    email: v.string(),
    username: v.string(),
    updatedAt: v.number(),
    roomId: v.union(v.id('rooms'), v.null()),
  })
    .index('by_email', ['email'])
    .index('by_username', ['username']),

  rooms: defineTable({
    ownerId: v.id('users'), // reference to users table
    status: v.union(v.literal('lobby'), v.literal('playing')),
    createdAt: v.number(),
    maxPlayers: v.number(), // 4
    nextPlayerNumber: v.number(), // 1-4, next available player number to assign
    currentGameId: v.optional(v.id('games')),
  }).index('by_owner', ['ownerId']),

  games: defineTable({
    roomId: v.id('rooms'),
    status: v.union(v.literal('countdown'), v.literal('playing'), v.literal('finished')),
    textElementsCollection: v.array(v.array(ElementSchema)), // 5-7 chunks
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    durationMs: v.number(), // 60000 for 1 minute
    scheduledEndId: v.optional(v.id('_scheduled_functions')),
  }).index('by_room', ['roomId']),

  roomEvents: defineTable({
    roomId: v.id('rooms'),
    type: v.union(v.literal('player_kicked')),
    fromUserId: v.id('users'),
    toUserId: v.id('users'),
  }).index('by_room', ['roomId']),

  playerProgress: defineTable({
    gameId: v.optional(v.id('games')), // null when in lobby, set when game starts
    roomId: v.id('rooms'), // always present - which room they're in
    userId: v.id('users'),
    playerName: v.string(), // derived from users.username but stored for convenience
    playerNumber: v.number(), // 1, 2, 3, or 4 - determines color and position
    currentTextIndex: v.number(), // which chunk
    currentElementIndex: v.number(), // which element in chunk
    currentLetterIndex: v.number(), // which letter in element
    totalCharactersTyped: v.number(),
    currentStreak: v.number(),
    distancePosition: v.number(), // calculated distance - only source of truth for progress
    isFinished: v.boolean(),
    finishTime: v.optional(v.number()),
  })
    .index('by_game', ['gameId'])
    .index('by_room', ['roomId'])
    .index('by_user_game', ['userId', 'gameId'])
    .index('by_user_room', ['userId', 'roomId'])
    .index('by_user', ['userId']), // for finding all user's progress across rooms
})
