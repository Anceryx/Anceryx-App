import test from 'node:test'
import assert from 'node:assert/strict'
import { isolateDialogBackground, restoreDialogFocus, trapDialogTabKey } from '../src/renderer/utils/dialogAccessibility.ts'

function createFocusableDocument() {
  const document = { activeElement: null }
  const makeElement = (name, tabIndex = 0) => ({
    name,
    tabIndex,
    hidden: false,
    ownerDocument: document,
    focus() { document.activeElement = this },
    getAttribute() { return null },
  })
  const first = makeElement('first')
  const second = makeElement('second')
  const dialog = {
    ownerDocument: document,
    contains(element) { return element === this || element === first || element === second },
    querySelectorAll() { return [first, second] },
    focus() { document.activeElement = this },
  }
  return { document, dialog, first, second, makeElement }
}

function tabEvent(shiftKey = false) {
  return { key: 'Tab', shiftKey, prevented: false, preventDefault() { this.prevented = true } }
}

test('Tab and Shift+Tab stay inside the dialog at both boundaries', () => {
  const { document, dialog, first, second } = createFocusableDocument()
  document.activeElement = second
  const forward = tabEvent()
  assert.equal(trapDialogTabKey(dialog, forward), true)
  assert.equal(forward.prevented, true)
  assert.equal(document.activeElement, first)

  document.activeElement = first
  const backward = tabEvent(true)
  trapDialogTabKey(dialog, backward)
  assert.equal(backward.prevented, true)
  assert.equal(document.activeElement, second)
})

test('focus that escapes the dialog is returned to the first control', () => {
  const { document, dialog, first, makeElement } = createFocusableDocument()
  document.activeElement = makeElement('outside')
  const event = tabEvent()
  trapDialogTabKey(dialog, event)
  assert.equal(event.prevented, true)
  assert.equal(document.activeElement, first)
})

test('dialog receives focus when it has no focusable controls', () => {
  const { document, dialog } = createFocusableDocument()
  dialog.querySelectorAll = () => []
  const event = tabEvent(true)
  trapDialogTabKey(dialog, event)
  assert.equal(event.prevented, true)
  assert.equal(document.activeElement, dialog)
})

test('Tab from the dialog container enters the first or last control', () => {
  const { document, dialog, first, second } = createFocusableDocument()
  document.activeElement = dialog
  trapDialogTabKey(dialog, tabEvent())
  assert.equal(document.activeElement, first)
  document.activeElement = dialog
  trapDialogTabKey(dialog, tabEvent(true))
  assert.equal(document.activeElement, second)
})

test('focus returns to the connected opener and ignores a removed opener', () => {
  let focused = 0
  const connected = { isConnected: true, focus() { focused++ } }
  restoreDialogFocus(connected)
  assert.equal(focused, 1)
  restoreDialogFocus({ isConnected: false, focus() { focused++ } })
  assert.equal(focused, 1)
})

test('background branches become inert and regain their previous state on cleanup', () => {
  const makeNode = (parent, inert = false) => {
    const node = { parentElement: parent, children: [], inert }
    if (parent) parent.children.push(node)
    return node
  }
  const body = makeNode(null)
  const app = makeNode(body)
  const siblingRoot = makeNode(body)
  const layout = makeNode(app)
  const page = makeNode(layout)
  const dialogOverlay = makeNode(layout)
  const preInert = makeNode(layout, true)

  const restore = isolateDialogBackground(dialogOverlay, body)
  assert.equal(page.inert, true)
  assert.equal(preInert.inert, true)
  assert.equal(siblingRoot.inert, true)
  restore()
  assert.equal(page.inert, false)
  assert.equal(preInert.inert, true)
  assert.equal(siblingRoot.inert, false)
})
