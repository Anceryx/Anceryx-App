import { createPrivateKey, sign } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { canonicalUpdateManifestPayload } from '../src/main/updater/manifestVerifier.ts'
import { assertUpdateSigningKeyMatches } from './update-signing-key.mjs'

const [installerPath, outputPath = 'dist/update-manifest.json'] = process.argv.slice(2)
if (!installerPath) throw new Error('Pass the built NSIS installer path.')
const privatePem = process.env.ANCERYX_UPDATE_MANIFEST_PRIVATE_KEY
if (!privatePem) throw new Error('The protected update-manifest signing key is missing.')
const trustSource = await readFile(new URL('../src/main/updater/updateTrust.ts', import.meta.url), 'utf8')
assertUpdateSigningKeyMatches(trustSource, privatePem)
const privateKey = createPrivateKey(privatePem)

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const version = pkg.version
if (!/^0\.17\.1(?:-beta\.\d+)?$/.test(version)) throw new Error(`Only the prepared 0.17.1 line can create an update manifest; found ${version}.`)
const channel = version.includes('-beta.') ? 'beta' : 'stable'
const installer = await readFile(installerPath)
const name = basename(installerPath)
if (name !== `Anceryx-Setup-${version}.exe` || installer.length < 1024 || installer.length > 500 * 1024 * 1024) throw new Error('The NSIS installer name or size does not match the version policy.')
const changelog = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8')
const section = changelog.split(/^## /m).find((part) => part.startsWith(version) || part.startsWith(`[${version}]`)) ?? ''
const notes = section.split(/\r?\n/).slice(1).map((line) => line.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean).slice(0, 20)
const payload = {
  formatVersion: 1,
  version,
  channel,
  publishedAt: new Date().toISOString(),
  notes,
  installer: {
    name,
    url: `https://github.com/Anceryx/Anceryx-App/releases/download/v${version}/${name}`,
    size: installer.length,
    sha512: (await import('node:crypto')).createHash('sha512').update(installer).digest('base64'),
  },
}
const manifest = { ...payload, signature: sign(null, canonicalUpdateManifestPayload(payload), privateKey).toString('base64') }
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
