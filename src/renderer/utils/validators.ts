import type { UserProfile } from '@/types/social'
import { FREE_TEXT_LIMIT } from '@/lib/premium'

// ─── Handle ───────────────────────────────────────────────────────────────────

/**
 * Returns true when handle contains only letters, digits, underscores and dots,
 * and has between 3 and 30 characters.
 */
export function isValidHandle(handle: string): boolean {
  return /^[a-zA-Z0-9_.]{3,30}$/.test(handle)
}

/**
 * Returns true when another profile (id !== currentUserId) already owns the
 * given handle (case-insensitive comparison).
 */
export function isHandleTaken(
  handle: string,
  currentUserId: string,
  profiles: Record<string, UserProfile>
): boolean {
  const lower = handle.toLowerCase()
  return Object.entries(profiles).some(
    ([id, profile]) => id !== currentUserId && profile.handle.toLowerCase() === lower
  )
}

// ─── Email / Password ─────────────────────────────────────────────────────────

/** Returns true when the string looks like a valid e-mail address. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Returns true when the password has at least 8 characters.
 * NOTE: real strength enforcement (uppercase, symbols, etc.) happens server-side.
 */
export function isStrongPassword(password: string): boolean {
  return password.length >= 8
}

/** Returns true when both password strings are identical. */
export function doPasswordsMatch(password: string, confirm: string): boolean {
  return password === confirm
}

// ─── Display name ─────────────────────────────────────────────────────────────

const NAME_MIN = 1
const NAME_MAX = 50

/**
 * Validates a display name.
 * Returns an error message or null if valid.
 */
export function validateDisplayName(name: string): string | null {
  const t = name.trim()
  if (t.length < NAME_MIN) return 'Nome não pode ser vazio.'
  if (t.length > NAME_MAX) return `Nome deve ter no máximo ${NAME_MAX} caracteres.`
  return null
}

// ─── Bio ──────────────────────────────────────────────────────────────────────

const BIO_MAX = 300

/**
 * Validates a profile bio.
 * Returns an error message or null if valid.
 */
export function validateBio(bio: string): string | null {
  if (bio.length > BIO_MAX) return `Bio deve ter no máximo ${BIO_MAX} caracteres.`
  return null
}

// ─── Post content ─────────────────────────────────────────────────────────────

const POST_MIN = 1
/** Free-tier character limit — matches FREE_TEXT_LIMIT from lib/premium. */
const POST_MAX = FREE_TEXT_LIMIT

/**
 * Validates post text content.
 * Returns an error message or null if valid.
 */
export function validatePostContent(content: string): string | null {
  const t = content.trim()
  if (t.length < POST_MIN) return 'O post não pode ser vazio.'
  if (t.length > POST_MAX) return `Post deve ter no máximo ${POST_MAX} caracteres.`
  return null
}

// ─── Hashtag ──────────────────────────────────────────────────────────────────

/**
 * Returns true when the string is a valid hashtag (letters, digits, underscores,
 * 1-50 chars after the leading #).
 */
export function isValidHashtag(tag: string): boolean {
  return /^#[a-zA-Z0-9_\u00C0-\u024F]{1,50}$/.test(tag)
}

// ─── Search query ─────────────────────────────────────────────────────────────

const SEARCH_MAX = 100

/**
 * Sanitises and validates a search query.
 * Returns the trimmed query or null if invalid/empty.
 */
export function sanitiseSearchQuery(query: string): string | null {
  const t = query.trim()
  if (t.length === 0) return null
  if (t.length > SEARCH_MAX) return t.slice(0, SEARCH_MAX)
  return t
}

// ─── Forum ────────────────────────────────────────────────────────────────────

const FORUM_NAME_MIN = 2
const FORUM_NAME_MAX = 60
const FORUM_DESC_MAX = 500
const FORUM_TAG_MAX_COUNT = 10
const FORUM_TAG_MAX_LEN = 30
type ValidationTranslator = (key: import('../i18nCatalog').TranslationKey, values?: Record<string, string | number>) => string

/**
 * Validates a forum name.
 * Returns an error message or null if valid.
 */
export function validateForumName(name: string, translate?: ValidationTranslator): string | null {
  const t = name.trim()
  if (t.length < FORUM_NAME_MIN) return translate?.('createForum.validation.nameMin', { count: FORUM_NAME_MIN }) ?? `Nome deve ter pelo menos ${FORUM_NAME_MIN} caracteres.`
  if (t.length > FORUM_NAME_MAX) return translate?.('createForum.validation.nameMax', { count: FORUM_NAME_MAX }) ?? `Nome deve ter no máximo ${FORUM_NAME_MAX} caracteres.`
  return null
}

/**
 * Validates a forum description.
 * Returns an error message or null if valid.
 */
export function validateForumDescription(desc: string, translate?: ValidationTranslator): string | null {
  if (desc.trim().length === 0) return translate?.('createForum.validation.descriptionRequired') ?? 'Descrição não pode ser vazia.'
  if (desc.length > FORUM_DESC_MAX) return translate?.('createForum.validation.descriptionMax', { count: FORUM_DESC_MAX }) ?? `Descrição deve ter no máximo ${FORUM_DESC_MAX} caracteres.`
  return null
}

/**
 * Validates forum tags array.
 * Returns an error message or null if valid.
 */
export function validateForumTags(tags: string[], translate?: ValidationTranslator): string | null {
  if (tags.length > FORUM_TAG_MAX_COUNT) return translate?.('createForum.validation.tagCount', { count: FORUM_TAG_MAX_COUNT }) ?? `Máximo de ${FORUM_TAG_MAX_COUNT} tags.`
  for (const tag of tags) {
    if (tag.trim().length === 0) return translate?.('createForum.validation.tagEmpty') ?? 'Tag não pode ser vazia.'
    if (tag.length > FORUM_TAG_MAX_LEN) return translate?.('createForum.validation.tagMax', { name: tag, count: FORUM_TAG_MAX_LEN }) ?? `Tag "${tag}" é muito longa (máx ${FORUM_TAG_MAX_LEN} caracteres).`
    if (!/^[a-zA-Z0-9_\u00C0-\u024F\s-]+$/.test(tag)) return translate?.('createForum.validation.tagInvalid', { name: tag }) ?? `Tag "${tag}" contém caracteres inválidos.`
  }
  return null
}

// ─── File upload ──────────────────────────────────────────────────────────────

/**
 * Validates a File against an allowlist of MIME types and a maximum byte size.
 * Uses file.type (set by the browser from magic bytes on most platforms) —
 * NOT the file extension — to prevent trivial bypasses.
 *
 * Returns an error message or null if valid.
 */
export function validateUpload(
  file: File,
  allowedMimes: string[],
  maxBytes: number,
  translate?: ValidationTranslator,
): string | null {
  if (!allowedMimes.includes(file.type)) {
    const readable = allowedMimes
      .map((m) => m.split('/')[1].toUpperCase())
      .join(', ')
    return translate?.('createForum.validation.fileType', { types: readable }) ?? `Tipo de arquivo não suportado. Aceitos: ${readable}.`
  }
  if (file.size > maxBytes) {
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(0)
    return translate?.('createForum.validation.fileSize', { size: maxMB }) ?? `Arquivo muito grande. Tamanho máximo: ${maxMB} MB.`
  }
  if (file.size === 0) {
    return translate?.('createForum.validation.fileEmpty') ?? 'O arquivo está vazio.'
  }
  return null
}

// ─── Avatar / Banner ──────────────────────────────────────────────────────────

const AVATAR_MIMES   = ['image/jpeg', 'image/png', 'image/webp']
const AVATAR_MAX     = 5 * 1024 * 1024   // 5 MB
const BANNER_MIMES   = ['image/jpeg', 'image/png', 'image/webp']
const BANNER_MAX     = 10 * 1024 * 1024  // 10 MB

export function validateAvatarUpload(file: File): string | null {
  return validateUpload(file, AVATAR_MIMES, AVATAR_MAX)
}

export function validateBannerUpload(file: File): string | null {
  return validateUpload(file, BANNER_MIMES, BANNER_MAX)
}

// ─── URL protocol ─────────────────────────────────────────────────────────────

const SAFE_PROTOCOLS = ['https:', 'http:']

/**
 * Returns true when the URL uses only an allowed protocol.
 * Use this before rendering any href derived from user content.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return SAFE_PROTOCOLS.includes(parsed.protocol)
  } catch {
    return false
  }
}
