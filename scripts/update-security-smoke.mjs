import assert from 'node:assert/strict'
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateUpdateKeyPair, verifyUpdateKeyPair } from './manage-update-keypair.mjs'
import { UPDATE_GITHUB_OWNER, UPDATE_GITHUB_REPOSITORY, UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED, UPDATE_MANUAL_INSTALL_MESSAGE, releaseNotesToLines, resolveUpdateChannel, safeUpdaterError } from '../src/main/updater/updateUtils.ts'
import { assertInstallerIntegrity, canonicalUpdateManifestPayload, isTrustedDownloadUrl, selectLatestBetaVersion, verifySignedUpdateManifest } from '../src/main/updater/manifestVerifier.ts'
import { isAllowedUpdateRedirect, resolveAllowedUpdateRedirect, verifyDownloadedInstallerFile } from '../src/main/updater/updateTransport.ts'

assert.equal(UPDATE_GITHUB_OWNER, 'Anceryx')
assert.equal(UPDATE_GITHUB_REPOSITORY, 'Anceryx-App')
assert.equal(UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED, false)
assert.match(UPDATE_MANUAL_INSTALL_MESSAGE, /assinatura criptográfica/i)
assert.match(safeUpdaterError({ code: 'ERR_UPDATER_MANIFEST_SIGNATURE_INVALID' }), /assinatura de segurança.*download foi bloqueado/i)
assert.equal(safeUpdaterError({ code: 'ERR_UPDATER_MANIFEST_NOT_SIGNED', message: 'private-token-value' }).includes('private-token-value'), false)
assert.match(safeUpdaterError(new Error('network unavailable')), /Não foi possível verificar atualizações/i)
assert.equal(resolveUpdateChannel(undefined, false, '0.17.1'), 'stable')
assert.equal(resolveUpdateChannel(undefined, false, '0.17.2-beta.1'), 'beta')
assert.equal(selectLatestBetaVersion([
  { draft: false, prerelease: true, tag_name: 'v0.17.2-beta.1' },
  { draft: false, prerelease: true, tag_name: 'v0.17.3-beta.1' },
  { draft: true, prerelease: true, tag_name: 'v9.0.0-beta.9' },
  { draft: false, prerelease: false, tag_name: 'v9.0.0' },
], '0.17.1-beta.2'), '0.17.3-beta.1')
assert.equal(selectLatestBetaVersion([{ draft: false, prerelease: true, tag_name: 'v0.17.0-beta.1' }], '0.17.1-beta.1'), null)
assert.deepEqual(releaseNotesToLines('<b>Fixed</b>\n<script>bad()</script>'), ['Fixed', 'bad()'])
assert.deepEqual(releaseNotesToLines(['Security fixes', '<b>Updates</b>']), ['Security fixes', 'Updates'])
assert.equal(releaseNotesToLines('x'.repeat(500))[0].length, 240)

const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
const installerBytes = Buffer.alloc(2048, 42)
const installerHash = createHash('sha512').update(installerBytes).digest('base64')
const base = {
  formatVersion: 1,
  version: '0.17.1',
  channel: 'stable',
  publishedAt: '2026-10-23T12:00:00.000Z',
  notes: ['Security fixes'],
  installer: {
    name: 'Anceryx-Setup-0.17.1.exe',
    url: 'https://github.com/Anceryx/Anceryx-App/releases/download/v0.17.1/Anceryx-Setup-0.17.1.exe',
    size: installerBytes.length,
    sha512: installerHash,
  },
}
const signed = { ...base, signature: sign(null, canonicalUpdateManifestPayload(base), privateKey).toString('base64') }
assert.deepEqual(verifySignedUpdateManifest(signed, '0.17.0', 'stable', publicPem), base)
assert.throws(() => verifySignedUpdateManifest(signed, '0.17.0', 'stable', ''), /UPDATE_TRUST_KEY_MISSING/)
assert.throws(() => verifySignedUpdateManifest(signed, '0.17.0', 'stable', generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }).toString()), /UPDATE_SIGNATURE_INVALID/)
assert.throws(() => verifySignedUpdateManifest({ ...signed, notes: ['different notes'] }, '0.17.0', 'stable', publicPem), /UPDATE_SIGNATURE_INVALID/)
assert.throws(() => verifySignedUpdateManifest({ ...signed, signature: 'not-a-signature' }, '0.17.0', 'stable', publicPem), /UPDATE_SIGNATURE_INVALID/)
assert.throws(() => verifySignedUpdateManifest({ ...signed, installer: { ...base.installer, sha512: Buffer.alloc(64, 4).toString('base64') } }, '0.17.0', 'stable', publicPem), /UPDATE_SIGNATURE_INVALID/)
assert.throws(() => verifySignedUpdateManifest({ ...signed, installer: { ...base.installer, url: 'https://evil.example/payload.exe' } }, '0.17.0', 'stable', publicPem), /UPDATE_INSTALLER_INVALID/)
assert.throws(() => verifySignedUpdateManifest({ ...signed, installer: { ...base.installer, url: 'http://github.com/Anceryx/Anceryx-App/releases/download/v0.17.1/Anceryx-Setup-0.17.1.exe' } }, '0.17.0', 'stable', publicPem), /UPDATE_INSTALLER_INVALID/)
assert.throws(() => verifySignedUpdateManifest({ ...signed, installer: { ...base.installer, size: 500 * 1024 * 1024 + 1 } }, '0.17.0', 'stable', publicPem), /UPDATE_INSTALLER_INVALID/)
assert.deepEqual(verifySignedUpdateManifest(signed, '0.17.1', 'stable', publicPem), base, 'equal version is accepted as current, never offered as an update')
assert.throws(() => verifySignedUpdateManifest(signed, '0.17.2', 'stable', publicPem), /UPDATE_DOWNGRADE_BLOCKED/)
assert.throws(() => verifySignedUpdateManifest(signed, '0.17.0-beta.2', 'beta', publicPem), /UPDATE_CHANNEL_MISMATCH/)
assert.throws(() => verifySignedUpdateManifest({ ...signed, channel: 'beta' }, '0.17.0', 'stable', publicPem), /UPDATE_CHANNEL_MISMATCH/)
assert.throws(() => verifySignedUpdateManifest({ ...signed, unexpected: true }, '0.17.0', 'stable', publicPem), /UPDATE_MANIFEST_INVALID/)
assert.throws(() => verifySignedUpdateManifest({ ...signed, version: '999999999999999999999.0.0' }, '0.17.0', 'stable', publicPem), /UPDATE_MANIFEST_INVALID/)
assert.equal(isTrustedDownloadUrl('https://github.com/Anceryx/Anceryx-App/releases/download/v0.17.1/Anceryx-Setup-0.17.1.exe'), true)
assert.equal(isTrustedDownloadUrl('https://evil.example/Anceryx-Setup-0.17.1.exe'), false)
assert.equal(isTrustedDownloadUrl('http://github.com/file.exe'), false)
assert.equal(isTrustedDownloadUrl('https://user:pass@github.com/file.exe'), false)
assert.equal(isTrustedDownloadUrl('https://github.com:444/file.exe'), false)
assert.equal(isAllowedUpdateRedirect('https://release-assets.githubusercontent.com/download/file', 0), true)
assert.equal(isAllowedUpdateRedirect('https://evil.example/file', 0), false)
assert.equal(isAllowedUpdateRedirect('https://github.com/file.exe', 4), false, 'a fifth redirect must be rejected')
assert.equal(resolveAllowedUpdateRedirect('/Anceryx/Anceryx-App/releases/download/file.exe', new URL('https://github.com/Anceryx/Anceryx-App/'), 0).hostname, 'github.com')
assert.throws(() => resolveAllowedUpdateRedirect('https://evil.example/file.exe', new URL('https://github.com/'), 0), /UPDATE_UNTRUSTED_URL/)
assert.throws(() => resolveAllowedUpdateRedirect('/file.exe', new URL('https://github.com/'), 4), /UPDATE_REDIRECT_LIMIT/)
assert.throws(() => resolveAllowedUpdateRedirect('https://[invalid', new URL('https://github.com/'), 0), /UPDATE_REDIRECT_INVALID/)
assert.throws(() => assertInstallerIntegrity(installerBytes.length - 1, installerHash, installerBytes.length, installerHash), /UPDATE_SIZE_MISMATCH/)
assert.throws(() => assertInstallerIntegrity(installerBytes.length, Buffer.alloc(64, 4).toString('base64'), installerBytes.length, installerHash), /UPDATE_HASH_MISMATCH/)
assert.doesNotThrow(() => assertInstallerIntegrity(installerBytes.length, installerHash, installerBytes.length, installerHash))

const tempDirectory = mkdtempSync(join(tmpdir(), 'anceryx-update-security-'))
try {
  const installerPath = join(tempDirectory, base.installer.name)
  writeFileSync(installerPath, installerBytes, { flag: 'wx' })
  await verifyDownloadedInstallerFile(base, installerPath)
  writeFileSync(installerPath, Buffer.alloc(installerBytes.length, 7))
  await assert.rejects(() => verifyDownloadedInstallerFile(base, installerPath), /UPDATE_HASH_MISMATCH/)
  await assert.rejects(() => verifyDownloadedInstallerFile(base, join(tempDirectory, 'renamed.exe')), /UPDATE_INSTALLER_INVALID/)

  const keyDirectory = join(tempDirectory, 'keys')
  const { privatePath, publicPath } = await generateUpdateKeyPair(keyDirectory)
  const privatePem = readFileSync(privatePath, 'utf8')
  const generatedPublicPem = readFileSync(publicPath, 'utf8')
  assert.equal(createPublicKey(createPrivateKey(privatePem)).export({ type: 'spki', format: 'der' }).equals(createPublicKey(generatedPublicPem).export({ type: 'spki', format: 'der' })), true)
  await verifyUpdateKeyPair(privatePath, publicPath)
  const mismatchedPublicPath = join(keyDirectory, 'mismatched-public.pem')
  writeFileSync(mismatchedPublicPath, generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }))
  await assert.rejects(() => verifyUpdateKeyPair(privatePath, mismatchedPublicPath), /does not match/)
  await assert.rejects(() => generateUpdateKeyPair(keyDirectory), /Refusing to overwrite/)
  const keyToolSource = readFileSync(new URL('./manage-update-keypair.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(keyToolSource, /console\.log\([^\n]*(?:privatePem|privateKey)/)
} finally {
  rmSync(tempDirectory, { recursive: true, force: true })
}

const manager = readFileSync(new URL('../src/main/updater/updateManager.ts', import.meta.url), 'utf8')
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const packageLock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
const builderConfig = readFileSync(new URL('../electron-builder.yml', import.meta.url), 'utf8')
assert.match(manager, /UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED/)
assert.match(manager, /if \(!this\.snapshot\.configured\) return this\.getSnapshot\(\)/)
assert.match(manager, /this\.snapshot\.state !== 'available'/)
assert.match(manager, /this\.snapshot\.state !== 'downloaded'/)
const restartMethod = manager.slice(manager.indexOf('async restart()'), manager.indexOf('private setSnapshot', manager.indexOf('async restart()')))
assert.ok(restartMethod.indexOf('verifyDownloadedInstallerFile') >= 0 && restartMethod.indexOf('verifyDownloadedInstallerFile') < restartMethod.indexOf('shell.openPath'), 'installer integrity must be rechecked before NSIS is opened')
assert.doesNotMatch(manager, /electron-updater|autoUpdater/)
assert.equal(packageJson.dependencies['electron-updater'], undefined)
assert.equal(packageLock.packages['node_modules/electron-updater'], undefined)
assert.doesNotMatch(builderConfig, /^publish:/m)
assert.equal(packageJson.scripts['electron:build'].includes('--publish never'), true)
assert.equal(/process\.env\[['"](?:GH_TOKEN|GITHUB_TOKEN|ANCERYX_UPDATE_TOKEN)/.test(manager), false)
console.log('update security smoke: PASS (Ed25519, schema, channel/version, URL, fail-closed client and consent gates)')
