import test from 'node:test'
import assert from 'node:assert/strict'
import { clampCropOffset, clampCropZoom, coverScale, cropDrawRect, getCropOutputSize } from '../src/renderer/utils/imageCropGeometry.ts'
import { dataUrlToBlob, detachTracksFromPeer, resolvePrivatePlaybackUrl } from '../src/renderer/utils/media.ts'

test('cover scale fits landscape, portrait, and square images without distortion', () => {
  assert.equal(coverScale(1600, 900, 220, 220), 220 / 900)
  assert.equal(coverScale(900, 1600, 220, 220), 220 / 900)
  assert.equal(coverScale(512, 512, 220, 220), 220 / 512)
  assert.equal(coverScale(1600, 900, 550, 220), 550 / 1600)
})

test('data URLs become blobs locally without a fetch request', async () => {
  const blob = dataUrlToBlob('data:image/webp;base64,AAECAw==')
  assert.equal(blob.type, 'image/webp')
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [0, 1, 2, 3])
})

test('rejects malformed or unsupported image data URLs', () => {
  assert.throws(() => dataUrlToBlob('data:text/html;base64,PHNjcmlwdD4='), /Imagem processada inválida/)
  assert.throws(() => dataUrlToBlob('data:image/png;base64,***'), /Imagem processada inválida/)
})

test('resolves private video tickets against the API and rejects foreign or malformed URLs', () => {
  const base = 'https://admin-anceryx.site'
  const resolved = resolvePrivatePlaybackUrl('/media/files/dm-image/video.mp4?ticket=signed-ticket', base)
  assert.equal(new URL(resolved).origin, base)
  assert.equal(new URL(resolved).pathname, '/media/files/dm-image/video.mp4')
  assert.equal(new URL(resolved).searchParams.get('ticket'), 'signed-ticket')
  assert.throws(() => resolvePrivatePlaybackUrl('https://evil.example/media/files/dm-image/video.mp4?ticket=x', base))
  assert.throws(() => resolvePrivatePlaybackUrl('/media/files/post-image/video.mp4?ticket=x', base))
  assert.throws(() => resolvePrivatePlaybackUrl('/media/files/dm-image/video.mp4', base))
})

test('stopping a shared stream detaches only its tracks and preserves camera video', async () => {
  const cameraTrack = { kind: 'video' }
  const screenTrack = { kind: 'video' }
  const cameraSender = { track: cameraTrack, replaceTrack: async (track) => { cameraSender.track = track } }
  const screenSender = { track: screenTrack, replaceTrack: async (track) => { screenSender.track = track } }
  const peer = { getSenders: () => [cameraSender, screenSender] }
  await detachTracksFromPeer(peer, { getTracks: () => [screenTrack] })
  assert.equal(cameraSender.track, cameraTrack)
  assert.equal(screenSender.track, null)
})

test('zoom is bounded and crop movement maps proportionally to output pixels', () => {
  assert.equal(clampCropZoom(0.2), 1)
  assert.equal(clampCropZoom(10), 3)
  assert.deepEqual(cropDrawRect(1000, 1000, 220, 220, 512, 1, 20, -10), { width: 512, height: 512, x: 302.54545454545456, y: 232.72727272727272 })
})

test('canonical outputs retain their target size when source detail is sufficient', () => {
  assert.deepEqual(getCropOutputSize(2400, 1600, 550, 220, 600, 240), { width: 600, height: 240 })
  assert.deepEqual(getCropOutputSize(3000, 2000, 391, 220, 1920, 1080), { width: 1920, height: 1080 })
})

test('small sources are not enlarged beyond the available crop resolution', () => {
  assert.deepEqual(getCropOutputSize(100, 100, 220, 220, 512, 512), { width: 100, height: 100 })
  assert.deepEqual(getCropOutputSize(800, 120, 550, 220, 600, 240), { width: 300, height: 120 })
})

test('crop movement is clamped so the crop frame never exposes empty space', () => {
  assert.deepEqual(clampCropOffset(500, -500, 1600, 900, 220, 220), { x: 85.55555555555554, y: 0 })
  assert.deepEqual(clampCropOffset(500, -500, 1600, 900, 220, 220, 2), { x: 281.1111111111111, y: -110 })
})

test('invalid image dimensions are rejected', () => {
  assert.throws(() => coverScale(0, 100, 220, 220), RangeError)
})
