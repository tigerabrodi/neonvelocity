import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { FunctionReturnType } from 'convex/server'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { cn, getErrorMessage, handlePromise } from '@/lib/utils'

type TextData = FunctionReturnType<typeof api.playerProgress.queries.getTextForPlayer>

interface TypingAreaProps {
  gameId: Id<'games'>
  gameStatus: 'countdown' | 'playing' | 'finished'
}

export const TypingArea = ({ gameId, gameStatus }: TypingAreaProps) => {
  const [hasError, setHasError] = useState(false)

  const textData = useQuery(api.playerProgress.queries.getTextForPlayer, { gameId })

  const getCurrentExpectedChar = ({ textData }: { textData: TextData }) => {
    if (!textData) return ''

    const { currentElement } = textData
    if (currentElement.type === 'space') {
      return ' '
    } else {
      const { currentLetterIndex } = textData.playerProgress
      return currentElement.letters[currentLetterIndex]
    }
  }

  const typeCharacter = useMutation(api.games.mutations.typeCharacter).withOptimisticUpdate(
    (localStore, args) => {
      // Optimistic update for smooth typing experience
      const { typedChar } = args
      const currentProgress = localStore.getQuery(api.playerProgress.queries.getTextForPlayer, {
        gameId,
      })

      if (currentProgress?.playerProgress) {
        const expectedChar = getCurrentExpectedChar({ textData: currentProgress })
        const isCorrect = typedChar === expectedChar

        if (isCorrect) {
          // Calculate optimistic updates
          const newTotalChars = currentProgress.playerProgress.totalCharactersTyped + 1
          const newStreak = currentProgress.playerProgress.currentStreak + 1
          const streakMultiplier = Math.min(newStreak / 10 + 1, 3)
          const newDistance = newTotalChars * streakMultiplier

          // Calculate new position indices
          const { newTextIndex, newElementIndex, newLetterIndex } = calculateNewPosition({
            textData: currentProgress,
          })

          // Update local store with optimistic values
          localStore.setQuery(
            api.playerProgress.queries.getTextForPlayer,
            { gameId },
            {
              ...currentProgress,
              playerProgress: {
                ...currentProgress.playerProgress,
                currentTextIndex: newTextIndex,
                currentElementIndex: newElementIndex,
                currentLetterIndex: newLetterIndex,
                totalCharactersTyped: newTotalChars,
                currentStreak: newStreak,
                distancePosition: newDistance,
              },
            }
          )
        }
      }
    }
  )

  // Handle keypress events
  const handleKeyPress = useCallback(
    async (event: KeyboardEvent) => {
      if (gameStatus !== 'playing' || !textData?.currentChar) return

      // Prevent default browser behavior for space and other keys
      if (event.key === ' ') {
        event.preventDefault()
      }

      const typedChar = event.key

      // Only handle printable characters and space
      if (typedChar.length !== 1) return

      const expectedChar = textData.currentChar
      const isCorrect = typedChar === expectedChar

      // Visual feedback for errors
      if (!isCorrect) {
        setHasError(true)
        setTimeout(() => setHasError(false), 200)
      }

      const [error] = await handlePromise(
        typeCharacter({
          gameId,
          typedChar,
        })
      )

      if (error) {
        toast.error(getErrorMessage({ error, fallbackText: 'Failed to type character' }))
      }
    },
    [gameStatus, textData?.currentChar, typeCharacter, gameId]
  )

  // Add/remove event listeners
  useEffect(() => {
    if (gameStatus === 'playing') {
      window.addEventListener('keydown', handleKeyPress)
      return () => window.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress, gameStatus])

  // should never really happen
  if (!textData) {
    return <div>Loading text...</div>
  }

  // Helper function to calculate new position after typing
  const calculateNewPosition = ({ textData }: { textData: TextData }) => {
    if (!textData) return { newTextIndex: 0, newElementIndex: 0, newLetterIndex: 0 }

    const { currentTextIndex, currentElementIndex, currentLetterIndex } = textData.playerProgress
    const { currentChunk } = textData
    const currentElement = currentChunk[currentElementIndex]

    let newTextIndex = currentTextIndex
    let newElementIndex = currentElementIndex
    let newLetterIndex = currentLetterIndex

    if (currentElement.type === 'space') {
      // Move to next element
      newElementIndex++
      newLetterIndex = 0
    } else {
      // Move to next letter or next element
      if (currentLetterIndex + 1 >= currentElement.letters.length) {
        newElementIndex++
        newLetterIndex = 0
      } else {
        newLetterIndex++
      }
    }

    // Check if we need to move to next chunk
    if (newElementIndex >= currentChunk.length) {
      newTextIndex = (newTextIndex + 1) % textData.textElementsCollection?.length || 1
      newElementIndex = 0
      newLetterIndex = 0
    }

    return { newTextIndex, newElementIndex, newLetterIndex }
  }

  // Render the current chunk with highlighting
  const renderCurrentChunk = () => {
    if (!textData.currentChunk || !textData.playerProgress) return null

    const { currentChunk } = textData
    const { currentElementIndex, currentLetterIndex } = textData.playerProgress

    return currentChunk.map((element, elementIdx) => {
      if (element.type === 'space') {
        const isCurrent = elementIdx === currentElementIndex

        return (
          <span
            key={element.id}
            className={cn('font-mono text-lg transition-all duration-150', {
              'text-primary bg-primary/20 border-primary border-b-2': isCurrent,
              'text-muted-foreground': !isCurrent,
            })}
          >
            {'\u00A0'}
          </span>
        )
      } else {
        // Word element
        return element.letters.map((letter, letterIdx) => {
          const isCurrent = elementIdx === currentElementIndex && letterIdx === currentLetterIndex
          const isPast =
            elementIdx < currentElementIndex ||
            (elementIdx === currentElementIndex && letterIdx < currentLetterIndex)

          return (
            <span
              key={`${element.id}-${letterIdx}`}
              className={cn('font-mono text-lg transition-all duration-150', {
                'text-accent bg-accent/20': isPast, // Already typed correctly
                'text-primary bg-primary/20 border-primary border-b-2': isCurrent, // Current character
                'text-muted-foreground': !isPast && !isCurrent, // Not yet typed
              })}
            >
              {letter}
            </span>
          )
        })
      }
    })
  }

  // Get next chunk preview
  const getNextChunkPreview = () => {
    if (!textData.currentChunk || !textData.playerProgress) return ''

    const currentTextIndex = textData.playerProgress.currentTextIndex
    const nextTextIndex = (currentTextIndex + 1) % (textData.textElementsCollection?.length || 1)
    const nextChunk = textData.textElementsCollection?.[nextTextIndex]

    if (!nextChunk) return 'Loading next text...'

    // Convert first few elements to readable text
    const previewText = nextChunk
      .slice(0, 10) // First 10 elements
      .map((element) => {
        if (element.type === 'space') return ' '
        return element.letters.join('')
      })
      .join('')

    return previewText + '...'
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Main typing area */}
      <div
        className={cn(
          'bg-card border-border relative rounded-lg border p-8 shadow-lg transition-all duration-300',
          {
            'border-destructive shadow-glow-destructive': hasError,
            'border-primary/30 shadow-glow-primary': !hasError,
          }
        )}
      >
        {textData.playerProgress.isFinished && (
          <div className="bg-background/90 absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
            <div className="text-center text-2xl font-bold">
              <span className="text-primary">You finished!</span>
            </div>
          </div>
        )}

        <div className="text-center leading-relaxed tracking-wide break-words">
          {renderCurrentChunk()}
        </div>

        {/* Typing instructions */}
        {gameStatus === 'playing' && (
          <div className="text-muted-foreground absolute top-2 right-2 text-xs">Type to race!</div>
        )}

        {gameStatus === 'countdown' && (
          <div className="text-muted-foreground absolute top-2 right-2 text-xs">Get ready...</div>
        )}
      </div>

      {/* Next text preview */}
      <div className="bg-muted/50 border-border mt-4 rounded-lg border p-4">
        <div className="text-muted-foreground text-center text-sm">
          Next: <span className="text-foreground font-mono">{getNextChunkPreview()}</span>
        </div>
      </div>

      {/* Stats */}
      {textData.playerProgress && (
        <div className="text-muted-foreground mt-4 flex justify-center gap-6 text-sm">
          <div>
            Streak:{' '}
            <span className="text-accent font-bold">{textData.playerProgress.currentStreak}</span>
          </div>
          <div>
            Characters:{' '}
            <span className="text-primary font-bold">
              {textData.playerProgress.totalCharactersTyped}
            </span>
          </div>
          <div>
            Distance:{' '}
            <span className="text-neon-yellow font-bold">
              {Math.round(textData.playerProgress.distancePosition)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
