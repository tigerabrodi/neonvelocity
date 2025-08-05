import { ErrorWithCode } from '../errors'

export const roomErrors = {
  ROOM_NOT_FOUND: new ErrorWithCode({
    code: 'ROOM_NOT_FOUND',
    message: 'Room not found',
  }),
  NOT_AUTHORIZED_TO_START_GAME: new ErrorWithCode({
    code: 'NOT_AUTHORIZED_TO_START_GAME',
    message: 'Not authorized to start game',
  }),
  NOT_AUTHORIZED_TO_KICK_PLAYER: new ErrorWithCode({
    code: 'NOT_AUTHORIZED_TO_KICK_PLAYER',
    message: 'Not authorized to kick player',
  }),
  NOT_AUTHORIZED_TO_LEAVE_ROOM: new ErrorWithCode({
    code: 'NOT_AUTHORIZED_TO_LEAVE_ROOM',
    message: 'Not authorized to leave room',
  }),
  OWNER_CANT_LEAVE_ACTIVE_GAME: new ErrorWithCode({
    code: 'OWNER_CANT_LEAVE_ACTIVE_GAME',
    message: 'Owner cannot leave active game',
  }),
  CANT_JOIN_ACTIVE_GAME: new ErrorWithCode({
    code: 'CANT_JOIN_ACTIVE_GAME',
    message: 'Cannot join active game',
  }),
  ROOM_IS_FULL: new ErrorWithCode({
    code: 'ROOM_IS_FULL',
    message: 'Room is full',
  }),
  NOT_AUTHORIZED_TO_RESET_GAME: new ErrorWithCode({
    code: 'NOT_AUTHORIZED_TO_RESET_GAME',
    message: 'Not authorized to reset game',
  }),
} as const
