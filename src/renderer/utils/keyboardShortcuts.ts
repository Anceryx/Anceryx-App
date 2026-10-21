import type { ExperienceSection } from '@/store/uiStore'
import { communityVoiceClient } from '@/services/webrtc/communityVoiceClient'
import { useUIStore } from '@/store/uiStore'
import { dispatchRegisteredShortcut, keyboardShortcutRegistry, type KeyboardShortcutId } from './keyboardShortcutsCore'

export interface KeyboardShortcut {
  id: KeyboardShortcutId
  category: 'navigation' | 'voice'
  code: string
  ctrl: true
  shift: boolean
  labelKey: typeof keyboardShortcutRegistry[number]['labelKey']
  descriptionKey: typeof keyboardShortcutRegistry[number]['descriptionKey']
  action: () => void
}

const actions: Record<KeyboardShortcutId, () => void> = {
  settings: () => useUIStore.getState().openSettings('experiencia'),
  'shortcut-help': () => {
    useUIStore.getState().setExperienceSection('shortcuts')
    useUIStore.getState().openSettings('experiencia')
  },
  'toggle-microphone': () => {
    if (communityVoiceClient.status === 'connected') void communityVoiceClient.setMuted(!communityVoiceClient.muted)
  },
  'toggle-audio': () => {
    if (communityVoiceClient.status === 'connected') void communityVoiceClient.setDeafened(!communityVoiceClient.deafened)
  },
}

export function getKeyboardShortcuts(): KeyboardShortcut[] {
  return keyboardShortcutRegistry.map((shortcut) => ({ ...shortcut, ctrl: true, action: actions[shortcut.id] }))
}

function contextFor(event: KeyboardEvent) {
  const target = event.target
  const element = typeof HTMLElement !== 'undefined' && target instanceof HTMLElement ? target : null
  return {
    targetEditable: Boolean(element?.isContentEditable || element?.closest('input, textarea, select, [contenteditable="true"]')),
    dialogScope: element?.closest('[role="dialog"][aria-modal="true"]')?.getAttribute('data-shortcut-scope') ?? (element?.closest('[role="dialog"][aria-modal="true"]') ? 'other' : null),
  }
}

export function dispatchKeyboardShortcut(event: KeyboardEvent): boolean {
  return dispatchRegisteredShortcut(event, actions, contextFor(event))
}

export const shortcutSections = ['appearance', 'language-date-time', 'shortcuts', 'preferences'] as const satisfies readonly ExperienceSection[]
