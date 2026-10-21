import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const channel = await readFile(new URL('../src/renderer/components/social/CommunityForumChannel.tsx', import.meta.url), 'utf8')
const workspace = await readFile(new URL('../src/renderer/components/social/CommunityWorkspaceModal.tsx', import.meta.url), 'utf8')
const api = await readFile(new URL('../src/renderer/services/forumApi.ts', import.meta.url), 'utf8')
const serverRoutes = await readFile(new URL('../../anceryx-api/src/modules/forums/routes.ts', import.meta.url), 'utf8')

assert.match(channel, /forumApi\.listTopics\(forumId\)/)
assert.match(channel, /forumApi\.createTopic\(forumId/)
assert.match(channel, /forumApi\.getTopic\(forumId/)
assert.match(channel, /forumApi\.listReplies\(forumId/)
assert.match(channel, /forumApi\.createReply\(forumId/)
assert.match(channel, /forumApi\.updateTopic\(forumId/)
assert.match(channel, /Ainda não há publicações/)
assert.match(api, /\/topics\/\$\{topicId\}\/replies/)
assert.match(workspace, /canCreateTopics=\{hasCommunityPermission\('createTopics'\)\}/)
assert.match(serverRoutes, /authorizeTopicCreation\(params\.forumId, userId\)/)
assert.match(channel, /canCreateTopics && <form/)
assert.match(workspace, /<CommunityForumChannel/)
console.log('community posts smoke: PASS (list, create, read, edit, delete, reply and permission gate)')
