import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const main = await readFile(new URL('../src/main/main.ts', import.meta.url), 'utf8')
const html = await readFile(new URL('../src/renderer/index.html', import.meta.url), 'utf8')
const attachment = await readFile(new URL('../src/renderer/components/ui/MediaAttachment.tsx', import.meta.url), 'utf8')
const mediaUtils = await readFile(new URL('../src/renderer/utils/media.ts', import.meta.url), 'utf8')
const crop = await readFile(new URL('../src/renderer/components/ui/ImageCropModal.tsx', import.meta.url), 'utf8')
const cropHarness = await readFile(new URL('../src/renderer/image-crop-visual-test.tsx', import.meta.url), 'utf8')
const qa = await readFile(new URL('../docs/MP4_PLAYBACK_QA.md', import.meta.url), 'utf8')

for (const host of ['admin-anceryx.site', 'blob.squarecloud.dev', 'public-blob.squarecloud.dev']) {
  assert.ok(main.includes(`https://${host}`), `Electron media CSP must allow ${host}`)
  assert.ok(html.includes(`https://${host}`), `HTML media CSP must allow ${host}`)
}
assert.match(main, /media-src 'self' blob: https:\/\/admin-anceryx\.site/)
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
