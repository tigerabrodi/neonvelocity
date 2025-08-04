import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { useEffect } from 'react'

const CLEANUP_INTERVAL_MS = 15000

export function useRoomAccess({ roomId }: { roomId: Id<'rooms'> }) {
  const cleanupPlayerProgress = useMutation(api.rooms.mutations.leaveRoom)
  const joinRoom = useMutation(api.rooms.mutations.joinRoom)
  const currentPlayerProgress = useQuery(api.playerProgress.queries.getCurrentPlayerProgress, {
    roomId,
  })

  useEffect(() => {
    if (!roomId) return

    const handleRoomAccess = async () => {
      // First cleanup any old progress
      await cleanupPlayerProgress({ roomId })

      // Then join current room if not already in it
      if (!currentPlayerProgress) {
        await joinRoom({ roomId })
      }
    }

    // Handle room access immediately
    void handleRoomAccess()

    // Check periodically to stay in sync
    const interval = setInterval(() => {
      void cleanupPlayerProgress({ roomId })
    }, CLEANUP_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [roomId, currentPlayerProgress, cleanupPlayerProgress, joinRoom])
}
