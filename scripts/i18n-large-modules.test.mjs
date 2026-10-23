import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { messages } from '../src/renderer/i18nCatalog.ts'

const profile = await readFile(new URL('../src/renderer/components/social/UserProfileModal.tsx', import.meta.url), 'utf8')
const forumManagement = await readFile(new URL('../src/renderer/components/social/ForumManagementModal.tsx', import.meta.url), 'utf8')
const communityWorkspace = await readFile(new URL('../src/renderer/components/social/CommunityWorkspaceModal.tsx', import.meta.url), 'utf8')

for (const locale of ['pt-BR', 'en-US', 'es-ES']) {
  for (const key of [
    'profile.loading', 'profile.removeFriend', 'profile.myModerationHistory',
    'profile.appealPlaceholder', 'profile.noAvailableForums', 'forumManage.overview',
    'forumManage.moderation', 'forumManage.role.owner', 'forumManage.role.moderator',
    'forumManage.status.pending', 'forumManage.status.reviewing', 'forumManage.status.resolved',
    'workspaceModeration.bannedMembers', 'workspaceModeration.messageReports',
    'workspaceModeration.moderationAction', 'workspaceModeration.history',
  ]) {
    assert.ok(messages[locale][key], `${locale} is missing ${key}`)
  }
}

for (const key of ['profile.loading', 'profile.myModerationHistory', 'profile.appealPlaceholder', 'profile.noAvailableForums']) {
  assert.ok(profile.includes(`t('${key}')`), `UserProfileModal does not use ${key}`)
}
assert.match(forumManagement, /labelKey: 'forumManage\.overview'/)
assert.match(forumManagement, /t\(tab\.labelKey\)/)
assert.match(forumManagement, /t\(roleLabelKey\(member\.role\)\)/)
assert.match(forumManagement, /t\(reportStatusKey\(report\.status\)\)/)
assert.match(communityWorkspace, /t\('workspaceModeration\.bannedMembers'\)/)
assert.match(communityWorkspace, /t\('workspaceModeration\.moderationAction'\)/)

// These values come from members or server records and must remain as received.
assert.match(profile, /\{shown\.bio\}/)
assert.match(profile, /\{forum\.name\}/)
assert.match(profile, /\{item\.reason\}/)
assert.match(profile, /\{appeal\.statement\}/)
assert.match(forumManagement, /\{topic\.title\}/)
assert.match(forumManagement, /\{topic\.content\}/)
assert.match(forumManagement, /\{report\.reason\}/)
assert.match(communityWorkspace, /renderAnceryxText\(message\.content\)/)

// Localization must not bypass the existing owner permission checks.
assert.match(forumManagement, /disabled=\{!isOwner\}/)
assert.match(forumManagement, /const canManage = currentRole === 'owner' \|\| currentRole === 'moderator'/)

console.log('large-module localization regression tests passed')
