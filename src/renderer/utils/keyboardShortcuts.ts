import type { ExperienceSection } from '@/store/uiStore'
import { communityVoiceClient } from '@/services/webrtc/communityVoiceClient'
import { useUIStore } from '@/store/uiStore'

export interface KeyboardShortcut {
  id: 'settings' | 'shortcut-help' | 'toggle-microphone' | 'toggle-audio'
  category: 'navigation' | 'voice'
  code: string
  ctrl: true
  shift: boolean
  action: () => void
}

export function getKeyboardShortcuts(): KeyboardShortcut[] {
  return [
    { id: 'settings', category: 'navigation', code: 'Comma', ctrl: true, shift: false, action: () => useUIStore.getState().openSettings('experiencia') },
    { id: 'shortcut-help', category: 'navigation', code: 'Slash', ctrl: true, shift: true, action: () => {
      useUIStore.getState().setExperienceSection('shortcuts')
      useUIStore.getState().openSettings('experiencia')
    } },
    { id: 'toggle-microphone', category: 'voice', code: 'KeyM', ctrl: true, shift: true, action: () => {
      if (communityVoiceClient.status === 'connected') void communityVoiceClient.setMuted(!communityVoiceClient.muted)
    } },
    { id: 'toggle-audio', category: 'voice', code: 'KeyD', ctrl: true, shift: true, action: () => {
      if (communityVoiceClient.status === 'connected') void communityVoiceClient.setDeafened(!communityVoiceClient.deafened)
    } },
  ]
}

export function isShortcutTargetEditable(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false
  return target.isContentEditable || Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

export function dispatchKeyboardShortcut(event: KeyboardEvent, shortcuts = getKeyboardShortcuts()): boolean {
  if (event.defaultPrevented || event.isComposing || isShortcutTargetEditable(event.target)) return false
  if (!event.ctrlKey || event.altKey || event.metaKey) return false
  const shortcut = shortcuts.find((item) => item.code === event.code && item.shift === event.shiftKey)
  if (!shortcut) return false
  const dialog = typeof HTMLElement !== 'undefined' && event.target instanceof HTMLElement
    ? event.target.closest('[role="dialog"][aria-modal="true"]')
    : null
  if (dialog && !(shortcut.id === 'shortcut-help' && dialog.getAttribute('aria-label') === 'Configurações')) return false
  event.preventDefault()
  shortcut.action()
  return true
}

export const shortcutSections = ['appearance', 'language-date-time', 'shortcuts', 'preferences'] as const satisfies readonly ExperienceSection[]

