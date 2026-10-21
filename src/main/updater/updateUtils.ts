import type { UpdateChannel } from '../../shared/updateTypes'

export const UPDATE_GITHUB_OWNER = 'Anceryx'
export const UPDATE_GITHUB_REPOSITORY = 'Anceryx-App'

// electron-builder 26.17.0 / electron-updater 6.8.9 verify the downloaded
// file's SHA-512, but do not authenticate the update manifest with Ed25519.
// Keep automatic updates fail-closed until a stable signed-manifest verifier
// and its trusted public key are shipped in the client.
export const UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED = false
export const UPDATE_MANUAL_INSTALL_MESSAGE = 'Atualizações automáticas estão pausadas até que a assinatura criptográfica dos manifests seja verificada. Instale manualmente apenas versões publicadas nas Releases oficiais da Anceryx.'

interface ParsedVersion {
  core: [number, number, number]
  prerelease: string[]
}

function parseVersion(value: unknown): ParsedVersion | null {
  if (typeof value !== 'string') return null
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value)
  if (!match) return null
  if (match.slice(1, 4).some((part) => !Number.isSafeInteger(Number(part)))) return null
  const prerelease = match[4]?.split('.') ?? []
  if (prerelease.some((part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) return null
  return { core: [Number(match[1]), Number(match[2]), Number(match[3])], prerelease }
}

function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  for (let i = 0; i < 3; i += 1) if (left.core[i] !== right.core[i]) return left.core[i] < right.core[i] ? -1 : 1
  if (!left.prerelease.length || !right.prerelease.length) return left.prerelease.length === right.prerelease.length ? 0 : left.prerelease.length ? -1 : 1
  for (let i = 0; i < Math.min(left.prerelease.length, right.prerelease.length); i += 1) {
    const a = left.prerelease[i]
    const b = right.prerelease[i]
    if (a === b) continue
    const an = /^\d+$/.test(a)
    const bn = /^\d+$/.test(b)
    if (an && bn) return Number(a) < Number(b) ? -1 : 1
    if (an !== bn) return an ? -1 : 1
    return a < b ? -1 : 1
  }
  return left.prerelease.length === right.prerelease.length ? 0 : left.prerelease.length < right.prerelease.length ? -1 : 1
}

export function resolveUpdateChannel(_value: string | undefined, _betaEnabled: boolean, currentVersion = ''): UpdateChannel {
  const version = parseVersion(currentVersion)
  return version?.prerelease.length && version.prerelease[0] === 'beta' ? 'beta' : 'stable'
}

export function isSafeUpdateInfo(value: unknown, currentVersion: string, channel: UpdateChannel): value is { version: string; releaseNotes?: unknown } {
  if (!value || typeof value !== 'object') return false
  const info = value as { version?: unknown; files?: unknown; path?: unknown; sha512?: unknown; size?: unknown }
  const current = parseVersion(currentVersion)
  const next = parseVersion(info.version)
  if (!current || !next || compareVersions(next, current) <= 0) return false
  if (next.prerelease.length && (channel !== 'beta' || next.prerelease.length !== 2 || next.prerelease[0] !== 'beta' || !/^\d+$/.test(next.prerelease[1]))) return false
  const expectedName = `Anceryx-Setup-${info.version}.exe`
  const files = Array.isArray(info.files) ? info.files as Array<{ url?: unknown; size?: unknown; sha512?: unknown }> : []
  const installer = files.find((file) => typeof file.url === 'string' && file.url === expectedName)
  const size = installer?.size ?? info.size
  const digest = installer?.sha512 ?? info.sha512
  const hasInstaller = Boolean(installer) || info.path === expectedName
  if (!hasInstaller || typeof size !== 'number' || !Number.isSafeInteger(size) || size <= 0 || typeof digest !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(digest)) return false
  try {
    const decoded = Buffer.from(digest, 'base64')
    return decoded.length === 64 && decoded.toString('base64') === digest
  } catch { return false }
}

export function releaseNotesToLines(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value.flatMap((entry) => (entry && typeof entry === 'object' && 'note' in entry ? String(entry.note ?? '') : []))
    : typeof value === 'string' ? [value] : []

  return raw
    .flatMap((entry) => entry.replace(/<[^>]*>/g, '').split(/\r?\n/))
    .map((entry) => entry.replace(/[\u0000-\u001f\u007f]/g, '').trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((entry) => entry.length > 240 ? `${entry.slice(0, 237)}...` : entry)
}

export function safeUpdaterError(error?: unknown): string {
  const details = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : null
  const code = typeof details?.code === 'string' ? details.code : ''
  const message = typeof details?.message === 'string' ? details.message : ''
  const failure = `${code} ${message}`.toUpperCase()

  if (failure.includes('MANIFEST_NOT_SIGNED') || failure.includes('MANIFEST_SIGNATURE_INVALID') || failure.includes('SIGNATURE_INVALID')) {
    return 'A assinatura de segurança da atualização não foi confirmada. O download foi bloqueado.'
  }
  if (failure.includes('SHA512') || failure.includes('CHECKSUM') || failure.includes('HASH_MISMATCH')) {
    return 'A integridade do arquivo de atualização não foi confirmada. O download foi bloqueado.'
  }
  return 'Não foi possível verificar atualizações agora. O aplicativo continuará funcionando normalmente.'
}
