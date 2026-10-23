import React, { useEffect, useState } from 'react'
import { ArrowLeft, FileText, MessageSquare, Pencil, Send } from 'lucide-react'
import { Button, Input } from '@/components/ui/index'
import { forumApi, type ApiForumReply, type ApiForumTopic } from '@/services/forumApi'
import { usePersistentDraft } from '@/hooks/usePersistentDraft'
import { formatDate, formatDateTime } from '@/utils/formatters'
import { useTranslation } from '@/i18n'

interface Props {
  forumId: string
  canCreateTopics: boolean
  currentUserId: string
}

const CommunityForumChannel: React.FC<Props> = ({ forumId, canCreateTopics, currentUserId }) => {
  const t = useTranslation()
  const [topics, setTopics] = useState<ApiForumTopic[]>([])
  const [activeTopic, setActiveTopic] = useState<ApiForumTopic | null>(null)
  const [replies, setReplies] = useState<ApiForumReply[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const topicDraft = usePersistentDraft(currentUserId, 'forum-topic', forumId)
  const replyDraft = usePersistentDraft(currentUserId, 'forum-reply', activeTopic?.id ?? '')
  const reply = replyDraft.value
  const setReply = replyDraft.setValue
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topicHydratedKey, setTopicHydratedKey] = useState('')
  const topicKey = `${currentUserId}:${forumId}`

  useEffect(() => { setActiveTopic(null); setReplies([]); setTitle(''); setContent(''); setTopicHydratedKey('') }, [forumId, currentUserId])

  useEffect(() => {
    if (activeTopic || topicDraft.persistence !== 'ready' || topicHydratedKey === topicKey) return
    setTopicHydratedKey(topicKey)
    try {
      const parsed = JSON.parse(topicDraft.value || '{}') as { title?: unknown; content?: unknown }
      if (typeof parsed.title === 'string' && typeof parsed.content === 'string') { setTitle(parsed.title); setContent(parsed.content) }
    } catch { /* Ignore an invalid old local draft and keep the editor usable. */ }
  }, [activeTopic?.id, topicDraft.persistence, topicDraft.value, topicHydratedKey, topicKey])

  useEffect(() => {
    if (activeTopic || topicDraft.persistence !== 'ready' || topicHydratedKey !== topicKey) return
    topicDraft.setValue(JSON.stringify({ title, content }))
  }, [activeTopic?.id, title, content, topicDraft.persistence, topicHydratedKey, topicKey])

  const refresh = async () => {
    setError(null)
    try {
      const result = await forumApi.listTopics(forumId)
      setTopics(result.topics)
      if (activeTopic) {
        const latest = result.topics.find((topic) => topic.id === activeTopic.id)
        if (latest) setActiveTopic(latest)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('communityForum.loadTopicsFailed'))
    } finally { setLoading(false) }
  }

  useEffect(() => { setLoading(true); void refresh() }, [forumId])

  const openTopic = async (topic: ApiForumTopic) => {
    setBusy(true); setError(null)
    try {
      const [detail, result] = await Promise.all([forumApi.getTopic(forumId, topic.id), forumApi.listReplies(forumId, topic.id)])
      setActiveTopic(detail.topic); setReplies(result.replies)
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('communityForum.openTopicFailed')) }
    finally { setBusy(false) }
  }

  const createTopic = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canCreateTopics || !title.trim() || !content.trim()) return
    setBusy(true); setError(null)
    try {
      const result = await forumApi.createTopic(forumId, { title: title.trim(), content: content.trim() })
      await topicDraft.discard()
      setTitle(''); setContent(''); await refresh(); await openTopic(result.topic)
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('communityForum.createPostFailed')) }
    finally { setBusy(false) }
  }

  const createReply = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!activeTopic || !reply.trim()) return
    setBusy(true); setError(null)
    try {
      await forumApi.createReply(forumId, activeTopic.id, reply.trim())
      await replyDraft.discard()
      const [detail, result] = await Promise.all([forumApi.getTopic(forumId, activeTopic.id), forumApi.listReplies(forumId, activeTopic.id)])
      setActiveTopic(detail.topic); setReplies(result.replies); await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('communityForum.replyFailed')) }
    finally { setBusy(false) }
  }

  const deleteTopic = async () => {
    if (!activeTopic || activeTopic.authorUserId !== currentUserId) return
    setBusy(true); setError(null)
    try { await forumApi.deleteTopic(forumId, activeTopic.id); setActiveTopic(null); setReplies([]); await refresh() }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('communityForum.deleteTopicFailed')) }
    finally { setBusy(false) }
  }

  const updateTopic = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!activeTopic || activeTopic.authorUserId !== currentUserId || !title.trim() || !content.trim()) return
    setBusy(true); setError(null)
    try {
      await forumApi.updateTopic(forumId, activeTopic.id, { title: title.trim(), content: content.trim() })
      const result = await forumApi.getTopic(forumId, activeTopic.id)
      setActiveTopic(result.topic); setEditing(false); await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('communityForum.editPostFailed')) }
    finally { setBusy(false) }
  }

  if (activeTopic) return <section className="min-h-0 flex-1 overflow-y-auto p-4" aria-label={t('communityForum.topic')}>
    <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => setActiveTopic(null)}>{t('communityForum.allPosts')}</Button>
    {error && <p role="alert" className="my-3 rounded-lg border border-red-500/30 p-3 text-sm text-red-200">{error}</p>}
    <article className="mt-3 rounded-xl border border-border bg-background-primary p-4">
      {editing ? <form className="space-y-2" onSubmit={(event) => void updateTopic(event)}><Input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={160} aria-label={t('communityForum.topicTitle')} required /><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={20000} required rows={5} aria-label={t('communityForum.topicContent')} className="w-full resize-y rounded-lg border border-border bg-background-secondary p-3 text-sm text-text-primary" /><div className="flex gap-2"><Button type="submit" loading={busy}>{t('communityForum.save')}</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>{t('communityForum.cancel')}</Button></div></form> : <><h2 className="text-xl font-semibold text-text-primary">{activeTopic.title}</h2>
      <p className="mt-2 text-xs text-text-secondary">{activeTopic.author?.displayName ?? t('communityForum.member')} · {formatDateTime(new Date(activeTopic.createdAt))}</p>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm text-text-secondary">{activeTopic.content}</p>
      {activeTopic.authorUserId === currentUserId && <div className="mt-4 flex gap-2"><Button size="sm" variant="secondary" disabled={busy} leftIcon={<Pencil size={13} />} onClick={() => { setTitle(activeTopic.title); setContent(activeTopic.content); setEditing(true) }}>{t('common.edit')}</Button><Button size="sm" variant="danger" disabled={busy} onClick={() => void deleteTopic()}>{t('communityForum.deletePost')}</Button></div>}</>}
    </article>
    <div className="mt-4 space-y-2"><h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary"><MessageSquare size={15} />{t('communityForum.repliesCount', { count: replies.length })}</h3>
      {replies.map((item) => <article key={item.id} className="rounded-lg border border-border bg-background-primary p-3"><p className="text-xs font-medium text-text-primary">{item.author.displayName} · {formatDateTime(new Date(item.createdAt))}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-text-secondary">{item.content}</p></article>)}
      {replies.length === 0 && <p className="py-3 text-sm text-text-secondary">{t('communityForum.noReplies')}</p>}
      {!activeTopic.isLocked && <form className="flex gap-2" onSubmit={(event) => void createReply(event)}><Input value={reply} onChange={(event) => setReply(event.target.value)} maxLength={4000} placeholder={t('communityForum.writeReply')} aria-label={t('communityForum.writeReply')} /><Button type="button" variant="ghost" disabled={!reply} onClick={() => void replyDraft.discard()} aria-label={t('communityForum.discardReply')}>{t('communityForum.clear')}</Button><Button type="submit" disabled={busy || !reply.trim()} aria-label={t('communityForum.sendReply')}><Send size={15} /></Button></form>}
      {activeTopic.isLocked && <p className="text-xs text-text-secondary">{t('communityForum.topicLocked')}</p>}
    </div>
  </section>

  return <section className="min-h-0 flex-1 overflow-y-auto p-4" aria-label={t('communityForum.posts')}>
    <header className="mb-4"><h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary"><FileText size={18} />{t('communityForum.posts')}</h2><p className="mt-1 text-xs text-text-secondary">{t('communityForum.postsDescription')}</p></header>
    {canCreateTopics && <form onSubmit={(event) => void createTopic(event)} className="mb-4 space-y-2 rounded-xl border border-border bg-background-primary p-3" aria-label={t('communityForum.createPost')}><Input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={160} placeholder={t('communityForum.topicTitle')} aria-label={t('communityForum.topicTitle')} required /><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={20000} required rows={3} placeholder={t('communityForum.content')} aria-label={t('communityForum.content')} className="w-full resize-y rounded-lg border border-border bg-background-secondary p-3 text-sm text-text-primary" /><div className="flex gap-2"><Button type="submit" disabled={busy || !title.trim() || !content.trim()} loading={busy}>{t('communityForum.createPost')}</Button><Button type="button" variant="ghost" disabled={!title && !content} onClick={() => { setTitle(''); setContent(''); void topicDraft.discard() }}>{t('communityForum.discardDraft')}</Button></div></form>}
    {error && <p role="alert" className="mb-3 rounded-lg border border-red-500/30 p-3 text-sm text-red-200">{error}</p>}
    {loading ? <p className="py-8 text-center text-sm text-text-secondary">{t('communityForum.loadingPosts')}</p> : topics.length === 0 ? <div className="rounded-xl border border-dashed border-border p-8 text-center"><FileText size={24} className="mx-auto mb-2 text-text-secondary" /><p className="text-sm font-medium text-text-primary">{t('communityForum.noPosts')}</p><p className="mt-1 text-xs text-text-secondary">{t('communityForum.postsWillAppear')}</p></div> : <div className="space-y-2">{topics.map((topic) => <button key={topic.id} type="button" disabled={busy} onClick={() => void openTopic(topic)} className="w-full rounded-xl border border-border bg-background-primary p-3 text-left transition hover:border-accent/50"><span className="block font-semibold text-text-primary">{topic.title}</span><span className="mt-1 line-clamp-2 block whitespace-pre-wrap text-sm text-text-secondary">{topic.content}</span><span className="mt-2 flex items-center gap-1 text-[11px] text-text-secondary"><MessageSquare size={12} />{t('communityForum.repliesCount', { count: topic.replyCount ?? 0 })} · {topic.author?.displayName ?? t('communityForum.member')} · {formatDate(new Date(topic.createdAt))}</span></button>)}</div>}
  </section>
}

export default CommunityForumChannel
