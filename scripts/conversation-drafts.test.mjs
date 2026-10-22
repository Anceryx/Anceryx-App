import assert from 'node:assert/strict'
import test from 'node:test'
import { getConversationDraft, saveConversationDraft } from '../src/renderer/utils/conversationDrafts.ts'

test('keeps drafts isolated by conversation and clears empty drafts', () => {
  const drafts = new Map()
  saveConversationDraft(drafts, 'conversation-a', 'rascunho A')
  saveConversationDraft(drafts, 'conversation-b', 'rascunho B')
  assert.equal(getConversationDraft(drafts, 'conversation-a'), 'rascunho A')
  assert.equal(getConversationDraft(drafts, 'conversation-b'), 'rascunho B')
  saveConversationDraft(drafts, 'conversation-a', '  ')
  assert.equal(getConversationDraft(drafts, 'conversation-a'), '')
})

test('bounds draft size and number of retained conversations', () => {
  const drafts = new Map()
  saveConversationDraft(drafts, 'conversation-a', 'x'.repeat(12_000))
  assert.equal(getConversationDraft(drafts, 'conversation-a').length, 10_000)
  for (let index = 0; index < 110; index += 1) saveConversationDraft(drafts, `conversation-${index}`, 'draft')
  assert.equal(drafts.size, 100)
  assert.equal(getConversationDraft(drafts, 'conversation-0'), '')
  assert.equal(getConversationDraft(drafts, 'conversation-109'), 'draft')
})
