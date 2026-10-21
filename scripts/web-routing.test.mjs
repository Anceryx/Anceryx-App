import assert from 'node:assert/strict'
import { resolveWebLinkIntent } from '../src/renderer/router/webLinkIntent.ts'
import { safeReturnTo } from '../src/renderer/platform/navigation.ts'

assert.deepEqual(resolveWebLinkIntent('posts', 'post-123'), { type: 'post', id: 'post-123', section: 'feed' })
assert.deepEqual(resolveWebLinkIntent('foruns', 'forum-123'), { type: 'forum', id: 'forum-123', section: 'foruns' })
assert.deepEqual(resolveWebLinkIntent('perfil', '@daniel'), { type: 'profile', username: 'daniel', section: 'feed' })
assert.deepEqual(resolveWebLinkIntent('profile', 'daniel'), { type: 'profile', username: 'daniel', section: 'feed' })
assert.deepEqual(resolveWebLinkIntent('invite', 'invite-token'), { type: 'invite', token: 'invite-token', section: 'foruns' })
assert.equal(resolveWebLinkIntent('posts', ''), null)
assert.equal(resolveWebLinkIntent('posts', 'x'.repeat(513)), null)
assert.equal(resolveWebLinkIntent('posts', 'bad\\path'), null)
assert.equal(resolveWebLinkIntent('unknown', 'value'), null)
assert.equal(safeReturnTo({ returnTo: '/posts/qa-id' }), '/posts/qa-id')
assert.equal(safeReturnTo({ returnTo: '//attacker.example' }), '/app')
assert.equal(safeReturnTo({ returnTo: 'https://attacker.example' }), '/app')
assert.equal(safeReturnTo({ returnTo: '/\\attacker.example' }), '/app')
process.stdout.write('Web routing tests passed (post, forum, profile, invite and invalid inputs).\n')
