const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi
const POST_PATH = /^\/posts\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

export function extractSharedPostId(text: string): string | null {
  for (const [candidate] of text.matchAll(URL_PATTERN)) {
    try {
      const url = new URL(candidate.replace(/[),.!?;:]+$/, ''))
      if (url.origin !== 'https://www.anceryx.site' || url.search || url.hash) continue
      const match = POST_PATH.exec(url.pathname)
      if (match) return match[1]
    } catch { /* Ignore malformed or external links. */ }
  }
  return null
}
