import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { verifySignedUpdateManifest } from '../src/main/updater/manifestVerifier.ts'

const [manifestPath, installerPath] = process.argv.slice(2)
if (!manifestPath || !installerPath) throw new Error('Pass the manifest and NSIS installer paths.')
const [raw, bytes, trust] = await Promise.all([
  readFile(manifestPath, 'utf8'), readFile(installerPath), readFile(new URL('../src/main/updater/updateTrust.ts', import.meta.url), 'utf8'),
])
const match = /UPDATE_MANIFEST_PUBLIC_KEY_PEM\s*=\s*`([\s\S]*?)`/.exec(trust)
if (!match?.[1]?.trim()) throw new Error('The app public key is not configured.')
const version = JSON.parse(raw).version
const channel = version.includes('-beta.') ? 'beta' : 'stable'
const verified = verifySignedUpdateManifest(JSON.parse(raw), '0.17.0', channel, match[1].replace(/\\n/g, '\n'))
assert.equal(verified.installer.name, `Anceryx-Setup-${version}.exe`)
assert.equal(bytes.length, verified.installer.size)
assert.equal(createHash('sha512').update(bytes).digest('base64'), verified.installer.sha512)
