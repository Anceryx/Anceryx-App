export type KeyboardShortcutId = 'settings' | 'shortcut-help' | 'toggle-microphone' | 'toggle-audio'
export type KeyboardShortcutCategory = 'navigation' | 'voice'

export const keyboardShortcutRegistry = [
  { id: 'settings', category: 'navigation', code: 'Comma', shift: false, labelKey: 'experience.shortcut.openSettings', descriptionKey: 'experience.shortcut.settingsDescription' },
  { id: 'shortcut-help', category: 'navigation', code: 'Slash', shift: true, labelKey: 'experience.shortcut.openShortcutHelp', descriptionKey: 'experience.shortcut.helpDescription' },
  { id: 'toggle-microphone', category: 'voice', code: 'KeyM', shift: true, labelKey: 'experience.shortcut.toggleMic', descriptionKey: 'experience.shortcut.micDescription' },
  { id: 'toggle-audio', category: 'voice', code: 'KeyD', shift: true, labelKey: 'experience.shortcut.toggleAudio', descriptionKey: 'experience.shortcut.audioDescription' },
] as const

type ShortcutEvent = Pick<KeyboardEvent, 'code' | 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey' | 'defaultPrevented' | 'isComposing' | 'target' | 'preventDefault'>

export interface ShortcutContext {
  targetEditable: boolean
  dialogScope: string | null
}

export function isShortcutAllowed(event: ShortcutEvent, shortcut: typeof keyboardShortcutRegistry[number], context: ShortcutContext): boolean {
  if (event.defaultPrevented || event.isComposing || context.targetEditable) return false
  if (!event.ctrlKey || event.altKey || event.metaKey) return false
  if (event.code !== shortcut.code || event.shiftKey !== shortcut.shift) return false
  if (context.dialogScope && !(shortcut.id === 'shortcut-help' && context.dialogScope === 'settings')) return false
  return true
}

export function dispatchRegisteredShortcut(
  event: ShortcutEvent,
  handlers: Partial<Record<KeyboardShortcutId, () => void>>,
  context: ShortcutContext,
): boolean {
  const shortcut = keyboardShortcutRegistry.find((item) => item.code === event.code && item.shift === event.shiftKey)
  if (!shortcut || !handlers[shortcut.id] || !isShortcutAllowed(event, shortcut, context)) return false
  event.preventDefault()
  handlers[shortcut.id]?.()
  return true
}
