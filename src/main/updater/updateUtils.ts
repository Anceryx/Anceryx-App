import type { UpdateChannel } from '../../shared/updateTypes'

export const UPDATE_GITHUB_OWNER = 'Anceryx'
export const UPDATE_GITHUB_REPOSITORY = 'Anceryx-App'
// Set true only after a production key is pinned and the Windows QA gate passes.
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

export function resolveUpdateChannel(_value: string | undefined, _betaEnabled: boolean, currentVersion = ''): UpdateChannel {
  const version = parseVersion(currentVersion)
  return version?.prerelease.length && version.prerelease[0] === 'beta' ? 'beta' : 'stable'
}

export function releaseNotesToLines(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value.flatMap((entry) => (typeof entry === 'string' ? [entry] : entry && typeof entry === 'object' && 'note' in entry ? [String(entry.note ?? '')] : []))
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
