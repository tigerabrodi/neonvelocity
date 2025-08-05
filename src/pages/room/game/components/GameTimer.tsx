import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

interface GameTimerProps {
  gameStartTime: number | null // timestamp when game started
  gameDurationMs: number // total game duration in milliseconds (60000 for 1 minute)
  gameStatus: 'countdown' | 'playing' | 'finished'
}

const ONE_SECOND_MS = 1000

export const GameTimer = ({ gameStartTime, gameDurationMs, gameStatus }: GameTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (gameStatus !== 'playing' || gameStartTime === null) {
      setTimeLeft(0)
      return
    }

    const updateTimer = () => {
      const now = Date.now()
      const elapsed = now - gameStartTime
      const remaining = Math.max(0, gameDurationMs - elapsed)
      setTimeLeft(Math.ceil(remaining / ONE_SECOND_MS)) // Convert to seconds
    }

    // Update immediately
    updateTimer()

    // Update every second
    const interval = setInterval(updateTimer, ONE_SECOND_MS)

    return () => clearInterval(interval)
  }, [gameStartTime, gameDurationMs, gameStatus])

  // Don't show timer if game is not playing
  if (gameStatus !== 'playing') {
    return null
  }

  const isUrgent = timeLeft <= 10

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-4">
      {/* Timer Display */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-lg font-bold transition-all duration-300',
          {
            'border-destructive text-destructive shadow-glow-destructive animate-neon-pulse bg-destructive/10':
              isUrgent,
            'border-primary text-primary shadow-glow-primary bg-primary/10': !isUrgent,
          }
        )}
      >
        <Clock className="h-5 w-5" />
        {formatTime(timeLeft)}
      </div>
    </div>
  )
}
