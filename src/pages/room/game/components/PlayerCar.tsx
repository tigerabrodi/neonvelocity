import { Doc } from '@convex/_generated/dataModel'
import { GOAL_DISTANCE } from '@convex/games/mutations'
import { Car } from 'lucide-react'
import { motion } from 'motion/react'

interface PlayerCarProps {
  playerProgress: Doc<'playerProgress'>
}

export const PlayerCar = ({ playerProgress }: PlayerCarProps) => {
  // Calculate progress percentage (0-100)
  const progress = Math.min((playerProgress.distancePosition / GOAL_DISTANCE) * 100, 100)

  const playerColors = {
    1: 'text-player-1',
    2: 'text-player-2',
    3: 'text-player-3',
    4: 'text-player-4',
  } as const

  const glowColors = {
    1: 'drop-shadow-[0_0_10px_hsl(var(--player-1))]',
    2: 'drop-shadow-[0_0_10px_hsl(var(--player-2))]',
    3: 'drop-shadow-[0_0_10px_hsl(var(--player-3))]',
    4: 'drop-shadow-[0_0_10px_hsl(var(--player-4))]',
  } as const

  return (
    <div className="bg-gradient-track border-border relative h-16 w-full overflow-hidden rounded-lg border">
      {/* Track Lane */}
      <div className="absolute inset-0 flex items-center">
        {/* Dashed line in middle of track */}
        <div className="bg-muted-foreground absolute top-1/2 right-0 left-0 h-[1px] border-t border-dashed opacity-30" />

        {/* Car */}
        <motion.div
          className="absolute flex items-center gap-2"
          animate={{ left: `${Math.min(progress, 95)}%` }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.5,
          }}
        >
          <Car
            className={`h-8 w-8 ${playerColors[playerProgress.playerNumber as keyof typeof playerColors]} ${glowColors[playerProgress.playerNumber as keyof typeof glowColors]} transition-all duration-300`}
          />
        </motion.div>

        {/* Finish Line */}
        <div className="bg-gradient-finish absolute right-0 h-full w-2 opacity-80" />
      </div>

      {/* Player Info */}
      <div className="absolute -top-6 left-0 flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${playerColors[playerProgress.playerNumber as keyof typeof playerColors]} shadow-neon`}
        />
        <span className="text-foreground text-xs font-medium">{playerProgress.playerName}</span>
        {playerProgress.isFinished && (
          <span className="text-accent text-xs font-bold">FINISHED!</span>
        )}
      </div>

      {/* Progress percentage */}
      <div className="text-muted-foreground absolute -bottom-6 left-0 text-xs">
        {Math.round(progress)}%
      </div>
    </div>
  )
}
