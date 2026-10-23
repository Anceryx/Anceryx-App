import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Flag, Phone, Reply, Search, Video, X } from 'lucide-react'
import { Avatar, Button, Modal } from '@/components/ui/index'
import { MediaAttachment } from '@/components/ui/MediaAttachment'
import MessageComposer from '@/components/messages/MessageComposer'
import MessageImageViewer from '@/components/messages/MessageImageViewer'
import { useAuthStore } from '@/store/authStore'
import { useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { messagesApi, type DirectConversationDto, type DirectMessageDto } from '@/services/messagesApi'
import { mediaApi } from '@/services/mediaApi'
import { realtimeClient } from '@/services/realtimeClient'
import { useCall } from '@/hooks/useCall'
import type { MessageImageAttachment } from '@/types/messages'
import { getKaoliSticker, type KaoliStickerKey } from '@/lib/kaoliStickers'
import { renderAnceryxText } from '@/lib/anceryxEmojis'
import { isSafeKlipyMediaUrl, registerKlipyShare, type KlipyGif } from '@/services/klipyApi'
import { socialApi, type PublicProfileDto } from '@/services/socialApi'
import { SharedPostPreview } from '@/components/messages/SharedPostPreview'
import { extractSharedPostId } from '@/utils/sharedPost'
import PostDetailModal from '@/components/social/PostDetailModal'
import { formatDateSeparator, formatDateTime, formatTime } from '@/utils/formatters'
import { MAX_CACHED_MESSAGES_PER_CONVERSATION, updateDirectMessageCache } from '@/utils/directMessageCache'
import { getDirectMessageGroupPosition } from '@/utils/directMessagePresentation'
import { getConversationDraft, saveConversationDraft } from '@/utils/conversationDrafts'
import { useTranslation } from '@/i18n'

const MensagensPage: React.FC = () => {
  const t = useTranslation()
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const { following, followers, profiles, hydrateSocial } = useSocialStore()
  const notify = useUIStore((state) => state.addNotification)
  const consumePendingDm = useUIStore((state) => state.consumePendingDm)
  const call = useCall()
  const [conversations, setConversations] = useState<DirectConversationDto[]>([])
  const [messages, setMessages] = useState<Record<string, DirectMessageDto[]>>({})
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null)
  const [messageCursors, setMessageCursors] = useState<Record<string, string | null>>({})
  const [messagePaginationSupport, setMessagePaginationSupport] = useState<Record<string, boolean>>({})
  const [olderMessagesLoading, setOlderMessagesLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [conversationQuery, setConversationQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PublicProfileDto[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const draftTextRef = useRef('')
  const [draftReadyKey, setDraftReadyKey] = useState('')
  const draftStorageWarningRef = useRef(false)
  const conversationDraftsRef = useRef(new Map<string, string>())
  const [replyTarget, setReplyTarget] = useState<DirectMessageDto | null>(null)
  const [attachment, setAttachment] = useState<MessageImageAttachment | null>(null)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [uploadedAttachmentId, setUploadedAttachmentId] = useState<string | null>(null)
  const [draftMessageId, setDraftMessageId] = useState(() => crypto.randomUUID())
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const uploadControllerRef = useRef<AbortController | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [typing, setTyping] = useState<Set<string>>(new Set())
  const [recentMessageId, setRecentMessageId] = useState<string | null>(null)
  const [viewerImage, setViewerImage] = useState<MessageImageAttachment | null>(null)
  const [sharedPostId, setSharedPostId] = useState<string | null>(null)
  const [reportTarget, setReportTarget] = useState<DirectMessageDto | null>(null)
  const [reportReason, setReportReason] = useState<'spam' | 'harassment' | 'inappropriate_content' | 'scam_or_fraud' | 'violence_or_threat' | 'personal_information' | 'other'>('harassment')
  const [reportDetails, setReportDetails] = useState('')
  const [reportBusy, setReportBusy] = useState(false)
  const typingTimer = useRef<number | null>(null)
  const selectedConversationIdRef = useRef<string | null>(null)
  const messageLoadsRef = useRef(new Map<string, Promise<void>>())
  const olderLoadsRef = useRef(new Set<string>())
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const scrollBeforeOlderLoadRef = useRef<{ conversationId: string; height: number; top: number } | null>(null)

  const loadConversationMessages = useCallback((conversationId: string) => {
    if (messageLoadsRef.current.has(conversationId)) return messageLoadsRef.current.get(conversationId)!
    setLoadingConversationId(conversationId)
    const request = messagesApi.listMessages(conversationId)
      .then(({ messages: items, nextCursor }) => {
        setMessages((current) => updateDirectMessageCache(current, conversationId, items))
        setMessageCursors((current) => ({ ...current, [conversationId]: nextCursor ?? null }))
        setMessagePaginationSupport((current) => ({ ...current, [conversationId]: nextCursor !== undefined }))
      })
      .catch((reason) => { setError(reason instanceof Error ? reason.message : 'Falha ao carregar as mensagens.') })
      .finally(() => { messageLoadsRef.current.delete(conversationId); setLoadingConversationId((current) => current === conversationId ? null : current) })
    messageLoadsRef.current.set(conversationId, request)
    return request
  }, [])

  const load = useCallback(async () => {
    setError(null)
    try {
      const result = await messagesApi.listConversations()
      setConversations(result.conversations)
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao carregar mensagens.') }
  }, [])
  useEffect(() => { if (!user) return; void hydrateSocial(); void load() }, [hydrateSocial, load, user])
  useEffect(() => {
    const pending = consumePendingDm()
    if (!pending) return
    void (async () => {
      try {
        const { user: profile } = await socialApi.getUser(pending.username)
        const { conversation } = await messagesApi.openConversation(profile.id)
        setSearchResults((current) => [profile, ...current.filter((item) => item.id !== profile.id)])
        setConversations((current) => [conversation, ...current.filter((item) => item.conversationId !== conversation.conversationId)])
        setSelectedUserId(profile.id)
        setError(null)
        await loadConversationMessages(conversation.conversationId)
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível abrir esta conversa.') }
    })()
  }, [consumePendingDm, loadConversationMessages])
  useEffect(() => {
    realtimeClient.connect(token)
    const unsubs = [
      realtimeClient.subscribe('dm.message.created', ({ payload }) => {
        setMessages((current) => updateDirectMessageCache(current, payload.conversationId, [payload]))
        if (payload.sender.id !== user?.id && selectedConversationIdRef.current === payload.conversationId) setRecentMessageId(payload.messageId)
        setConversations((current) => {
          const existing = current.find((conversation) => conversation.conversationId === payload.conversationId)
          if (existing) return current.map((conversation) => conversation.conversationId === payload.conversationId ? { ...conversation, lastMessage: payload, updatedAt: payload.createdAt } : conversation)
          if (!user || payload.sender.id === user.id) { void load(); return current }
          return [{ conversationId: payload.conversationId, participantIds: [user.id, payload.sender.id], participants: [payload.sender], updatedAt: payload.createdAt, lastMessage: payload }, ...current]
        })
      }),
      realtimeClient.subscribe('dm.typing.updated', ({ payload }) => setTyping((current) => { const next = new Set(current); if (payload.isTyping) next.add(payload.userId); else next.delete(payload.userId); return next })),
    ]
    return () => unsubs.forEach((unsubscribe) => unsubscribe())
  }, [load, token, user])

  const conversationByUser = useMemo(() => new Map(conversations.map((conversation) => [conversation.participantIds.find((id) => id !== user?.id)!, conversation])), [conversations, user?.id])
  const knownUsers = useMemo(() => {
    const map = new Map(Object.values(profiles).map((profile) => [profile.id, { id: profile.id, publicUserId: profile.publicUserId, username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl }]))
    for (const conversation of conversations) for (const participant of conversation.participants) if (participant.id !== user?.id) map.set(participant.id, participant)
    return [...map.values()].filter((profile) => following.includes(profile.id) || followers.includes(profile.id) || conversationByUser.has(profile.id))
  }, [conversationByUser, conversations, followers, following, profiles, user?.id])
  useEffect(() => {
    const query = conversationQuery.trim()
    if (query.length < 2) { setSearchResults([]); setSearchError(null); return }
    let active = true
    const timer = window.setTimeout(() => { void socialApi.searchUsers(query).then(({ users: found }) => { if (active) { setSearchResults(found); setSearchError(null) } }).catch((reason) => { if (active) setSearchError(reason instanceof Error ? reason.message : 'Não foi possível pesquisar usuários.') }) }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [conversationQuery])
  const selectableUsers = useMemo(() => { const merged = new Map(knownUsers.map((profile) => [profile.id, profile])); for (const profile of searchResults) merged.set(profile.id, profile); return [...merged.values()] }, [knownUsers, searchResults])
  const visibleKnownUsers = useMemo(() => { const needle = conversationQuery.trim().replace(/^@+/, '').toLocaleLowerCase(); if (!needle) return knownUsers; return selectableUsers.filter((profile) => profile.username.toLocaleLowerCase().includes(needle) || profile.displayName.toLocaleLowerCase().includes(needle) || profile.publicUserId.includes(needle)) }, [conversationQuery, knownUsers, selectableUsers])
  const peer = selectableUsers.find((profile) => profile.id === selectedUserId) ?? null
  const selectedConversation = selectedUserId ? conversationByUser.get(selectedUserId) : undefined
  const selectedMessages = selectedConversation ? messages[selectedConversation.conversationId] ?? [] : []
  selectedConversationIdRef.current = selectedConversation?.conversationId ?? null
  useLayoutEffect(() => {
    const draft = getConversationDraft(conversationDraftsRef.current, selectedConversation?.conversationId ?? '')
    draftTextRef.current = draft
    setText(draft)
  }, [selectedConversation?.conversationId])

  const updateDraftText = (value: string) => {
    const next = value.slice(0, 20_000)
    draftTextRef.current = next
    setText(next)
    const conversationId = selectedConversationIdRef.current
    if (conversationId) saveConversationDraft(conversationDraftsRef.current, conversationId, next)
  }

  const draftKey = selectedConversation && user ? { userId: user.id, scope: 'dm' as const, resourceId: selectedConversation.conversationId } : null
  const draftKeyId = draftKey ? `${draftKey.userId}:dm:${draftKey.resourceId}` : ''
  const warnDraftStorageFailure = useCallback(() => {
    if (draftStorageWarningRef.current) return
    draftStorageWarningRef.current = true
    notify(t('messages.draftSaveUnavailable'), 'error')
  }, [notify, t])
  useEffect(() => {
    if (!draftKey || !window.electronAPI?.drafts) return
    let active = true
    void window.electronAPI.drafts.get(draftKey).then((result) => {
      if (active && result.ok) {
        if (result.content && !draftTextRef.current) {
          draftTextRef.current = result.content
          saveConversationDraft(conversationDraftsRef.current, draftKey.resourceId, result.content)
          setText(result.content)
        }
        setDraftReadyKey(draftKeyId)
      } else if (active) warnDraftStorageFailure()
    }).catch(() => { if (active) warnDraftStorageFailure() })
    return () => { active = false }
  }, [draftKeyId, warnDraftStorageFailure])

  useEffect(() => {
    if (!draftKey || !window.electronAPI?.drafts || draftReadyKey !== draftKeyId) return
    const save = () => { void window.electronAPI?.drafts.save(draftKey, draftTextRef.current).then((ok) => { if (!ok) warnDraftStorageFailure() }).catch(warnDraftStorageFailure) }
    const timer = window.setTimeout(save, 250)
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') save() }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVisibilityChange) }
  }, [draftKeyId, draftReadyKey, text, warnDraftStorageFailure])

  const persistCurrentDraft = () => {
    if (draftKey) void window.electronAPI?.drafts.save(draftKey, draftTextRef.current).then((ok) => { if (!ok) warnDraftStorageFailure() }).catch(warnDraftStorageFailure)
  }
  const discardCurrentDraft = () => {
    const conversationId = draftKey?.resourceId
    if (conversationId) {
      conversationDraftsRef.current.delete(conversationId)
      void window.electronAPI?.drafts.delete(draftKey!).then((ok) => { if (!ok) warnDraftStorageFailure() }).catch(warnDraftStorageFailure)
    }
    draftTextRef.current = ''
    setText('')
  }
  useLayoutEffect(() => {
    const pending = scrollBeforeOlderLoadRef.current
    const list = messageListRef.current
    if (!pending) return
    if (!list || pending.conversationId !== selectedConversation?.conversationId) {
      if (pending.conversationId !== selectedConversation?.conversationId) scrollBeforeOlderLoadRef.current = null
      return
    }
    list.scrollTop = pending.top + list.scrollHeight - pending.height
    scrollBeforeOlderLoadRef.current = null
  }, [messages, selectedConversation?.conversationId])

  const loadOlderMessages = async () => {
    const conversationId = selectedConversation?.conversationId
    const before = conversationId ? messageCursors[conversationId] : null
    const list = messageListRef.current
    if (!conversationId || !before || !list || olderLoadsRef.current.has(conversationId) || selectedMessages.length >= MAX_CACHED_MESSAGES_PER_CONVERSATION) return
    olderLoadsRef.current.add(conversationId)
    setOlderMessagesLoading(true)
    scrollBeforeOlderLoadRef.current = { conversationId, height: list.scrollHeight, top: list.scrollTop }
    try {
      const limit = Math.min(50, MAX_CACHED_MESSAGES_PER_CONVERSATION - selectedMessages.length)
      const page = await messagesApi.listMessages(conversationId, { before, limit })
      setMessages((current) => updateDirectMessageCache(current, conversationId, page.messages))
      setMessageCursors((current) => ({ ...current, [conversationId]: page.nextCursor ?? null }))
    } catch (reason) {
      scrollBeforeOlderLoadRef.current = null
      setError(reason instanceof Error ? reason.message : 'Falha ao carregar mensagens anteriores.')
    } finally {
      olderLoadsRef.current.delete(conversationId)
      setOlderMessagesLoading(false)
    }
  }
  const selectPeer = async (profile: { id: string; publicUserId: string; username: string; displayName: string; avatarUrl: string | null }) => {
    let conversation = conversationByUser.get(profile.id)
    if (!conversation) { try { conversation = (await messagesApi.openConversation(profile.id)).conversation; setConversations((current) => [conversation!, ...current.filter((item) => item.conversationId !== conversation!.conversationId)]) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar a conversa.'); return } }
    setSelectedUserId(profile.id)
    if (!messages[conversation.conversationId]) void loadConversationMessages(conversation.conversationId)
  }
  useEffect(() => {
    const conversationId = selectedConversation?.conversationId; if (!conversationId) return
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    if (text.trim()) { realtimeClient.sendTypingStart(conversationId); typingTimer.current = window.setTimeout(() => realtimeClient.sendTypingStop(conversationId), 2500) }
    else realtimeClient.sendTypingStop(conversationId)
    return () => { if (typingTimer.current) window.clearTimeout(typingTimer.current) }
  }, [selectedConversation?.conversationId, text])

  const pickImage = async (file?: File) => {
    if (!file) return
    try {
      const max = await mediaApi.getUploadLimit('dm-image', { recipientUserId: selectedUserId ?? undefined })
      if (file.size > max) { setError('O anexo ultrapassa o limite de ' + Math.floor(max / 1_000_000) + ' MB da sua conta.'); return }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível verificar o limite de envio.'); return }
    const url = URL.createObjectURL(file)
    setAttachmentFile(file); setAttachment({ url, previewUrl: url, mimeType: file.type as MessageImageAttachment['mimeType'], sizeBytes: file.size, name: file.name }); setError(null)
  }
  const clearAttachment = () => { if (attachment?.url.startsWith('blob:')) URL.revokeObjectURL(attachment.url); setAttachment(null); setAttachmentFile(null); setUploadedAttachmentId(null) }
  const discardAttachment = () => { if (uploadedAttachmentId) void mediaApi.deleteUpload(uploadedAttachmentId).catch(() => undefined); clearAttachment() }
  const cancelUpload = () => uploadControllerRef.current?.abort()
  const send = async (options: { stickerKey?: KaoliStickerKey; klipyGif?: KlipyGif } = {}) => {
    const { stickerKey, klipyGif } = options
    if (!selectedUserId || (!text.trim() && !attachmentFile && !stickerKey && !klipyGif)) return
    setUploading(true); setUploadProgress(0); setError(null)
    try {
      let mediaAssetId = uploadedAttachmentId ?? undefined
      if (attachmentFile && !mediaAssetId) { const controller = new AbortController(); uploadControllerRef.current = controller; mediaAssetId = (await mediaApi.uploadFile('dm-image', attachmentFile, undefined, { recipientUserId: selectedUserId }, { signal: controller.signal, onProgress: (progress) => setUploadProgress(progress.percent) })).id; setUploadedAttachmentId(mediaAssetId) }
      const result = await messagesApi.createMessage({ recipientUserId: selectedUserId, text: text.trim(), contentType: stickerKey ? 'sticker' : klipyGif ? 'gif' : 'text', stickerKey, mediaAssetId, externalMedia: klipyGif ? { provider: 'klipy', slug: klipyGif.slug, url: klipyGif.url, mimeType: 'image/gif', metadata: { title: klipyGif.title, width: klipyGif.width, height: klipyGif.height, previewUrl: klipyGif.previewUrl } } : undefined, clientMessageId: draftMessageId, replyToMessageId: replyTarget?.messageId })
      const message = result.message
      if (klipyGif) void registerKlipyShare(klipyGif).catch((err) => { if (err instanceof Error && 'status' in err && (err as { status?: number }).status === 429) notify('A KLIPY está no limite de testes. O GIF foi enviado.', 'error') })
      setConversations((current) => current.some((item) => item.conversationId === message.conversationId) ? current : [{ conversationId: message.conversationId, participantIds: [user!.id, selectedUserId], participants: [peer!], updatedAt: message.createdAt, lastMessage: message }, ...current])
      setMessages((current) => updateDirectMessageCache(current, message.conversationId, [message]))
      setRecentMessageId(message.messageId)
      const conversationId = selectedConversationIdRef.current
      if (conversationId) conversationDraftsRef.current.delete(conversationId)
      draftTextRef.current = ''
      setText(''); setReplyTarget(null); clearAttachment(); setDraftMessageId(crypto.randomUUID())
      if (draftKey) void window.electronAPI?.drafts.delete(draftKey).then((ok) => { if (!ok) warnDraftStorageFailure() }).catch(warnDraftStorageFailure)
    } catch (err) { setError(err instanceof Error ? err.message : 'Mensagem não enviada.'); notify('Mensagem não enviada.', 'error') } finally { uploadControllerRef.current = null; setUploading(false) }
  }
  const startCall = (callType: 'voice' | 'video') => { if (peer) void call.startOutgoing({ remoteUserId: peer.id, remoteUserName: peer.displayName, remoteAvatar: peer.avatarUrl, callType }).catch((err) => notify(err instanceof Error ? err.message : 'Chamada indisponível.', 'error')) }
  const startMessageReport = (message: DirectMessageDto) => {
    if (message.sender.id === user?.id) return
    setReportTarget(message)
    setReportReason('harassment')
    setReportDetails('')
  }
  const submitMessageReport = async () => {
    if (!reportTarget || (reportReason === 'other' && !reportDetails.trim())) return
    setReportBusy(true)
    try { await messagesApi.reportMessage(reportTarget.messageId, { reason: reportReason, details: reportDetails.trim() || undefined }); notify('Denúncia enviada para análise.', 'success'); setReportTarget(null) }
    catch (err) { notify(err instanceof Error ? err.message : 'Não foi possível enviar a denúncia.', 'error') }
    finally { setReportBusy(false) }
  }

  if (!user) return null
  return <div className="flex h-full min-h-0">
    <aside className={`${selectedUserId ? 'hidden md:block' : 'block'} w-full shrink-0 border-r border-border bg-background-secondary md:w-[240px]`}><label className="flex h-14 items-center gap-2 border-b border-border px-3"><Search size={15} className="shrink-0 text-text-secondary" /><input value={conversationQuery} onChange={(event) => setConversationQuery(event.target.value)} placeholder="Buscar conversa ou usuário" aria-label="Buscar conversa ou usuário" className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary" /></label><div className="anceryx-scroll overflow-y-auto">{(searchError || (!selectedUserId && error)) && <p role="alert" className="p-3 text-xs text-accent-red">{searchError || error}</p>}{visibleKnownUsers.map((profile) => { const last = conversationByUser.get(profile.id)?.lastMessage; return <button key={profile.id} onClick={() => void selectPeer(profile)} className={`flex w-full items-center gap-3 p-3 text-left ${selectedUserId === profile.id ? 'bg-background-tertiary' : 'hover:bg-background-tertiary/60'}`}><Avatar src={profile.avatarUrl} name={profile.displayName} size="sm" /><span className="min-w-0"><b className="block truncate text-sm" title={profile.displayName}>{profile.displayName}</b><small className="block truncate text-text-secondary">{last?.text || `@${profile.username}`}</small></span></button> })}{visibleKnownUsers.length === 0 && <p className="p-4 text-xs text-text-secondary">{conversationQuery.trim().length >= 2 ? 'Nenhum usuário encontrado.' : 'Nenhuma conversa ou amizade encontrada.'}</p>}</div></aside>
    <main className={`${selectedUserId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>{!peer ? <div className="grid flex-1 place-items-center text-sm text-text-secondary">Selecione um amigo ou uma conversa.</div> : <><header className="flex h-14 items-center gap-3 border-b border-border px-4"><button className="md:hidden" onClick={() => setSelectedUserId(null)} aria-label="Voltar para conversas"><ArrowLeft size={18} /></button><Avatar src={peer.avatarUrl} name={peer.displayName} size="sm" /><div className="flex-1"><b className="block truncate text-sm" title={peer.displayName}>{peer.displayName}</b><small className="text-text-secondary">@{peer.username}</small></div><button onClick={() => startCall('voice')} aria-label="Chamada de voz"><Phone size={18} /></button><button onClick={() => startCall('video')} aria-label="Chamada de vídeo"><Video size={18} /></button></header>
       <div ref={messageListRef} className="anceryx-scroll flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
         {selectedConversation && selectedMessages.length >= 50 && (!messagePaginationSupport[selectedConversation.conversationId]
           ? <p className="text-center text-xs text-text-secondary">{t('messages.paginationUnavailable')}</p>
           : messageCursors[selectedConversation.conversationId]
             ? (selectedMessages.length >= MAX_CACHED_MESSAGES_PER_CONVERSATION
               ? <p className="text-center text-xs text-text-secondary">{t('messages.historyLimit')}</p>
               : <button type="button" onClick={() => void loadOlderMessages()} disabled={olderMessagesLoading} className="mx-auto block rounded-lg px-3 py-2 text-xs text-accent-secondary hover:bg-background-tertiary disabled:opacity-60">{olderMessagesLoading ? t('messages.loadingOlder') : t('messages.loadOlder')}</button>)
             : null)}
         {selectedConversation && !messages[selectedConversation.conversationId] && loadingConversationId === selectedConversation.conversationId && <div role="status" aria-label={t('common.loading')} className="space-y-3 py-3"><div className="h-10 w-2/3 animate-pulse rounded-2xl bg-background-tertiary"/><div className="ml-auto h-12 w-1/2 animate-pulse rounded-2xl bg-background-tertiary"/><div className="h-10 w-3/5 animate-pulse rounded-2xl bg-background-tertiary"/></div>}
         {error && <div role="alert" className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error} <button className="ml-2 underline underline-offset-2" onClick={() => void load()}>Tentar novamente</button></div>}
         {selectedMessages.map((message, index) => {
           const sentAt = new Date(message.createdAt)
           const { showDate, startsGroup, endsGroup } = getDirectMessageGroupPosition(selectedMessages, index)
           const mine = message.sender.id === user.id
           const mediaUrl = message.media ? (message.contentType === 'gif' ? (isSafeKlipyMediaUrl(message.media.url) ? message.media.url : null) : mediaApi.resolvePublicUrl(message.media.url)) : null
           const image = mediaUrl && message.media ? { url: mediaUrl, mimeType: message.media.mimeType as MessageImageAttachment['mimeType'], sizeBytes: message.media.sizeBytes ?? 0, name: message.contentType === 'gif' ? 'GIF KLIPY' : 'Anexo' } : null
           const sticker = getKaoliSticker(message.stickerKey)
           return <React.Fragment key={message.messageId}>
             {showDate && <div className="flex justify-center py-2"><span className="rounded-full border border-border/70 bg-background-secondary/95 px-3 py-1 text-[11px] font-medium text-text-secondary shadow-sm">{formatDateSeparator(sentAt)}</span></div>}
              <div id={`dm-message-${message.messageId}`} onAnimationEnd={() => { if (recentMessageId === message.messageId) setRecentMessageId(null) }} className={`${recentMessageId === message.messageId ? 'motion-message-new' : ''} group flex min-w-0 items-end gap-1.5 ${mine ? 'justify-end' : 'justify-start'} ${startsGroup && index > 0 ? 'mt-3' : ''}`}>
                {!mine && (startsGroup ? <Avatar src={message.sender.avatarUrl} name={message.sender.displayName} size="xs" /> : <span aria-hidden="true" className="w-5 shrink-0" />)}
               <div className={`min-w-0 w-fit max-w-[84%] break-words px-3 py-2 text-sm shadow-sm sm:max-w-[72%] ${message.contentType === 'sticker' ? 'bg-transparent shadow-none' : mine ? `bg-accent text-white ${startsGroup ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-tr-md'} ${endsGroup ? 'rounded-2xl rounded-tr-md' : ''}` : `bg-background-tertiary text-text-primary ${startsGroup ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl rounded-tl-md'} ${endsGroup ? 'rounded-2xl rounded-tl-md' : ''}`}`}>
                 {message.replyTo && <button type="button" onClick={() => document.getElementById(`dm-message-${message.replyTo!.messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="mb-2 block max-w-full truncate border-l-2 border-current/50 pl-2 text-left text-xs opacity-75">{message.replyTo.deleted ? t('messages.deleted') : `${message.replyTo.sender?.displayName ?? 'Usuário'}: ${message.replyTo.excerpt ?? ''}`}</button>}
                 {message.contentType === 'sticker' ? sticker ? <img src={sticker.asset} alt={sticker.name} className="h-32 w-32 object-contain sm:h-36 sm:w-36" draggable={false} /> : <span className="text-xs text-text-secondary">Figurinha indisponível</span> : <><span className="whitespace-pre-wrap">{renderAnceryxText(message.text)}</span>{extractSharedPostId(message.text) && <SharedPostPreview text={message.text} onOpen={setSharedPostId} />}{image && (image.mimeType === 'video/mp4' ? <MediaAttachment src={image.url} mimeType={image.mimeType} privateMedia={!isSafeKlipyMediaUrl(image.url)} alt={image.name} className="mt-2 block h-auto w-full max-w-[32rem] rounded-lg" /> : <button type="button" className="mt-2 block" onClick={() => setViewerImage(image)}><MediaAttachment src={image.url} mimeType={image.mimeType} privateMedia={!isSafeKlipyMediaUrl(image.url)} className="max-h-64 max-w-full rounded-lg" alt={image.name} /></button>)}{message.contentType === 'gif' && image && <span className="mt-1 block text-[10px] opacity-60">Powered by KLIPY</span>}</>}
                 {endsGroup && <small className="mt-1 block text-right text-[10px] opacity-60" title={formatDateTime(sentAt)}>{formatTime(sentAt)}</small>}
               </div>
               <div className={`flex shrink-0 items-center gap-0.5 ${startsGroup ? 'opacity-60' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
                 <button type="button" onClick={() => setReplyTarget(message)} className="rounded p-1 text-text-secondary hover:bg-background-tertiary hover:text-text-primary" aria-label={t('messages.reply')} title={t('messages.reply')}><Reply size={14} /></button>
                 {!mine && <button type="button" onClick={() => startMessageReport(message)} className="rounded p-1 text-text-secondary hover:bg-background-tertiary hover:text-text-primary" aria-label={`${t('messages.report')} ${message.sender.displayName}`} title={t('messages.report')}><Flag size={14} /></button>}
               </div>
             </div>
           </React.Fragment>
         })}
         {typing.has(peer.id) && <p className="ml-9 text-xs text-text-secondary">{peer.displayName} está digitando...</p>}
       </div>
      {replyTarget && <div className="mx-3 flex items-center gap-2 border-l-2 border-accent bg-background-secondary px-3 py-2 text-xs text-text-secondary"><span className="min-w-0 flex-1 truncate">Respondendo a {replyTarget.sender.displayName}: {replyTarget.text || (replyTarget.contentType === 'sticker' ? 'Figurinha' : 'Mídia')}</span><button type="button" onClick={() => setReplyTarget(null)} aria-label="Cancelar resposta"><X size={14} /></button></div>}
      <MessageComposer value={text} onChange={updateDraftText} onDraftBlur={persistCurrentDraft} onDiscardDraft={discardCurrentDraft} discardDraftLabel={t('messages.discardDraft')} onSend={() => void send()} disabled={uploading} imagePreview={attachment} imageLoading={uploading} imageProgress={uploadProgress} onCancelUpload={cancelUpload} imageError={error} onPickImage={pickImage} onRemoveImage={discardAttachment} onRetryImage={() => void send()} onPickGif={(gif) => void send({ klipyGif: gif })} onPickSticker={(key) => void send({ stickerKey: key })} /></>}</main>
    {reportTarget && <Modal isOpen onClose={() => { if (!reportBusy) setReportTarget(null) }} title="Denunciar mensagem"><div className="space-y-4"><p className="text-sm text-text-secondary">Selecione o motivo da denúncia. A mensagem foi enviada por <strong className="text-text-primary">{reportTarget.sender.displayName}</strong> em {formatDateTime(new Date(reportTarget.createdAt))}.</p><label className="block text-sm text-text-primary">Motivo<select value={reportReason} onChange={(event) => setReportReason(event.target.value as typeof reportReason)} className="mt-1 w-full rounded-lg border border-border bg-background-tertiary px-3 py-2"><option value="spam">Spam</option><option value="harassment">Assédio</option><option value="inappropriate_content">Conteúdo inadequado</option><option value="scam_or_fraud">Golpe ou fraude</option><option value="violence_or_threat">Violência ou ameaça</option><option value="personal_information">Exposição de dados pessoais</option><option value="other">Outro</option></select></label><label className="block text-sm text-text-primary">Detalhes opcionais<textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background-tertiary px-3 py-2" /></label><div className="flex justify-end gap-2"><Button variant="ghost" disabled={reportBusy} onClick={() => setReportTarget(null)}>Cancelar</Button><Button loading={reportBusy} disabled={reportReason === 'other' && !reportDetails.trim()} onClick={() => void submitMessageReport()}>Enviar denúncia</Button></div></div></Modal>}
    {viewerImage && <MessageImageViewer image={viewerImage} onClose={() => setViewerImage(null)} />}
    {sharedPostId && <PostDetailModal postId={sharedPostId} onClose={() => setSharedPostId(null)} />}
  </div>
}
export default MensagensPage
