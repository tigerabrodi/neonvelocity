import { api } from '@convex/_generated/api'
import { Doc, Id } from '@convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect } from 'react'
import { generatePath, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { ROUTES } from '@/lib/constants'
import { getErrorMessage, handlePromise } from '@/lib/utils'

const CLEANUP_INTERVAL_MS = 15000

export function useRoomAccess({
  roomId,
  currentUser,
}: {
  roomId: Id<'rooms'>
  currentUser: Doc<'users'>
}) {
  const navigate = useNavigate()
  const cleanupPlayerProgress = useMutation(api.playerProgress.mutations.cleanupPlayerProgress)
  const joinRoom = useMutation(api.rooms.mutations.joinRoom)
  const removeCurrentUserFromRoom = useMutation(api.rooms.mutations.removeCurrentUserFromRoom)
  const currentPlayerProgress = useQuery(api.playerProgress.queries.getCurrentPlayerProgress, {
    roomId,
  })

  const roomEvents = useQuery(api.rooms.queries.getRoomEvents, {
    roomId,
  })

  const handleRemoveCurrentUserFromRoom = useCallback(
    async ({ roomEventId }: { roomEventId: Id<'roomEvents'> }) => {
      const [error] = await handlePromise(removeCurrentUserFromRoom({ roomId, roomEventId }))
      if (error) {
        toast.error(
          getErrorMessage({ error, fallbackText: 'Failed to remove current user from room' })
        )
      }

      void navigate(generatePath(ROUTES.roomDetail, { roomId: currentUser.roomId }))
    },
    [currentUser.roomId, navigate, removeCurrentUserFromRoom, roomId]
  )

  useEffect(() => {
    if (!roomEvents) return

    for (const event of roomEvents) {
      if (event.type === 'player_kicked' && event.toUserId === currentUser._id) {
        void handleRemoveCurrentUserFromRoom({ roomEventId: event._id })
      }
    }
  }, [handleRemoveCurrentUserFromRoom, roomEvents, currentUser._id])

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
