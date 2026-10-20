import assert from 'node:assert/strict'
import { createSessionRevision } from '../src/renderer/store/sessionRevision.ts'

const revisions = createSessionRevision()
const refreshRevision = revisions.current()
revisions.advance()
assert.equal(revisions.isCurrent(refreshRevision), false, 'logout invalidates a refresh started before it')

const currentRefreshRevision = revisions.current()
assert.equal(revisions.isCurrent(currentRefreshRevision), true, 'current refresh remains eligible to commit')
revisions.advance()
assert.equal(revisions.isCurrent(currentRefreshRevision), false, 'new auth action invalidates the previous refresh')

console.log('Session revision concurrency checks passed.')
