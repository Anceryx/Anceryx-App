import type { Comment } from '@/types/social'

export function upsertComment(comments: Comment[], incoming: Comment): { comments: Comment[]; inserted: boolean } {
  const index = comments.findIndex((comment) => comment.id === incoming.id)
  if (index < 0) return { comments: [...comments, incoming], inserted: true }
  const next = [...comments]
  next[index] = incoming
  return { comments: next, inserted: false }
}

export function mergeComments(existing: Comment[], incoming: Comment[]): Comment[] {
  return incoming.reduce((comments, comment) => upsertComment(comments, comment).comments, existing)
}
