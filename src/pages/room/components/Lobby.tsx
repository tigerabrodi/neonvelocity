import { api } from '@convex/_generated/api'
import { Doc, Id } from '@convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { Check, Copy, Crown, Users, X } from 'lucide-react'
import { useState } from 'react'

import { useRoomAccess } from '../hooks/useRoomAccess'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DEFAULT_ROOM_DURATION_MS = 60000

interface PlayerSlotProps {
  player?: Doc<'playerProgress'>
  index: number
  isOwner?: boolean
  currentUserId?: Id<'users'>
  onKickPlayer?: (playerId: Id<'users'>) => void
}

const PlayerSlot = ({ player, index, isOwner, currentUserId, onKickPlayer }: PlayerSlotProps) => {
  const isEmpty = !player
  const isCurrentPlayer = player?.userId === currentUserId
  const isPlayerOwner = player?.userId && isOwner && currentUserId === player.userId

  const getPlayerSlotColor = (index: number) => {
    const colors = ['text-player-1', 'text-player-2', 'text-player-3', 'text-player-4']
    return colors[index] || 'text-muted-foreground'
  }

  const getPlayerGlow = (index: number) => {
    const glows = [
      'drop-shadow-[0_0_10px_hsl(var(--player-1))]',
      'drop-shadow-[0_0_10px_hsl(var(--player-2))]',
      'drop-shadow-[0_0_10px_hsl(var(--player-3))]',
      'drop-shadow-[0_0_10px_hsl(var(--player-4))]',
    ]
    return glows[index] || ''
  }

  return (
    <div
      className={cn('flex items-center gap-3 rounded-lg border p-3 transition-all duration-300', {
        'border-muted bg-muted/20 border-dashed': isEmpty,
        'border-border bg-card shadow-lg': !isEmpty,
        'border-primary bg-primary/10': isCurrentPlayer,
      })}
    >
      {/* Player Number/Color */}
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold',
          {
            'border-muted text-muted-foreground': isEmpty,
            [`border-current ${getPlayerSlotColor(index)} ${getPlayerGlow(index)}`]: !isEmpty,
          }
        )}
      >
        {index + 1}
      </div>

      {/* Player Info */}
      <div className="flex-1">
        {isEmpty ? (
          <span className="text-muted-foreground italic">Waiting for player...</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">{player.playerName}</span>
            {isPlayerOwner && <Crown className="text-neon-yellow h-4 w-4" />}
            {isCurrentPlayer && !isPlayerOwner && (
              <span className="text-primary text-xs">(You)</span>
            )}
          </div>
        )}
      </div>

      {/* Kick Button (Owner Only) */}
      {!isEmpty && isOwner && !isPlayerOwner && onKickPlayer && (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
          onClick={() => onKickPlayer(player.userId)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

interface PlayerListProps {
  room: Doc<'rooms'>
  currentUser: Doc<'users'>
}

const COPY_LINK_TIMEOUT = 2000

export const Lobby = ({ room, currentUser }: PlayerListProps) => {
  const [isCopied, setIsCopied] = useState(false)

  const players = useQuery(api.rooms.queries.getPlayersInRoom, { roomId: room._id })
  const startGame = useMutation(api.games.mutations.startGame)
  const kickPlayer = useMutation(api.rooms.mutations.kickPlayer)

  useRoomAccess({ roomId: room._id })

  const isOwner = room.ownerId === currentUser._id
  const canStart = players && players.length >= 2
  const maxPlayers = room.maxPlayers

  const handleCopyLink = async () => {
    const roomLink = window.location.href
    await navigator.clipboard.writeText(roomLink)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), COPY_LINK_TIMEOUT)
  }

  const handleStartGame = async () => {
    if (!isOwner || !canStart) return

    try {
      await startGame({
        roomId: room._id,
        ownerId: currentUser._id,
        durationMs: DEFAULT_ROOM_DURATION_MS,
      })
    } catch (error) {
      console.error('Failed to start game:', error)
    }
  }

  const handleKickPlayer = async (targetUserId: Id<'users'>) => {
    if (!isOwner) return

    try {
      await kickPlayer({
        roomId: room._id,
        targetUserId,
      })
    } catch (error) {
      console.error('Failed to kick player:', error)
    }
  }

  // Sort players by playerNumber
  const sortedPlayers = players?.sort((a, b) => a.playerNumber - b.playerNumber) || []

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      {/* Room Info */}
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-primary text-2xl font-bold">RACING LOBBY</h2>
        <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          {sortedPlayers.length}/{maxPlayers} Players
        </div>
      </div>

      {/* Share Room Link */}
      <div className="flex flex-col gap-2">
        <label className="text-foreground text-sm font-medium">Share Room URL</label>
        <Button
          variant="outline"
          className="border-primary/30 hover:border-primary text-primary hover:bg-primary/10 w-full justify-between"
          onClick={handleCopyLink}
        >
          <span className="truncate font-mono text-xs">Room: {room._id.slice(-8)}</span>
          {isCopied ? (
            <Check className="h-4 w-4 flex-shrink-0" />
          ) : (
            <Copy className="h-4 w-4 flex-shrink-0" />
          )}
        </Button>
      </div>

      {/* Player Slots */}
      <div className="flex flex-col gap-3">
        <h3 className="text-foreground text-lg font-semibold">Racers</h3>

        {Array.from({ length: maxPlayers }).map((_, index) => {
          const player = sortedPlayers.find((p) => p.playerNumber === index + 1)

          return (
            <PlayerSlot
              key={index}
              player={player}
              index={index}
              isOwner={isOwner}
              currentUserId={currentUser._id}
              onKickPlayer={handleKickPlayer}
            />
          )
        })}
      </div>

      {/* Owner Controls */}
      {isOwner && (
        <div className="flex flex-col gap-3">
          <Button
            className={cn('w-full py-3 text-lg font-bold transition-all duration-300', {
              'bg-gradient-neon hover:shadow-glow-primary': canStart,
              'bg-muted text-muted-foreground cursor-not-allowed': !canStart,
            })}
            disabled={!canStart}
            onClick={handleStartGame}
          >
            {canStart ? 'START RACE!' : 'Waiting for players...'}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            Need at least 2 players to start
          </p>
        </div>
      )}
    </div>
  )
}
