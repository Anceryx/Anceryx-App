import assert from 'node:assert/strict'
import { mergeComments, upsertComment } from '../src/renderer/utils/commentState.ts'

const comment = (id, content) => ({ id, content })
const deliveredByRealtime = comment('server-1', 'hello')
const first = upsertComment([], deliveredByRealtime)
assert.equal(first.inserted, true)
const deliveredByHttp = comment('server-1', 'hello')
const reconciled = upsertComment(first.comments, deliveredByHttp)
assert.equal(reconciled.inserted, false)
assert.equal(reconciled.comments.length, 1)
assert.equal(mergeComments(reconciled.comments, [deliveredByRealtime, deliveredByHttp]).length, 1)
console.log('Comment reconciliation regression checks passed (4 cases).')
