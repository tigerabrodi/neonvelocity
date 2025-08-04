import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { generatePath, Navigate, useParams } from 'react-router'

import { Game } from './components/Game'
import { Lobby } from './components/Lobby'

import { useAuthLayoutContext } from '@/layouts/authenticated/hooks/useAuthLayoutContext'
import { ROUTES } from '@/lib/constants'

export const RoomPage = () => {
  const { roomId } = useParams<{ roomId: Id<'rooms'> }>()
  const { currentUser } = useAuthLayoutContext()
  const room = useQuery(api.rooms.queries.getRoomById, { roomId: roomId! })

  // room loading
  if (room === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-10 animate-spin" />
      </div>
    )
  }

  // room not found
  if (room === null) {
    return <Navigate to={generatePath(ROUTES.roomDetail, { roomId: currentUser.roomId })} />
  }

  const shouldShowLobby = room.status === 'lobby'

  return shouldShowLobby ? <Lobby room={room} currentUser={currentUser} /> : <Game />
}
