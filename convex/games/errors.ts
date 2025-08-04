import { ErrorWithCode } from '../errors'

export const gameErrors = {
  GAME_NOT_ACTIVE: new ErrorWithCode({
    code: 'GAME_NOT_ACTIVE',
    message: 'Game not active',
  }),
  GAME_NOT_FOUND: new ErrorWithCode({
    code: 'GAME_NOT_FOUND',
    message: 'Game not found',
  }),
  NOT_AUTHORIZED_TO_START_GAME: new ErrorWithCode({
    code: 'NOT_AUTHORIZED_TO_START_GAME',
    message: 'Not authorized to start game',
  }),
  GAME_ALREADY_IN_PROGRESS: new ErrorWithCode({
    code: 'GAME_ALREADY_IN_PROGRESS',
    message: 'Game already in progress',
  }),
} as const
