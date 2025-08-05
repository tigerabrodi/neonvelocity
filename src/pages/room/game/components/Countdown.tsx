// components/racing/CountdownOverlay.tsx

import { Doc } from '@convex/_generated/dataModel'
import { useEffect, useState } from 'react'

interface CountdownOverlayProps {
  gameStatus: Doc<'games'>['status']
}

const ONE_SECOND_MS = 1000

export const Countdown = ({ gameStatus }: CountdownOverlayProps) => {
  const [countdown, setCountdown] = useState(3)
  const [showGO, setShowGO] = useState(false)

  useEffect(() => {
    if (gameStatus !== 'countdown') {
      return
    }

    // Reset countdown when entering countdown mode
    setCountdown(3)
    setShowGO(false)

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Show GO when countdown reaches 0
          setShowGO(true)

          // Hide GO after 1 second
          setTimeout(() => {
            setShowGO(false)
          }, ONE_SECOND_MS)

          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, ONE_SECOND_MS)

    return () => clearInterval(interval)
  }, [gameStatus])

  // Don't show overlay if not in countdown mode
  if (gameStatus !== 'countdown' && !showGO) {
    return null
  }

  const getCountdownText = () => {
    if (showGO) return 'GO!'
    if (countdown > 0) return countdown.toString()
    return null
  }

  const getCountdownColor = () => {
    if (showGO) return 'text-accent'
    if (countdown === 1) return 'text-neon-orange'
    return 'text-primary'
  }

  const countdownText = getCountdownText()

  if (!countdownText) return null

  return (
    <div className="bg-background/70 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div
        className={`text-9xl font-bold ${getCountdownColor()} animate-pulse drop-shadow-[0_0_30px_currentColor] select-none`}
      >
        {countdownText}
      </div>
    </div>
  )
}
