export type DraftScope = 'dm' | 'forum-channel' | 'forum-topic' | 'forum-reply' | 'post'
export interface DraftKey { userId: string; scope: DraftScope; resourceId: string }
interface DraftEntry extends DraftKey { content: string; updatedAt: number }
interface DraftPayload { version: 1; entries: DraftEntry[] }
export interface DraftStorageAdapter { read(): Uint8Array | null; write(encrypted: Uint8Array): void }

const MAX_ENTRIES = 500
const MAX_CONTENT_LENGTH = 22_000
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SCOPES = new Set<DraftScope>(['dm', 'forum-channel', 'forum-topic', 'forum-reply', 'post'])

function validKey(key: DraftKey): boolean {
  return UUID.test(key.userId) && UUID.test(key.resourceId) && SCOPES.has(key.scope)
}

function keyOf(key: DraftKey): string { return `${key.userId}:${key.scope}:${key.resourceId}` }
function isDraftEntry(value: unknown): value is DraftEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<DraftEntry>
  return typeof entry.userId === 'string' && typeof entry.scope === 'string' && typeof entry.resourceId === 'string'
    && validKey(entry as DraftKey) && typeof entry.content === 'string' && entry.content.length <= MAX_CONTENT_LENGTH
    && typeof entry.updatedAt === 'number' && Number.isFinite(entry.updatedAt)
}

export function createDraftStore(adapter: DraftStorageAdapter, encrypt: (data: Uint8Array) => Uint8Array, decrypt: (data: Uint8Array) => Uint8Array, now = () => Date.now()) {
  function read(): Map<string, DraftEntry> {
    const encrypted = adapter.read()
    if (!encrypted) return new Map()
    const parsed = JSON.parse(new TextDecoder().decode(decrypt(encrypted))) as Partial<DraftPayload>
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) throw new Error('Armazenamento de rascunhos inválido.')
    const cutoff = now() - RETENTION_MS
    const entries = parsed.entries.filter(isDraftEntry).filter((entry) => entry.updatedAt >= cutoff)
      .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_ENTRIES)
    return new Map(entries.map((entry) => [keyOf(entry), entry]))
  }

  function write(entries: Map<string, DraftEntry>): void {
    const payload: DraftPayload = { version: 1, entries: [...entries.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_ENTRIES) }
    adapter.write(encrypt(new TextEncoder().encode(JSON.stringify(payload))))
  }

  return {
    get(key: DraftKey): string | null {
      if (!validKey(key)) throw new Error('Identificador de rascunho inválido.')
      return read().get(keyOf(key))?.content ?? null
    },
    save(key: DraftKey, content: unknown): void {
      if (!validKey(key) || typeof content !== 'string' || content.length > MAX_CONTENT_LENGTH || /\bblob:/i.test(content)) throw new Error('Rascunho inválido.')
      const entries = read()
      const id = keyOf(key)
      if (!content.trim()) entries.delete(id)
      else entries.set(id, { ...key, content, updatedAt: now() })
      write(entries)
    },
    delete(key: DraftKey): void {
      if (!validKey(key)) throw new Error('Identificador de rascunho inválido.')
      const entries = read()
      entries.delete(keyOf(key))
      write(entries)
    },
  }
}
