import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const main = await readFile(new URL('../src/main/main.ts', import.meta.url), 'utf8')
const html = await readFile(new URL('../src/renderer/index.html', import.meta.url), 'utf8')
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
const electronVite = await readFile(new URL('../electron.vite.config.ts', import.meta.url), 'utf8')
const attachment = await readFile(new URL('../src/renderer/components/ui/MediaAttachment.tsx', import.meta.url), 'utf8')
const mediaUtils = await readFile(new URL('../src/renderer/utils/media.ts', import.meta.url), 'utf8')
const crop = await readFile(new URL('../src/renderer/components/ui/ImageCropModal.tsx', import.meta.url), 'utf8')
const cropHarness = await readFile(new URL('../src/renderer/image-crop-visual-test.tsx', import.meta.url), 'utf8')
const qa = await readFile(new URL('../docs/MP4_PLAYBACK_QA.md', import.meta.url), 'utf8')

for (const host of ['admin-anceryx.site', 'blob.squarecloud.dev', 'public-blob.squarecloud.dev']) {
  assert.ok(html.includes(`https://${host}`), `HTML media CSP must allow ${host}`)
}
for (const host of ['admin-anceryx.site', 'api.anceryx.site', 'blob.squarecloud.dev', 'public-blob.squarecloud.dev', 'static.klipy.com', 'static1.klipy.com', 'static2.klipy.com']) {
  assert.ok(html.includes(`https://${host}`), `HTML CSP must allow required connection host ${host}`)
}
assert.match(html, /connect-src 'self' https:\/\/admin-anceryx\.site/)
assert.doesNotMatch(html, /frame-ancestors/)
assert.match(main, /frame-ancestors 'none'/, 'Electron must deliver frame-ancestors as an HTTP response header, not a meta directive')
const vercelCsp = vercel.headers.flatMap((rule) => rule.headers).find((header) => header.key.toLowerCase() === 'content-security-policy')
assert.match(vercelCsp?.value ?? '', /frame-ancestors 'none'/, 'Vercel must keep frame-ancestors in the HTTP CSP header')
assert.ok(vercel.headers.flatMap((rule) => rule.headers).some((header) => header.key.toLowerCase() === 'x-frame-options' && header.value === 'DENY'))
assert.match(electronVite, /unsafe-eval/)
for (const header of ['content-type', 'content-length', 'content-disposition', 'accept-ranges', 'content-range']) assert.ok(main.includes(`readHeader('${header}')`), `Electron media response diagnostics must include ${header}`)
assert.match(main, /onBeforeSendHeaders/)
assert.match(main, /rangeRequested: mediaRanges\.get\(details\.id\)/)
assert.match(main, /onBeforeRedirect/)
assert.match(main, /onErrorOccurred/)
assert.match(attachment, /onLoadedMetadata=/)
assert.match(attachment, /onLoadedData=/)
assert.match(attachment, /errorMessage: video\?\.error\?\.message/)
assert.match(attachment, /canPlayHeAacV2/)
assert.match(attachment, /fetch\(freshPlaybackUrl, \{ method: 'GET', signal: controller\.signal \}\)/)
assert.match(attachment, /response\.body\?\.getReader\(\)/)
assert.match(attachment, /new Blob\(chunks, \{ type: 'video\/mp4' \}\)/)
assert.match(attachment, /response\.headers\.get\('content-length'\)/)
assert.match(attachment, /URL\.revokeObjectURL\(objectUrl\)/)
assert.match(mediaUtils, /PRIVATE_VIDEO_BLOB_MAX_BYTES = 25 \* 1024 \* 1024/)
assert.match(crop, /disabled=\{!imageReady \|\| busy \|\| Boolean\(error\)\}/)
assert.match(cropHarness, /Quadrantes detectados/)
assert.match(cropHarness, /context\.getImageData/)
assert.match(qa, /As três variantes.*todas falharam/)
assert.match(qa, /prévia local/)

console.log('MP4 diagnostics smoke: PASS (HTTPS CSP, media response headers, Range, redirects, failures, local/remote QA, crop harness)')
