import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const main = await readFile(new URL('../src/main/main.ts', import.meta.url), 'utf8')
const preload = await readFile(new URL('../src/preload/preload.ts', import.meta.url), 'utf8')
const client = await readFile(new URL('../src/renderer/services/webrtc/communityVoiceClient.ts', import.meta.url), 'utf8')
const workspace = await readFile(new URL('../src/renderer/components/social/CommunityWorkspaceModal.tsx', import.meta.url), 'utf8')

assert.match(main, /setDisplayMediaRequestHandler/)
assert.match(main, /request\.frame !== mainWindow\?\.webContents\.mainFrame/)
assert.match(main, /selectedScreenSourceExpiresAt = Date\.now\(\) \+ 30_000/)
assert.match(main, /event\.senderFrame !== event\.sender\.mainFrame/)
assert.match(main, /desktopCapturer\.getSources/)
assert.match(main, /sources\.find\(\(item\) => item\.id === requestedSourceId\)/)
assert.match(preload, /screen-capture:list-sources/)
assert.match(preload, /screen-capture:select-source/)
assert.match(workspace, /Escolha uma tela ou janela/)
assert.match(workspace, /áudio do sistema não está habilitado/)
assert.match(workspace, /Controles persistentes de voz/)
assert.match(client, /Compartilhamento de tela não é compatível com este dispositivo/)
assert.match(client, /getDisplayMedia/)
assert.match(client, /peer\.ontrack/)
console.log('community screen share smoke: PASS (Electron source selection, WebRTC transport and fallback copy)')
