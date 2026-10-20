import assert from 'node:assert/strict'
import { resolveMediaUrl } from '../src/renderer/utils/media.ts'

const base = 'https://admin-anceryx.site'
assert.equal(resolveMediaUrl('/media/avatar.png', base), `${base}/media/avatar.png`)
assert.equal(resolveMediaUrl('media/post.webp', base), `${base}/media/post.webp`)
assert.equal(resolveMediaUrl('https://cdn.example/media.png?sig=valid', base), 'https://cdn.example/media.png?sig=valid')
assert.equal(resolveMediaUrl('data:image/png;base64,AA==', base), 'data:image/png;base64,AA==')
assert.equal(resolveMediaUrl('blob:local-preview', base), 'blob:local-preview')
assert.equal(resolveMediaUrl('javascript:alert(1)', base), '')
assert.equal(resolveMediaUrl('', base), '')
process.stdout.write('Media URL regression checks passed (7 cases).\n')
