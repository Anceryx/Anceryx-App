import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const csp = readFileSync(new URL('../src/renderer/index.html', import.meta.url), 'utf8')
const apiConfig = readFileSync(new URL('../src/renderer/services/apiConfig.ts', import.meta.url), 'utf8')
const authApi = readFileSync(new URL('../src/renderer/services/authApi.ts', import.meta.url), 'utf8')
const main = readFileSync(new URL('../src/main/main.ts', import.meta.url), 'utf8')
const builder = readFileSync(new URL('../electron-builder.yml', import.meta.url), 'utf8')
const electronViteConfig = readFileSync(new URL('../electron.vite.config.ts', import.meta.url), 'utf8')

assert.match(csp, /connect-src 'self' https: wss:/)
assert.match(apiConfig, /PRODUCTION_API_URL = 'https:\/\/admin-anceryx\.site'/)
assert.match(apiConfig, /PRODUCTION_WEB_API_URL = 'https:\/\/api\.anceryx\.site'/)
assert.doesNotMatch(apiConfig, /const importMeta = import\.meta/)
assert.match(authApi, /request failed before receiving a response/)
assert.match(authApi, /apiOrigin: redactConnectionOrigin\(API_BASE_URL\)/)
assert.match(main, /protocol\.registerSchemesAsPrivileged/)
assert.match(main, /loadURL\('app:\/\/anceryx\/index\.html'\)/)
assert.match(main, /app\.setName\('Anceryx'\)/)
assert.match(main, /const OAUTH_SCHEME = 'anceryx'/)
assert.match(builder, /copyright: "Copyright © 2026 Anceryx/)
assert.match(builder, /provider: github[\s\S]*owner: Anceryx[\s\S]*repo: Anceryx-App/)
assert.doesNotMatch(apiConfig, /127\.0\.0\.1|resolveQaApiBaseUrl/)
assert.doesNotMatch(main, /Anceryx QA|anceryx-qa/)
assert.doesNotMatch(electronViteConfig, /VITE_ANCERYX_QA|ANCERYX_QA_ENV_DIR|127\.0\.0\.1/)

console.log('connection and release configuration regression checks passed')
