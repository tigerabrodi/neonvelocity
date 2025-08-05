import { Doc } from '@convex/_generated/dataModel'
import { GOAL_DISTANCE } from '@convex/games/mutations'
import { motion } from 'motion/react'

import { CarIcon } from '@/assets/Car'

interface PlayerCarProps {
  playerProgress: Doc<'playerProgress'>
}

export const PlayerCar = ({ playerProgress }: PlayerCarProps) => {
  const progress = Math.min((playerProgress.distancePosition / GOAL_DISTANCE) * 100, 100)

  return (
    <div className="bg-gradient-track border-border relative h-16 w-full overflow-hidden rounded-lg border">
      {/* Track Lane */}
      <div
        className="absolute inset-0 flex items-center"
        style={{
          color: `hsl(var(--color-player-${playerProgress.playerNumber}))`,
        }}
      >
        {/* Dashed line in middle of track */}
        <div className="bg-muted-foreground absolute top-1/2 right-0 left-0 h-[1px] border-t border-dashed opacity-30" />

        {/* Car */}
        <motion.div
          className="absolute flex-col items-center"
          animate={{ left: `${Math.min(progress, 95)}%` }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.5,
          }}
          style={{
            color: `var(--color-player-${playerProgress.playerNumber})`,
          }}
        >
          <CarIcon
            svgProps={{
              className: `h-8 w-8`,
            }}
          />
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium">
              {Math.round((playerProgress.distancePosition / GOAL_DISTANCE) * 100)}%
            </span>
            <span className="text-xs font-medium">{playerProgress.playerName}</span>
          </div>
        </motion.div>

        {/* Finish Line */}
        <div className="bg-gradient-finish absolute right-0 h-full w-2 opacity-80" />
      </div>
    </div>
  )
}
