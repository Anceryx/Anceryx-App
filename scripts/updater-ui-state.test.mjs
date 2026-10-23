import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const updater = await readFile(new URL('../src/main/updater/updateManager.ts', import.meta.url), 'utf8')
const policy = await readFile(new URL('../src/main/updater/updateUtils.ts', import.meta.url), 'utf8')
const about = await readFile(new URL('../src/renderer/components/settings/sections/SobreSection.tsx', import.meta.url), 'utf8')
const modal = await readFile(new URL('../src/renderer/components/layout/UpdateModal.tsx', import.meta.url), 'utf8')

assert.match(policy, /UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED = false/)
assert.match(updater, /if \(!this\.snapshot\.configured\) return this\.getSnapshot\(\)/)
assert.match(updater, /if \(!this\.snapshot\.configured \|\| this\.snapshot\.state !== 'available'\)/)
assert.match(about, /t\('settings\.about\.securePaused'\)/)
assert.match(modal, /t\('updates\.securityPaused'\)/)
for (const key of ['updates.upToDate', 'updates.installing', 'updates.failed']) assert.match(modal, new RegExp(`'${key}'`))
console.log('updater UI state smoke: PASS (manifest verification remains disabled; paused state is explicit)')
