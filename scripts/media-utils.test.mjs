import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyPrivateVideoFailure, PRIVATE_VIDEO_BLOB_MAX_BYTES, privateVideoFailureTranslationKey, shouldFallbackPrivateVideo } from '../src/renderer/utils/media.ts'

test('classifies private video HTTP failures without retaining request data', () => {
  assert.equal(classifyPrivateVideoFailure({ status: 401 }), 'permission')
  assert.equal(classifyPrivateVideoFailure({ status: 403 }), 'permission')
  assert.equal(classifyPrivateVideoFailure({ status: 404 }), 'permission')
  assert.equal(classifyPrivateVideoFailure({ status: 429 }), 'rateLimited')
  assert.equal(classifyPrivateVideoFailure({ status: 503 }), 'network')
  assert.equal(classifyPrivateVideoFailure({ status: 0, networkError: true }), 'network')
  assert.equal(classifyPrivateVideoFailure({ status: 0, formatError: true }), 'format')
})

test('validates MP4 response headers and the 25 MB download limit', () => {
  assert.equal(PRIVATE_VIDEO_BLOB_MAX_BYTES, 25 * 1024 * 1024)
  assert.equal(classifyPrivateVideoFailure({ status: 200, contentType: 'video/mp4; codecs="avc1"', contentLength: '1024' }), null)
  assert.equal(classifyPrivateVideoFailure({ status: 200, contentType: 'text/html' }), 'format')
  assert.equal(classifyPrivateVideoFailure({ status: 200, contentType: 'video/mp4', contentLength: String(PRIVATE_VIDEO_BLOB_MAX_BYTES + 1) }), 'tooLarge')
  assert.equal(classifyPrivateVideoFailure({ status: 200, contentType: 'video/mp4', actualSize: PRIVATE_VIDEO_BLOB_MAX_BYTES + 1 }), 'tooLarge')
})

test('allows one private video fallback for supported media errors', () => {
  for (const mediaErrorCode of [2, 3, 4]) {
    assert.equal(shouldFallbackPrivateVideo({ privateMedia: true, mediaErrorCode, alreadyAttempted: false }), true)
    assert.equal(shouldFallbackPrivateVideo({ privateMedia: true, mediaErrorCode, alreadyAttempted: true }), false)
  }
  assert.equal(shouldFallbackPrivateVideo({ privateMedia: false, mediaErrorCode: 4, alreadyAttempted: false }), false)
  assert.equal(privateVideoFailureTranslationKey('rateLimited'), 'media.privateVideo.rateLimited')
})
