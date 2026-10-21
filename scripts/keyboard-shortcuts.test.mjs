import assert from 'node:assert/strict'
import { dispatchRegisteredShortcut, isShortcutAllowed, keyboardShortcutRegistry } from '../src/renderer/utils/keyboardShortcutsCore.ts'

function event(values = {}) {
  return {
    code: 'Comma', shiftKey: false, ctrlKey: true, altKey: false, metaKey: false,
    defaultPrevented: false, isComposing: false, target: null,
    preventDefault() { this.defaultPrevented = true },
    ...values,
  }
}

const calls = []
const handlers = { settings: () => calls.push('settings'), 'shortcut-help': () => calls.push('help') }
const settings = keyboardShortcutRegistry.find((shortcut) => shortcut.id === 'settings')
const help = keyboardShortcutRegistry.find((shortcut) => shortcut.id === 'shortcut-help')

const openSettings = event()
assert.equal(dispatchRegisteredShortcut(openSettings, handlers, { targetEditable: false, dialogScope: null }), true)
assert.deepEqual(calls, ['settings'])
assert.equal(openSettings.defaultPrevented, true)
assert.equal(dispatchRegisteredShortcut(openSettings, handlers, { targetEditable: false, dialogScope: null }), false)
assert.deepEqual(calls, ['settings'], 'a handled event must not run twice')

assert.equal(isShortcutAllowed(event({ ctrlKey: false }), settings, { targetEditable: false, dialogScope: null }), false)
assert.equal(isShortcutAllowed(event({ altKey: true }), settings, { targetEditable: false, dialogScope: null }), false)
assert.equal(isShortcutAllowed(event({ metaKey: true }), settings, { targetEditable: false, dialogScope: null }), false)
assert.equal(isShortcutAllowed(event({ isComposing: true }), settings, { targetEditable: false, dialogScope: null }), false)
assert.equal(isShortcutAllowed(event(), settings, { targetEditable: true, dialogScope: null }), false)
assert.equal(isShortcutAllowed(event(), settings, { targetEditable: false, dialogScope: 'other' }), false)
assert.equal(isShortcutAllowed(event({ code: 'Slash', shiftKey: true }), help, { targetEditable: false, dialogScope: 'settings' }), true)
assert.equal(isShortcutAllowed(event({ code: 'Slash', shiftKey: true }), help, { targetEditable: false, dialogScope: 'other' }), false)
assert.equal(keyboardShortcutRegistry.length, 4, 'only registered shortcuts are advertised')

console.log('keyboard shortcut tests passed (registry, actions, focus guards, dialogs and duplicate prevention)')
