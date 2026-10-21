import React, { useEffect, useState, useRef } from 'react'
import { Search, Plus, X, ImagePlus, Crown, Users, MessageSquare } from 'lucide-react'
import { useSocialStore } from '@/store/socialStore'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Button, EmojiPicker } from '@/components/ui/index'
import { ImageCropModal } from '@/components/ui/index'
import ForumCard from '@/components/social/ForumCard'
import ForumDetailModal from '@/components/social/ForumDetailModal'
import type { SidebarSection } from '@/types/index'
import type { Forum } from '@/types/index'
import {
  validateForumName,
  validateForumDescription,
  validateForumTags,
  validateUpload,
} from '@/utils/validators'
import { insertAtCursor, renderAnceryxText, type AnceryxEmoji } from '@/lib/anceryxEmojis'
import { mediaApi } from '@/services/mediaApi'
import { realtimeClient } from '@/services/realtimeClient'
import { communityApi } from '@/services/communityApi'

type Tab = 'todos' | 'meus'

// ── Constantes de upload ──────────────────────────────────────────────────────
const ICON_MIMES   = ['image/jpeg', 'image/png', 'image/webp']
const BANNER_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const ICON_MAX     = 2 * 1024 * 1024   // 2 MB
const BANNER_MAX   = 5 * 1024 * 1024   // 5 MB

// ── Utilitário: FileReader → dataURL ─────────────────────────────────────────
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

// ── Modal de criação de fórum ─────────────────────────────────────────────────
interface CreateForumModalProps {
  onClose: () => void
}

const CreateForumModal: React.FC<CreateForumModalProps> = ({ onClose }) => {
  const createForum      = useSocialStore((s) => s.createForum)
  const currentUserId    = useAuthStore((s) => s.user?.id ?? '')
  const addNotification  = useUIStore((s) => s.addNotification)

  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [tagInput,    setTagInput]    = useState('')
  const [tags,        setTags]        = useState<string[]>([])
  const [emojiOpen,   setEmojiOpen]   = useState(false)

  const [iconDataUrl,   setIconDataUrl]   = useState<string | null>(null)
  const [bannerDataUrl, setBannerDataUrl] = useState<string | null>(null)

  // Fonte temporária para o crop (antes de confirmar)
  const [iconCropSrc,   setIconCropSrc]   = useState<string | null>(null)
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const iconInputRef   = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // ── Handlers de upload ──────────────────────────────────────────────────
  const handleIconSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const err = validateUpload(file, ICON_MIMES, ICON_MAX)
    if (err) { setErrors((p) => ({ ...p, icon: err })); return }
    setErrors((p) => { const n = { ...p }; delete n.icon; return n })
    const dataUrl = await readAsDataURL(file)
    setIconCropSrc(dataUrl)
  }

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const err = validateUpload(file, BANNER_MIMES, BANNER_MAX)
    if (err) { setErrors((p) => ({ ...p, banner: err })); return }
    setErrors((p) => { const n = { ...p }; delete n.banner; return n })
    const dataUrl = await readAsDataURL(file)
    setBannerCropSrc(dataUrl)
  }

  // ── Tags ────────────────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (!t) return
    if (tags.includes(t)) { setTagInput(''); return }
    if (tags.length >= 10) { setErrors((p) => ({ ...p, tags: 'Máximo de 10 tags.' })); return }
    setTags((prev) => [...prev, t])
    setTagInput('')
    setErrors((p) => { const n = { ...p }; delete n.tags; return n })
  }

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs: Record<string, string> = {}

    const nameErr = validateForumName(name)
    if (nameErr) errs.name = nameErr

    const descErr = validateForumDescription(description)
    if (descErr) errs.description = descErr

    const tagsErr = validateForumTags(tags)
    if (tagsErr) errs.tags = tagsErr

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    let finalIcon = iconDataUrl
    let finalBanner = bannerDataUrl
    try {
      if (iconDataUrl) {
        const extension = iconDataUrl.startsWith('data:image/webp') ? 'webp' : 'png'
        const asset = await mediaApi.uploadDataUrl('forum-icon', `forum-icon.${extension}`, iconDataUrl)
        finalIcon = asset.publicUrl
      }
      if (bannerDataUrl) {
        const extension = bannerDataUrl.startsWith('data:image/webp') ? 'webp' : 'png'
        const asset = await mediaApi.uploadDataUrl('forum-banner', `forum-banner.${extension}`, bannerDataUrl)
        finalBanner = asset.publicUrl
      }
    } catch (error) {
      addNotification(error instanceof Error ? error.message : 'Não foi possível enviar as imagens do fórum.', 'error')
      setSubmitting(false)
      return
    }
    try {
      await createForum({
      name,
      description,
      iconImage: finalIcon,
      bannerImage: finalBanner,
      tags,
      ownerId: currentUserId,
      })
      addNotification(`Forum "${name.trim()}" criado!`, 'success')
      onClose()
    } catch (error) {
      addNotification(error instanceof Error ? error.message : 'Não foi possível criar o fórum.', 'error')
    } finally { setSubmitting(false) }
  }

  const DESC_MAX = 500

  const handleInsertEmoji = (emoji: AnceryxEmoji) => {
    const textarea = descriptionRef.current
    const start = textarea?.selectionStart ?? description.length
    const end = textarea?.selectionEnd ?? description.length
    const next = insertAtCursor(description, emoji.shortcode, start, end)
    if (next.value.length > DESC_MAX) return
    setDescription(next.value)
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(next.cursor, next.cursor)
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="dialog"
        aria-modal="true"
        aria-label="Criar fórum"
      >
        <div className="bg-background-secondary border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[92vh] overflow-hidden">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <h2 className="font-semibold text-text-primary text-base">Criar fórum</h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>

          {/* Corpo com scroll */}
          <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5">

            {/* Banner */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Banner (opcional)
              </label>
              <div
                className="relative rounded-xl border border-dashed border-border overflow-hidden"
                style={{ height: 96 }}
              >
                {bannerDataUrl ? (
                  <>
                    <img src={bannerDataUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        className="text-xs text-white bg-black/60 px-2 py-1 rounded"
                      >
                        Trocar
                      </button>
                      <button
                        type="button"
                        onClick={() => setBannerDataUrl(null)}
                        className="text-xs text-white bg-black/60 px-2 py-1 rounded"
                      >
                        Remover
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <ImagePlus size={18} />
                    <span className="text-xs">Adicionar banner</span>
                  </button>
                )}
              </div>
              {errors.banner && <p className="text-xs text-accent-red">{errors.banner}</p>}
              <input ref={bannerInputRef} type="file" accept={BANNER_MIMES.join(',')} className="hidden" onChange={handleBannerSelect} />
            </div>

            {/* Ícone + Nome lado a lado */}
            <div className="flex items-start gap-4">
              {/* Ícone */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-0.5">
                  Ícone
                </label>
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  className="relative w-14 h-14 rounded-xl border border-dashed border-border overflow-hidden flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Selecionar ícone do fórum"
                >
                  {iconDataUrl ? (
                    <img src={iconDataUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus size={20} />
                  )}
                </button>
                {iconDataUrl && (
                  <button
                    type="button"
                    onClick={() => setIconDataUrl(null)}
                    className="text-[10px] text-text-secondary hover:text-accent-red transition-colors"
                  >
                    Remover
                  </button>
                )}
                {errors.icon && <p className="text-xs text-accent-red text-center">{errors.icon}</p>}
                <input ref={iconInputRef} type="file" accept={ICON_MIMES.join(',')} className="hidden" onChange={handleIconSelect} />
              </div>

              {/* Nome */}
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Nome <span className="text-accent-red">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => { const n = { ...p }; delete n.name; return n }) }}
                  maxLength={60}
                  placeholder="Nome do fórum"
                  className="w-full bg-background-tertiary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  aria-invalid={!!errors.name}
                />
                {errors.name && <p className="text-xs text-accent-red">{errors.name}</p>}
              </div>
            </div>

            {/* Descrição */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Descrição <span className="text-accent-red">*</span>
                </label>
                <span className="text-xs text-text-secondary">{description.length}/{DESC_MAX}</span>
              </div>
              <textarea
                ref={descriptionRef}
                value={description}
                onChange={(e) => { setDescription(e.target.value.slice(0, DESC_MAX)); setErrors((p) => { const n = { ...p }; delete n.description; return n }) }}
                rows={3}
                placeholder="Do que se trata este fórum?"
                className="w-full bg-background-tertiary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                aria-invalid={!!errors.description}
              />
              <div className="flex items-center justify-between gap-2">
                <EmojiPicker
                  isOpen={emojiOpen}
                  onToggle={() => setEmojiOpen((value) => !value)}
                  onClose={() => setEmojiOpen(false)}
                  onSelect={handleInsertEmoji}
                  label="Abrir emojis para descrição"
                />
                <span className="text-[11px] text-text-secondary">Shortcodes são salvos como texto.</span>
              </div>
              {errors.description && <p className="text-xs text-accent-red">{errors.description}</p>}
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Tags (opcional, máx. 10)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="ex: tecnologia"
                  maxLength={30}
                  className="flex-1 bg-background-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <Button variant="secondary" size="sm" onClick={addTag} type="button">
                  Adicionar
                </Button>
              </div>
              {errors.tags && <p className="text-xs text-accent-red">{errors.tags}</p>}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-background-tertiary border border-border text-text-secondary"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-accent-red transition-colors"
                        aria-label={`Remover tag ${tag}`}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border shrink-0">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={() => void handleSubmit()} loading={submitting}>
              Criar fórum
            </Button>
          </div>
        </div>
      </div>

      {/* Crop — ícone */}
      {iconCropSrc && (
        <ImageCropModal
          src={iconCropSrc}
          shape="circle"
          aspect={1}
          outputWidth={512}
          outputHeight={512}
          title="Ajustar ícone do fórum"
          onApply={(dataUrl) => { setIconDataUrl(dataUrl); setIconCropSrc(null) }}
          onCancel={() => setIconCropSrc(null)}
        />
      )}

      {/* Crop — banner */}
      {bannerCropSrc && (
        <ImageCropModal
          src={bannerCropSrc}
          shape="rect"
          aspect={16 / 9}
          outputWidth={1920}
          outputHeight={1080}
          title="Ajustar banner do fórum"
          onApply={(dataUrl) => { setBannerDataUrl(dataUrl); setBannerCropSrc(null) }}
          onCancel={() => setBannerCropSrc(null)}
        />
      )}
    </>
  )
}

// ── Página principal de Fóruns ────────────────────────────────────────────────
const ForunsPage: React.FC<{ onNavigateGlobal?: (section: SidebarSection) => void }> = ({ onNavigateGlobal }) => {
  const forums        = useSocialStore((s) => s.forums)
  const upsertRealtimeForumTopic = useSocialStore((s) => s.upsertRealtimeForumTopic)
  const deleteRealtimeForumTopic = useSocialStore((s) => s.deleteRealtimeForumTopic)
  const setForumTopicFlag = useSocialStore((s) => s.setForumTopicFlag)
  const currentUserId = useAuthStore((s) => s.user?.id ?? '')
  const token         = useAuthStore((s) => s.token)
  const addNotification = useUIStore((s) => s.addNotification)
  const hydrateSocial = useSocialStore((s) => s.hydrateSocial)

  const [activeTab,    setActiveTab]    = useState<Tab>('todos')
  const [searchQuery,  setSearchQuery]  = useState('')
  const [showCreate,   setShowCreate]   = useState(false)
  const [detailForum,  setDetailForum]  = useState<Forum | null>(null)

  useEffect(() => {
    if (!token) return
    realtimeClient.connect(token)
    const unsubs = [
      realtimeClient.subscribe('forum.topic.created', (event) => upsertRealtimeForumTopic(event.payload)),
      realtimeClient.subscribe('forum.topic.updated', (event) => upsertRealtimeForumTopic(event.payload)),
      realtimeClient.subscribe('forum.topic.deleted', (event) => deleteRealtimeForumTopic(event.payload.forumId, event.payload.topicId)),
      realtimeClient.subscribe('forum.topic.state.updated', (event) => setForumTopicFlag(event.payload.forumId, event.payload.topicId, event.payload.flag, event.payload.value)),
      realtimeClient.subscribe('forum.reply.created', () => addNotification('Nova resposta em um fórum que você acompanha.', 'info')),
      realtimeClient.subscribe('notification.created', (event) => {
        if (event.payload.type === 'forum.reply') addNotification('Nova resposta em um tópico relevante.', 'info')
      }),
    ]
    return () => unsubs.forEach((unsubscribe) => unsubscribe())
  }, [addNotification, deleteRealtimeForumTopic, setForumTopicFlag, token, upsertRealtimeForumTopic])

  useEffect(() => {
    const unsubscribe = window.electronAPI?.community.onInvite((inviteToken) => {
      void communityApi.joinByInvite(inviteToken).then(async ({ joined }) => {
        await hydrateSocial()
        setActiveTab('meus')
        addNotification(joined.channelId ? 'Você entrou no fórum pelo convite. Abra o canal indicado para continuar.' : 'Você entrou no fórum pelo convite.', 'success')
      }).catch((reason) => addNotification(reason instanceof Error ? reason.message : 'Não foi possível entrar pelo convite.', 'error'))
    })
    return unsubscribe
  }, [addNotification, hydrateSocial, token])

  const filtered = forums
    .filter((f) => {
      if (activeTab === 'meus') return f.isJoined
      return true
    })
    .filter((f) => {
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true
      return (
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))
      )
    })

  const myForums     = forums.filter((f) => f.isJoined)
  const ownedForums  = myForums.filter((f) => f.ownerId === currentUserId)
  const joinedForums = myForums.filter((f) => f.ownerId !== currentUserId)

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:gap-3 sm:px-4">
          <Search size={16} className="text-text-secondary shrink-0" aria-hidden="true" />
          <input
            type="text"
            className="min-w-0 flex-1 text-sm bg-background-tertiary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Procurar fóruns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Procurar fóruns"
          />
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => setShowCreate(true)}
            aria-label="Criar fórum"
            title="Criar fórum"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 overflow-x-auto border-b border-border px-2 sm:px-4">
          {(['todos', 'meus'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={[
                'min-h-11 shrink-0 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4',
                activeTab === tab
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-text-secondary hover:text-text-primary'
              ].join(' ')}
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              {tab === 'todos' ? 'Todos' : `Meus Fóruns${myForums.length > 0 ? ` (${myForums.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="mobile-scroll flex-1 overflow-y-auto p-3 sm:p-4">
          {/* Empty state — sem nenhum fórum */}
          {forums.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}
              >
                <MessageSquare size={28} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Nenhum fórum criado ainda</p>
                <p className="text-sm text-text-secondary">Seja o primeiro a criar uma comunidade.</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} leftIcon={<Plus size={14} />}>
                Criar fórum
              </Button>
            </div>
          )}

          {/* Empty state — aba Meus sem nada */}
          {forums.length > 0 && activeTab === 'meus' && myForums.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <Users size={28} className="text-text-secondary opacity-40" />
              <p className="text-sm text-text-secondary">Você ainda não entrou em nenhum fórum.</p>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('todos')}>
                Ver todos os fóruns
              </Button>
            </div>
          )}

          {/* Seções na aba Meus */}
          {activeTab === 'meus' && myForums.length > 0 && (
            <div className="flex flex-col gap-6">
              {ownedForums.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Crown size={13} style={{ color: 'var(--color-accent)' }} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Criados por você
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {ownedForums.map((f) => (
                      <ForumCard key={f.id} forum={f} onClick={setDetailForum} />
                    ))}
                  </div>
                </div>
              )}
              {joinedForums.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={13} className="text-text-secondary" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Onde você é membro
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {joinedForums.map((f) => (
                      <ForumCard key={f.id} forum={f} onClick={setDetailForum} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lista geral (aba Todos) */}
          {activeTab === 'todos' && forums.length > 0 && (
            <>
              {filtered.length === 0 ? (
                <p className="text-center text-text-secondary text-sm py-8">
                  Nenhum fórum corresponde à busca.
                </p>
              ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filtered.map((forum) => (
                    <ForumCard key={forum.id} forum={forum} onClick={setDetailForum} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de criação */}
      {showCreate && <CreateForumModal onClose={() => setShowCreate(false)} />}

      {/* Modal de detalhe */}
      {detailForum && (
        <ForumDetailModal forum={detailForum} onClose={() => setDetailForum(null)} onNavigateGlobal={onNavigateGlobal} />
      )}
    </>
  )
}

export default ForunsPage
