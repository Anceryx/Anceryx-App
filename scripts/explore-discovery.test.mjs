import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { messages } from '../src/renderer/i18nCatalog.ts'

const page = await readFile(new URL('../src/renderer/pages/ExplorePage.tsx', import.meta.url), 'utf8')

assert.match(page, /const \[draftQuery, setDraftQuery\] = useState\(''\)/)
assert.match(page, /const \[submittedQuery, setSubmittedQuery\] = useState\(''\)/)
assert.match(page, /const \[tab, setTab\] = useState<Tab>\('posts'\)/)
assert.match(page, /const searching = submittedQuery\.length > 0/)
assert.match(page, /<form onSubmit=\{submitSearch\}/)
assert.match(page, /value=\{draftQuery\} onChange=\{\(event\) => setDraftQuery\(event\.target\.value\)\}/)
assert.match(page, /setTab\('tudo'\)[\s\S]*setSubmittedQuery\(term\)/)
assert.match(page, /\{searching && <div role="tablist"/)
assert.match(page, /\{ id: 'tudo'/)
assert.match(page, /\{ id: 'posts'/)
assert.match(page, /\{ id: 'pessoas'/)
assert.match(page, /\{ id: 'foruns'/)
assert.match(page, /\{ id: 'hashtags'/)
assert.match(page, /\{ id: 'canais'/)
assert.match(page, /\{ id: 'mensagens'/)
assert.match(page, /const clearSearch = \(\) => \{[\s\S]*setDraftQuery\(''\)[\s\S]*setSubmittedQuery\(''\)[\s\S]*clearSearchResults\(\)/)
assert.match(page, /\{!searching && <section aria-labelledby="explore-discovery-forums"/)
assert.match(page, /forumApi\.discoverForums\(\)/)
assert.match(page, /hydrateSocial\(\)/)
assert.match(page, /if \(!active\) return/)
assert.match(page, /postsApi\.search\(submittedQuery\.trim\(\), 20, cursor\)/)
assert.match(page, /communityApi\.searchMessages\(submittedQuery\.trim\(\), 20, communityCursor\)/)
assert.doesNotMatch(page, /searchPrivate|directMessageApi\.search/)
assert.match(page, /setSelectedPost\(post\.id\)/)
assert.match(page, /setSelectedUser\(profile\.username\)/)
assert.match(page, /onOpenWorkspace\(localForum\)/)
assert.match(page, /t\('explore\.video'\)/)
assert.match(page, /t\('explore\.postWithImage'\)/)
assert.match(page, /\{post\.content \|\|/)
for (const locale of ['pt-BR', 'en-US', 'es-ES']) {
  assert.ok(messages[locale]['explore.video'], `${locale} is missing the video label`)
  assert.ok(messages[locale]['explore.postWithImage'], `${locale} is missing the image-post label`)
}

console.log('Explore discovery/search state and privacy guards passed.')
