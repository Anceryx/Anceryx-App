export interface PresentableDirectMessage {
  sender: { id: string }
  createdAt: Date | string
}

export interface DirectMessageGroupPosition {
  showDate: boolean
  startsGroup: boolean
  endsGroup: boolean
}

const MESSAGE_GROUP_WINDOW_MS = 5 * 60_000

function sameLocalDay(left: PresentableDirectMessage, right: PresentableDirectMessage): boolean {
  return new Date(left.createdAt).toDateString() === new Date(right.createdAt).toDateString()
}

function sameMessageGroup(left: PresentableDirectMessage | undefined, right: PresentableDirectMessage | undefined): boolean {
  if (!left || !right || left.sender.id !== right.sender.id || !sameLocalDay(left, right)) return false
  return Math.abs(new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()) <= MESSAGE_GROUP_WINDOW_MS
}

export function getDirectMessageGroupPosition(messages: readonly PresentableDirectMessage[], index: number): DirectMessageGroupPosition {
  const message = messages[index]
  if (!message) return { showDate: false, startsGroup: false, endsGroup: false }
  const previous = messages[index - 1]
  const next = messages[index + 1]
  return {
    showDate: !previous || !sameLocalDay(previous, message),
    startsGroup: !sameMessageGroup(previous, message),
    endsGroup: !sameMessageGroup(message, next),
  }
}
