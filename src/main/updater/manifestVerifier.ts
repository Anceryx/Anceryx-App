import { createPublicKey, verify } from 'node:crypto'
import type { UpdateChannel } from '../../shared/updateTypes'

export interface SignedUpdateManifest {
  formatVersion: 1
  version: string
  channel: UpdateChannel
  publishedAt: string
  notes: string[]
  installer: { name: string; url: string; size: number; sha512: string }
  signature: string
}

export type VerifiedUpdateManifest = Omit<SignedUpdateManifest, 'signature'>

const TRUSTED_DOWNLOAD_HOSTS = new Set(['github.com', 'release-assets.githubusercontent.com'])

export function isTrustedDownloadUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && TRUSTED_DOWNLOAD_HOSTS.has(url.hostname) && !url.username && !url.password && !url.port
  } catch { return false }
}

export function assertInstallerIntegrity(size: number, sha512: string, expectedSize: number, expectedSha512: string): void {
  if (size !== expectedSize) throw new Error('UPDATE_SIZE_MISMATCH')
  if (sha512 !== expectedSha512) throw new Error('UPDATE_HASH_MISMATCH')
}

export function selectLatestBetaVersion(releases: unknown, currentVersion: string): string | null {
  if (!Array.isArray(releases)) return null
  const versions = releases.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const release = entry as { draft?: unknown; prerelease?: unknown; tag_name?: unknown }
    if (release.draft !== false || release.prerelease !== true || typeof release.tag_name !== 'string' || !/^v\d+\.\d+\.\d+-beta\.\d+$/.test(release.tag_name)) return []
    const version = release.tag_name.slice(1)
    return validVersion(version) ? [version] : []
  }).filter((version) => compareUpdateVersions(version, currentVersion) > 0)
  versions.sort((a, b) => compareUpdateVersions(b, a))
  return versions[0] ?? null
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`
}

function validVersion(value: string): boolean {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-beta\.(0|[1-9]\d*))?$/.test(value)
}

export function compareUpdateVersions(a: string, b: string): number {
  const parts = (value: string) => {
    const [core, pre] = value.split('-')
    return { core: core.split('.').map(Number), pre: pre ? Number(pre.split('.')[1]) : null }
  }
  const left = parts(a); const right = parts(b)
  for (let i = 0; i < 3; i += 1) if (left.core[i] !== right.core[i]) return left.core[i] < right.core[i] ? -1 : 1
  if (left.pre === right.pre) return 0
  if (left.pre === null) return 1
  if (right.pre === null) return -1
  return left.pre < right.pre ? -1 : 1
}

export function canonicalUpdateManifestPayload(manifest: Omit<SignedUpdateManifest, 'signature'>): Buffer {
  return Buffer.from(canonicalJson(manifest), 'utf8')
}

export function verifySignedUpdateManifest(
  input: unknown,
  currentVersion: string,
  channel: UpdateChannel,
  trustedPublicKeyPem: string,
): VerifiedUpdateManifest {
  if (!trustedPublicKeyPem.trim()) throw new Error('UPDATE_TRUST_KEY_MISSING')
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('UPDATE_MANIFEST_INVALID')
  const value = input as Record<string, unknown>
  const allowed = ['formatVersion', 'version', 'channel', 'publishedAt', 'notes', 'installer', 'signature']
  if (Object.keys(value).some((key) => !allowed.includes(key)) || allowed.some((key) => !(key in value))) throw new Error('UPDATE_MANIFEST_INVALID')
  if (value.formatVersion !== 1 || typeof value.version !== 'string' || !validVersion(value.version) || !validVersion(currentVersion)) throw new Error('UPDATE_MANIFEST_INVALID')
  if (value.channel !== channel || (value.version.includes('-beta.') !== (channel === 'beta'))) throw new Error('UPDATE_CHANNEL_MISMATCH')
  if (compareUpdateVersions(value.version, currentVersion) < 0) throw new Error('UPDATE_DOWNGRADE_BLOCKED')
  if (typeof value.publishedAt !== 'string' || !Number.isFinite(Date.parse(value.publishedAt))) throw new Error('UPDATE_MANIFEST_INVALID')
  if (!Array.isArray(value.notes) || value.notes.length > 20 || value.notes.some((note) => typeof note !== 'string' || note.length > 500)) throw new Error('UPDATE_MANIFEST_INVALID')
  if (!value.installer || typeof value.installer !== 'object' || Array.isArray(value.installer)) throw new Error('UPDATE_MANIFEST_INVALID')
  const installer = value.installer as Record<string, unknown>
  if (Object.keys(installer).sort().join(',') !== 'name,sha512,size,url') throw new Error('UPDATE_MANIFEST_INVALID')
  const expectedName = `Anceryx-Setup-${value.version}.exe`
  if (installer.name !== expectedName || !Number.isSafeInteger(installer.size) || Number(installer.size) < 1024 || Number(installer.size) > 500 * 1024 * 1024) throw new Error('UPDATE_INSTALLER_INVALID')
  if (typeof installer.sha512 !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(installer.sha512) || Buffer.from(installer.sha512, 'base64').length !== 64 || Buffer.from(installer.sha512, 'base64').toString('base64') !== installer.sha512) throw new Error('UPDATE_INSTALLER_INVALID')
  let parsedUrl: URL
  try { parsedUrl = new URL(String(installer.url)) } catch { throw new Error('UPDATE_INSTALLER_INVALID') }
  const expectedPath = `/Anceryx/Anceryx-App/releases/download/v${value.version}/${expectedName}`
  if (!isTrustedDownloadUrl(parsedUrl.toString()) || parsedUrl.hostname !== 'github.com' || parsedUrl.search || parsedUrl.hash || parsedUrl.pathname !== expectedPath) throw new Error('UPDATE_INSTALLER_INVALID')
  if (typeof value.signature !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(value.signature) || Buffer.from(value.signature, 'base64').length !== 64 || Buffer.from(value.signature, 'base64').toString('base64') !== value.signature) throw new Error('UPDATE_SIGNATURE_INVALID')

  const payload: VerifiedUpdateManifest = {
    formatVersion: 1,
    version: value.version,
    channel,
    publishedAt: value.publishedAt,
    notes: [...value.notes] as string[],
    installer: { name: expectedName, url: parsedUrl.toString(), size: Number(installer.size), sha512: installer.sha512 },
  }
  let valid = false
  try { valid = verify(null, canonicalUpdateManifestPayload(payload), createPublicKey(trustedPublicKeyPem), Buffer.from(value.signature, 'base64')) } catch { valid = false }
  if (!valid) throw new Error('UPDATE_SIGNATURE_INVALID')
  return payload
}
