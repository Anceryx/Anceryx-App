import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { isTrustedRenderer } from '../src/main/ipcSecurity.ts'

const mainSource = await readFile(new URL('../src/main/main.ts', import.meta.url), 'utf8')
const updateIpcSource = await readFile(new URL('../src/main/updater/updateIpc.ts', import.meta.url), 'utf8')

function rendererEvent(url, { sender = { mainFrame: null }, senderFrame = null } = {}) {
  const frame = senderFrame ?? { url }
  sender.mainFrame ??= frame
  return { sender, senderFrame: frame }
}

test('allows only the main app renderer and its main frame', () => {
  const sender = { mainFrame: null }
  const event = rendererEvent('app://anceryx/index.html', { sender })
  assert.equal(isTrustedRenderer(event, sender), true)
  assert.equal(isTrustedRenderer(event, { mainFrame: sender.mainFrame }), false)
  assert.equal(isTrustedRenderer({ ...event, senderFrame: { url: 'app://anceryx/child.html' } }, sender), false)
})

test('allows the configured development origin and rejects other origins', () => {
  const sender = { mainFrame: null }
  const event = rendererEvent('http://localhost:5173/login', { sender })
  assert.equal(isTrustedRenderer(event, sender, 'http://localhost:5173/'), true)
  assert.equal(isTrustedRenderer(event, sender, 'http://localhost:5174/'), false)
  assert.equal(isTrustedRenderer(rendererEvent('file:///tmp/index.html', { sender }), sender, 'http://localhost:5173/'), false)
  assert.equal(isTrustedRenderer(rendererEvent('app://user@anceryx/index.html', { sender }), sender), false)
  assert.equal(isTrustedRenderer(rendererEvent('not a URL', { sender }), sender), false)
})

test('registers window IPC once outside createWindow and starts updater once after readiness', () => {
  const createWindow = mainSource.indexOf('function createWindow()')
  const readyHandler = mainSource.indexOf('app.whenReady().then(')
  assert.ok(createWindow > 0 && readyHandler > createWindow)
  assert.equal((mainSource.match(/registerMainWindowIpc\(\)/g) ?? []).length, 2)
  assert.ok(mainSource.indexOf('registerMainWindowIpc()') < createWindow)
  assert.equal((mainSource.match(/updateManager\.start\(\)/g) ?? []).length, 1)
  assert.ok(mainSource.indexOf('updateManager.start()') > readyHandler)
  assert.match(mainSource, /const developmentRendererUrl = !app\.isPackaged \? process\.env\['ELECTRON_RENDERER_URL'\] : undefined/)
  assert.doesNotMatch(mainSource.slice(createWindow, readyHandler), /ipcMain\.(?:handle|on)\(/)
})

test('guards every renderer IPC channel, including refresh tokens and updater commands', () => {
  const mainChannels = [
    'drafts:get', 'drafts:save', 'drafts:delete',
    'auth:refresh-token:get', 'auth:refresh-token:set', 'auth:refresh-token:clear',
    'win:minimize', 'win:maximize', 'win:close', 'win:isMaximized',
    'app:getVersion', 'licenses:get-manifest', 'shell:openExternal',
    'screen-capture:list-sources', 'screen-capture:select-source',
  ]
  for (const channel of mainChannels) {
    const start = mainSource.indexOf(`'${channel}'`)
    assert.notEqual(start, -1, `Missing IPC channel ${channel}`)
    const registration = mainSource.slice(start, start + 240)
    assert.match(registration, /isTrustedRendererEvent\(event\)|getTrustedMainWindow\(event\)/, `IPC channel ${channel} lacks a renderer guard`)
  }

  for (const channel of ['updater:get-state', 'updater:check', 'updater:download', 'updater:restart']) {
    const start = updateIpcSource.indexOf(`'${channel}'`)
    assert.notEqual(start, -1, `Missing IPC channel ${channel}`)
    assert.match(updateIpcSource.slice(start, start + 220), /isTrustedRenderer\(event\)/, `IPC channel ${channel} lacks a renderer guard`)
  }
})
