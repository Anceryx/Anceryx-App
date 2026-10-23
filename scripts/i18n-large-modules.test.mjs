import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { messages } from '../src/renderer/i18nCatalog.ts'

const profile = await readFile(new URL('../src/renderer/components/social/UserProfileModal.tsx', import.meta.url), 'utf8')
const profilePage = await readFile(new URL('../src/renderer/pages/PerfilPage.tsx', import.meta.url), 'utf8')
const forumManagement = await readFile(new URL('../src/renderer/components/social/ForumManagementModal.tsx', import.meta.url), 'utf8')
const communityWorkspace = await readFile(new URL('../src/renderer/components/social/CommunityWorkspaceModal.tsx', import.meta.url), 'utf8')
const communityForumChannel = await readFile(new URL('../src/renderer/components/social/CommunityForumChannel.tsx', import.meta.url), 'utf8')
const forumDetail = await readFile(new URL('../src/renderer/components/social/ForumDetailModal.tsx', import.meta.url), 'utf8')
const createForum = await readFile(new URL('../src/renderer/components/social/CreateForumModal.tsx', import.meta.url), 'utf8')
const feedPage = await readFile(new URL('../src/renderer/pages/FeedPage.tsx', import.meta.url), 'utf8')
const postDetail = await readFile(new URL('../src/renderer/components/social/PostDetailModal.tsx', import.meta.url), 'utf8')
const sharedPost = await readFile(new URL('../src/renderer/components/messages/SharedPostPreview.tsx', import.meta.url), 'utf8')
const privacySettings = await readFile(new URL('../src/renderer/components/settings/sections/DadosPrivacidadeSection.tsx', import.meta.url), 'utf8')
const notificationSettings = await readFile(new URL('../src/renderer/components/settings/sections/NotificacoesSection.tsx', import.meta.url), 'utf8')
const profileSettings = await readFile(new URL('../src/renderer/components/settings/sections/PerfilSection.tsx', import.meta.url), 'utf8')
const aboutSettings = await readFile(new URL('../src/renderer/components/settings/sections/SobreSection.tsx', import.meta.url), 'utf8')
const loginHistorySettings = await readFile(new URL('../src/renderer/components/settings/sections/UltimosLoginsSection.tsx', import.meta.url), 'utf8')
const billing = await readFile(new URL('../src/renderer/pages/CobrancaPage.tsx', import.meta.url), 'utf8')
const billingResult = await readFile(new URL('../src/renderer/pages/BillingResultPage.tsx', import.meta.url), 'utf8')
const voiceSettings = await readFile(new URL('../src/renderer/components/settings/sections/VozSection.tsx', import.meta.url), 'utf8')
const settingsNav = await readFile(new URL('../src/renderer/components/settings/SettingsNav.tsx', import.meta.url), 'utf8')
const messagesPage = await readFile(new URL('../src/renderer/pages/MensagensPage.tsx', import.meta.url), 'utf8')
const loginPage = await readFile(new URL('../src/renderer/pages/LoginPage.tsx', import.meta.url), 'utf8')
const registerPage = await readFile(new URL('../src/renderer/pages/RegisterPage.tsx', import.meta.url), 'utf8')
const webOAuthCallback = await readFile(new URL('../src/renderer/pages/WebOAuthCallbackPage.tsx', import.meta.url), 'utf8')
const webDeepLink = await readFile(new URL('../src/renderer/router/WebDeepLinkPage.tsx', import.meta.url), 'utf8')
const authApi = await readFile(new URL('../src/renderer/services/authApi.ts', import.meta.url), 'utf8')

for (const locale of ['pt-BR', 'en-US', 'es-ES']) {
  for (const key of [
    'profile.loading', 'profile.removeFriend', 'profile.myModerationHistory',
    'profile.appealPlaceholder', 'profile.noAvailableForums', 'forumManage.overview',
    'forumManage.moderation', 'forumManage.role.owner', 'forumManage.role.moderator',
    'forumManage.status.pending', 'forumManage.status.reviewing', 'forumManage.status.resolved',
    'workspaceModeration.bannedMembers', 'workspaceModeration.messageReports',
    'workspaceModeration.moderationAction', 'workspaceModeration.history',
    'communityForum.topic', 'communityForum.topicTitle', 'communityForum.topicContent',
    'communityForum.writeReply', 'communityForum.noPosts', 'communityForum.postsDescription',
    'communityForum.loadTopicsFailed', 'communityForum.repliesCount',
    'workspaceUi.applyFilters', 'workspaceUi.noCases', 'workspaceUi.auditTitle',
    'workspaceUi.noAuditEvents', 'workspaceUi.caseDetails', 'workspaceUi.changedTo',
    'workspaceUi.globalNavigation', 'workspaceUi.sectionFeed', 'workspaceUi.sectionMessages',
    'workspaceUi.sectionExplore', 'workspaceUi.sectionForums', 'workspaceUi.sectionProfile',
    'workspaceUi.appealReviewerDisabled', 'workspaceUi.confirmAdministrativeCorrection',
    'workspaceUi.reportsRange', 'workspaceUi.casesRange', 'workspaceUi.eventsRange',
    'workspaceUi.inviteUseCount', 'workspaceUi.microphoneMuted', 'workspaceUi.speaking',
    'settings.privacy.blockedAccounts', 'settings.notifications.privateMessageSound',
    'settings.profile.whoCanMessage', 'settings.about.securePaused', 'settings.loginHistory.currentSession',
    'billing.heroTitle', 'billing.benefit.1', 'billing.result.successTitle',
    'forumManage.delete.title', 'forumManage.reportsDescription', 'forumManage.accessDescription',
    'forumManage.removeMemberDescription', 'forumManage.error.imageType', 'forumManage.notice.settingsSaved',
    'forumManage.memberJoined', 'forumManage.decisionRecorded', 'forumManage.removeTagAria',
    'forums.detailAria', 'forums.joinFailed', 'forums.openCommunity', 'forums.enterCommunity',
    'forums.created', 'forums.contentsTitle', 'forums.contentsDescription',
    'createForum.title', 'createForum.template.blank.title', 'createForum.template.games.title',
    'createForum.template.friends.title', 'createForum.template.community.title',
    'createForum.templateCounts', 'createForum.visibility.public', 'createForum.visibility.private',
    'createForum.validation.nameMin', 'createForum.validation.descriptionRequired',
    'createForum.validation.tagInvalid', 'validation.fileType', 'createForum.created',
    'feed.followingLoadFailed', 'feed.searchFailed', 'feed.newComment', 'feed.newReaction',
    'feed.uploadLimitFailed', 'feed.createDraftFailed', 'feed.createFailed', 'feed.loadMoreFailed',
    'post.commentFailed', 'post.retryComment',
    'profile.loadForumsFailed', 'profile.invalidBannerColor', 'profile.updated', 'profile.updateFailed',
    'profile.bannerPlusRequired', 'profile.imageFormatUnsupported', 'profile.imageSizeLimit',
    'profile.imageUpdated', 'profile.imageUploadFailed', 'profile.imageProcessingFailed',
    'profile.bannerRemoved', 'profile.removeBannerFailed', 'profile.badgePreferenceFailed',
    'profile.featuredBadgesHeader', 'profile.featuredBadgesFailed',
    'messages.sharedPostBy', 'messages.sharedPostUnavailable', 'messages.sharedPostLoading',
    'messages.gifProviderAttribution', 'messages.sendGif', 'auth.termsPrivacyAnd', 'settings.appVersionLabel',
    'auth.googleHandoffFailed', 'auth.completingGoogleSignIn', 'common.openingAnceryxLink',
    'auth.detailsInvalid', 'auth.emailAlreadyRegistered', 'auth.usernameAlreadyInUse', 'auth.accountAlreadyInUse',
    'auth.invalidCredentials', 'auth.sessionExpired', 'auth.tooManyAttempts', 'auth.serviceUnavailable',
    'auth.authenticationFailed', 'auth.apiConnectionFailed',
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
assert.match(communityWorkspace, /t\('workspaceUi\.applyFilters'\)/)
assert.match(communityWorkspace, /t\('workspaceUi\.auditTitle'\)/)
assert.match(communityWorkspace, /communityPermissionLabel\(permission, t\)/)
assert.match(communityWorkspace, /getCommunityMemberRoleLabels\(member, t\)/)
assert.match(communityWorkspace, /t\('workspaceUi\.appealDecisionDate', \{ value:/)
assert.match(communityWorkspace, /t\('workspaceUi\.reportsRange', \{ start:/)
assert.match(communityWorkspace, /t\('workspaceUi\.casesRange', \{ start:/)
assert.match(communityWorkspace, /t\('workspaceUi\.eventsRange', \{ start:/)
for (const untranslatedLabel of [
  'Não foi possível carregar a auditoria do fórum.', 'Sem resultados',
  'Registrar advertência', 'Pendente — aguardando revisor independente',
  'Preferências do Fórum', 'Confirmar presença', 'Microfone ativo',
  'Mensagem excluída', 'Voltar ao conteúdo',
]) {
  assert.ok(!communityWorkspace.includes(`'${untranslatedLabel}'`), `CommunityWorkspaceModal still has a fixed UI string: ${untranslatedLabel}`)
}

// These values come from members or server records and must remain as received.
assert.match(profile, /\{shown\.bio\}/)
assert.match(profile, /\{forum\.name\}/)
assert.match(profile, /\{item\.reason\}/)
assert.match(profile, /\{appeal\.statement\}/)
assert.match(forumManagement, /\{topic\.title\}/)
assert.match(forumManagement, /\{topic\.content\}/)
assert.match(forumManagement, /\{report\.reason\}/)
assert.match(communityWorkspace, /renderAnceryxText\(message\.content\)/)
assert.match(communityWorkspace, /\{report\.message\.content\}/)
assert.match(communityWorkspace, /\{item\.reason\}/)
assert.match(communityWorkspace, /\{appeal\.statement\}/)
assert.match(communityForumChannel, /t\('communityForum\.postsDescription'\)/)
assert.match(communityForumChannel, /t\('communityForum\.loadTopicsFailed'\)/)
assert.match(forumDetail, /t\('forums\.detailAria', \{ name: liveForum\.name \}\)/)
assert.match(forumDetail, /t\('forums\.contentsTitle'\)/)
assert.match(forumDetail, /t\('forums\.contentsDescription'\)/)
assert.match(privacySettings, /t\('settings\.privacy\.blockedAccounts'\)/)
assert.match(notificationSettings, /t\('settings\.notifications\.privateMessageSound'\)/)
assert.match(profileSettings, /t\('settings\.profile\.whoCanMessage'\)/)
assert.match(aboutSettings, /t\(statusKey\[info\.state\]\)/)
assert.match(loginHistorySettings, /formatDateTime\(new Date\(login\.occurredAt\)\)/)
assert.match(billing, /t\('billing\.heroTitle'\)/)
assert.match(billing, /t\(`billing\.benefit\.\$\{index \+ 1\}`/)
assert.match(billingResult, /t\('billing\.result\.successTitle'\)/)
assert.match(forumManagement, /t\('forumManage\.delete\.title'\)/)
assert.match(forumManagement, /t\('forumManage\.reportsDescription'\)/)
assert.match(forumManagement, /t\('forumManage\.notice\.settingsSaved'\)/)
assert.match(forumManagement, /t\('forumManage\.memberJoined', \{ handle:/)
assert.match(forumManagement, /t\('forumManage\.decisionRecorded', \{ value: report\.resolutionNote \}\)/)
assert.match(forumManagement, /t\('forumManage\.removeTagAria', \{ name: tag \}\)/)
assert.match(profile, /t\('profile\.communityMemberData', \{ name: communityContext\.forumName \}\)/)
assert.match(profile, /t\('profile\.viewAchievement', \{ name: badge\.name \}\)/)
assert.match(profile, /\{role\.name\}/)

// Member-created topic/reply content and names stay in their original language.
assert.match(communityForumChannel, /\{activeTopic\.title\}/)
assert.match(communityForumChannel, /\{activeTopic\.content\}/)
assert.match(communityForumChannel, /\{item\.content\}/)
assert.match(communityForumChannel, /\{topic\.title\}/)
assert.match(communityForumChannel, /\{topic\.content\}/)
assert.match(forumDetail, /renderAnceryxText\(liveForum\.description\)/)
assert.match(forumDetail, /\{liveForum\.name\}/)
for (const key of ['createForum.title', 'createForum.chooseStructure', 'createForum.namePlaceholder', 'createForum.descriptionPlaceholder', 'createForum.visibilityQuestion', 'createForum.purposeNote']) {
  assert.ok(createForum.includes(`t('${key}')`) || createForum.includes(`aria-label={t('${key}')}`), `CreateForumModal does not use ${key}`)
}
assert.match(createForum, /value=\{name\}/)
assert.match(createForum, /value=\{description\}/)
assert.match(createForum, /name,\s*description,/)
assert.match(createForum, /t\(category\.nameKey\)/)
assert.match(createForum, /t\(channel\.nameKey\)/)
assert.match(createForum, /validateForumTags\(tags, t\)/)
assert.match(createForum, /validateUpload\(file, ICON_MIMES, ICON_MAX, t\)/)
for (const key of ['feed.followingLoadFailed', 'feed.searchFailed', 'feed.newComment', 'feed.newReaction', 'feed.uploadLimitFailed', 'feed.createDraftFailed', 'feed.createFailed', 'feed.loadMoreFailed']) {
  assert.ok(feedPage.includes(`t('${key}')`), `FeedPage does not use ${key}`)
}
assert.match(postDetail, /setError\(t\('post\.commentFailed'\)\)/)
assert.match(postDetail, /t\('post\.retryComment'\)/)
assert.match(postDetail, /renderAnceryxText\(comment\.content\)/)
assert.match(postDetail, /renderPostText\(post\.content\)/)
for (const key of ['profile.loadForumsFailed', 'profile.invalidBannerColor', 'profile.updated', 'profile.updateFailed', 'profile.bannerPlusRequired', 'profile.imageFormatUnsupported', 'profile.imageSizeLimit', 'profile.imageUpdated', 'profile.imageUploadFailed', 'profile.imageProcessingFailed', 'profile.bannerRemoved', 'profile.removeBannerFailed', 'profile.badgePreferenceFailed', 'profile.featuredBadgesHeader', 'profile.featuredBadgesFailed']) {
  assert.ok(profilePage.includes(`t('${key}')`) || profilePage.includes(`t('${key}',`), `PerfilPage does not use ${key}`)
}
assert.match(profilePage, /toLocaleLowerCase\(locale\)/)
assert.match(profilePage, /\{userProfile\.bio\}/)
assert.match(profilePage, /\{userProfile\.customStatus\.text\}/)
assert.match(profilePage, /\{forum\.name\}/)
assert.match(profilePage, /\{forum\.description\}/)
assert.match(profilePage, /\{selectedBadge\?\.description\}/)
assert.doesNotMatch(profilePage, /Não foi possível carregar as publicações\./)
assert.match(sharedPost, /t\('messages\.sharedPostBy', \{ name: post\.author\.displayName \}\)/)
assert.match(sharedPost, /\{post\.content\.slice\(0, 240\)\}/)
assert.match(voiceSettings, /t\('settings\.voice\.stopMicTest'\)/)
assert.match(voiceSettings, /t\('settings\.voice\.startMicTest'\)/)
assert.match(voiceSettings, /t\('settings\.voice\.testAudio'\)/)
assert.match(settingsNav, /t\('settings\.appVersionLabel', \{ version:/)
assert.match(messagesPage, /t\('messages\.gifProviderAttribution'\)/)
assert.match(loginPage, /t\('auth\.termsPrivacyAnd'\)/)
assert.match(registerPage, /t\('auth\.termsPrivacyAnd'\)/)
assert.match(webOAuthCallback, /t\('auth\.googleHandoffFailed'\)/)
assert.match(webOAuthCallback, /t\('auth\.backToLogin'\)/)
assert.match(webOAuthCallback, /t\('auth\.completingGoogleSignIn'\)/)
assert.match(webDeepLink, /t\('common\.openingAnceryxLink'\)/)
assert.match(authApi, /case 'EMAIL_ALREADY_EXISTS': return '__i18n:auth\.emailAlreadyRegistered'/)
assert.match(authApi, /case 'INVALID_CREDENTIALS': return '__i18n:auth\.invalidCredentials'/)
assert.match(authApi, /case 'SESSION_REVOKED': return '__i18n:auth\.sessionExpired'/)
assert.doesNotMatch(authApi, /payload\.message|error\?\.message/)
assert.match(privacySettings, /\{user\.displayName\}/)
assert.match(privacySettings, /\{user\.username\}/)
assert.match(profileSettings, /\{request\.user\.displayName\}/)
assert.match(profileSettings, /\{request\.user\.username\}/)

// Localization must not bypass the existing owner permission checks.
assert.match(forumManagement, /disabled=\{!isOwner\}/)
assert.match(forumManagement, /const canManage = currentRole === 'owner' \|\| currentRole === 'moderator'/)

console.log('large-module localization regression tests passed')
