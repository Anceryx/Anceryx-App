export type ForumListPage<T> = { forums: T[]; nextOffset?: number | null }

export function normalizeForumListResponse<T>(response: ForumListPage<T> | T[]): ForumListPage<T> {
  if (Array.isArray(response)) return { forums: response, nextOffset: null }
  return { forums: response.forums, nextOffset: response.nextOffset ?? null }
}
