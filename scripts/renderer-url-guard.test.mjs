import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const main = await readFile(new URL('../src/main/main.ts', import.meta.url), 'utf8')

assert.match(main, /const developmentRendererUrl = !app\.isPackaged \? process\.env\['ELECTRON_RENDERER_URL'\] : undefined/)
assert.equal((main.match(/process\.env\['ELECTRON_RENDERER_URL'\]/g) ?? []).length, 1)
assert.match(main, /webSecurity: !developmentRendererUrl/)
assert.match(main, /const isDev = Boolean\(developmentRendererUrl\)/)
assert.match(main, /developmentRendererUrl && url\.startsWith\(developmentRendererUrl\)/)
assert.match(main, /if \(developmentRendererUrl\) \{\s*void win\.loadURL\(developmentRendererUrl\)/)
assert.match(main, /if \(!developmentRendererUrl\) \{\s*app\.applicationMenu = null/)

console.log('Renderer URL guard tests passed (development URL is ignored in packaged builds).')
