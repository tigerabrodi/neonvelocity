import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { getErrorMessage, handlePromise } from '@/lib/utils'

const CLEANUP_INTERVAL_MS = 15000

export function useRoomAccess({ roomId }: { roomId: Id<'rooms'> }) {
  const cleanupPlayerProgress = useMutation(api.playerProgress.mutations.cleanupPlayerProgress)
  const joinRoom = useMutation(api.rooms.mutations.joinRoom)
  const currentPlayerProgress = useQuery(api.playerProgress.queries.getCurrentPlayerProgress, {
    roomId,
  })

  useEffect(() => {
    if (!roomId) return

    const handleRoomAccess = async () => {
      // First cleanup any old progress
      const [cleanupPlayerProgressError] = await handlePromise(
        cleanupPlayerProgress({ currentRoomId: roomId })
      )

      if (cleanupPlayerProgressError) {
        toast.error(
          getErrorMessage({
            error: cleanupPlayerProgressError,
            fallbackText: 'Failed to cleanup player progress',
          })
        )
      }

      // Then join current room if not already in it
      if (!currentPlayerProgress) {
        const [joinRoomError] = await handlePromise(joinRoom({ roomId }))

        if (joinRoomError) {
          toast.error(
            getErrorMessage({ error: joinRoomError, fallbackText: 'Failed to join room' })
          )
        }
      }
    }

    // Handle room access immediately
    void handleRoomAccess()

    // Check periodically to stay in sync
    const interval = setInterval(() => {
      void cleanupPlayerProgress({ currentRoomId: roomId })
    }, CLEANUP_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [roomId, currentPlayerProgress, cleanupPlayerProgress, joinRoom])
}
