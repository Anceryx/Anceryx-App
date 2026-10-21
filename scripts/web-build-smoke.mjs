import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const output = join(root, 'web-dist')
const html = await readFile(join(output, 'index.html'), 'utf8')
const fallback = await readFile(join(output, 'vite.html'), 'utf8')
assert.equal(fallback, html, 'Square Cloud SPA fallback must match the built app shell')
assert.match(html, /Content-Security-Policy/)
assert.doesNotMatch(html, /localhost|unsafe-eval|app:\/\/anceryx|electronAPI/)
const assets = await readdir(join(output, 'assets'))
assert.ok(assets.some((asset) => asset.endsWith('.js')), 'Web bundle must include JavaScript')
assert.ok(assets.some((asset) => asset.endsWith('.css')), 'Web bundle must include CSS')
assert.ok(!assets.some((asset) => /\.map$/.test(asset)), 'Production web output must not include source maps')
process.stdout.write('Web build smoke passed (SPA shell, CSP, static assets and no source maps).\n')
