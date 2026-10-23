import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const main = await readFile(new URL('../src/main/main.ts', import.meta.url), 'utf8')
const ipcSecurity = await readFile(new URL('../src/main/ipcSecurity.ts', import.meta.url), 'utf8')
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

assert.match(main, /const developmentRendererUrl = !app\.isPackaged \? process\.env\['ELECTRON_RENDERER_URL'\] : undefined/)
assert.equal((main.match(/process\.env\['ELECTRON_RENDERER_URL'\]/g) ?? []).length, 1)
assert.match(main, /webSecurity: !developmentRendererUrl/)
assert.match(main, /developmentRendererUrl && url\.startsWith\(developmentRendererUrl\)/)
assert.match(main, /if \(developmentRendererUrl\) \{\s*void win\.loadURL\(developmentRendererUrl\)/)
assert.match(main, /if \(!developmentRendererUrl\) \{\s*app\.applicationMenu = null/)
assert.match(main, /isTrustedRenderer\(event, mainWindow\?\.webContents \?\? null, developmentRendererUrl\)/)
assert.match(main, /registerUpdateIpc\(updateManager, isTrustedRendererEvent\)/)
assert.match(ipcSecurity, /event\.senderFrame !== event\.sender\.mainFrame/)
assert.match(ipcSecurity, /event\.sender !== mainWebContents/)
assert.match(main, /details\.resourceType === 'mainFrame'[\s\S]*requestUrl\.protocol === `\$\{RENDERER_SCHEME\}:`[\s\S]*requestUrl\.hostname === RENDERER_HOST/)
assert.match(main, /responseHeaders\[cspHeaderName\] = \[\.\.\.\(responseHeaders\[cspHeaderName\] \?\? \[\]\), "frame-ancestors 'none'"\]/)

for (const name of ['test:media-utils', 'test:renderer-url-guard', 'test:ipc-security']) {
  assert.ok(packageJson.scripts[name], `package.json must preserve ${name}`)
  assert.equal((JSON.stringify(packageJson.scripts).match(new RegExp(`\\"${name}\\"`, 'g')) ?? []).length, 1, `${name} must not be duplicated`)
}

console.log('Renderer URL guard tests passed (packaged build guard, IPC trust and security scripts).')
