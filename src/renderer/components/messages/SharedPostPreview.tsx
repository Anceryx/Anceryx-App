import React, { useEffect, useState } from 'react'
import { postsApi } from '@/services/postsApi'
import type { RealtimePostDto } from '@/services/realtimeClient'
import { extractSharedPostId } from '@/utils/sharedPost'
import { useTranslation } from '@/i18n'

export const SharedPostPreview: React.FC<{ text: string; onOpen: (postId: string) => void }> = ({ text, onOpen }) => {
  const t = useTranslation()
  const postId = extractSharedPostId(text)
  const [post, setPost] = useState<RealtimePostDto | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let active = true
    setPost(null)
    setUnavailable(false)
    if (!postId) return () => { active = false }
    void postsApi.get(postId).then(({ post: value }) => {
      if (active) setPost(value)
    }).catch(() => {
      if (active) setUnavailable(true)
    })
    return () => { active = false }
  }, [postId])

  if (!postId) return null
  return <button type="button" onClick={() => onOpen(postId)} className="mt-2 block w-full rounded-lg border border-white/15 bg-black/10 p-3 text-left hover:bg-black/20">
    {post ? <>
      <span className="block text-xs font-semibold">{t('messages.sharedPostBy', { name: post.author.displayName })}</span>
      <span className="mt-1 block line-clamp-3 whitespace-pre-wrap text-xs opacity-80">{post.content.slice(0, 240)}</span>
    </> : <span className="block text-xs opacity-75">{unavailable ? t('messages.sharedPostUnavailable') : t('messages.sharedPostLoading')}</span>}
  </button>
}
