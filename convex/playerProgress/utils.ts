import { Id } from '../_generated/dataModel'
import { MutationCtx } from '../_generated/server'

// Helper function to remove player and reorder remaining players
export async function removePlayerAndReorder({
  ctx,
  roomId,
  userId,
}: {
  ctx: MutationCtx
  roomId: Id<'rooms'>
  userId: Id<'users'>
}) {
  // Get all players in room sorted by player number
  const allPlayers = await ctx.db
    .query('playerProgress')
    .withIndex('by_room', (q) => q.eq('roomId', roomId))
    .collect()

  const sortedPlayers = allPlayers.sort((a, b) => a.playerNumber - b.playerNumber)

  // Find and remove the target player
  const playerToRemove = sortedPlayers.find((p) => p.userId === userId)
  if (!playerToRemove) return

  await ctx.db.delete(playerToRemove._id)

  // Reorder remaining players (shift down to fill gaps)
  const remainingPlayers = sortedPlayers.filter((p) => p.userId !== userId)

  for (let i = 0; i < remainingPlayers.length; i++) {
    const newPlayerNumber = i + 1 // 1, 2, 3, 4
    if (remainingPlayers[i].playerNumber !== newPlayerNumber) {
      // eslint-disable-next-line no-await-in-loop
      await ctx.db.patch(remainingPlayers[i]._id, {
        playerNumber: newPlayerNumber,
      })
    }
  }

  // Update room's nextPlayerNumber
  const room = await ctx.db.get(roomId)
  if (room) {
    await ctx.db.patch(roomId, {
      nextPlayerNumber: remainingPlayers.length + 1,
    })
  }
}
