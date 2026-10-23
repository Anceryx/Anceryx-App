import React, { useState, useRef } from 'react'
import { X, ImagePlus } from 'lucide-react'
import { useSocialStore } from '@/store/socialStore'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Button, EmojiPicker, ImageCropModal } from '@/components/ui/index'
import type { Forum } from '@/types/index'
import { validateForumName, validateForumDescription, validateForumTags, validateUpload } from '@/utils/validators'
import { insertAtCursor, renderAnceryxText, type AnceryxEmoji } from '@/lib/anceryxEmojis'
import { mediaApi } from '@/services/mediaApi'
import { useTranslation } from '@/i18n'

type ForumTemplateKey = 'blank' | 'games' | 'friends' | 'community'
type ForumChannelType = 'text' | 'voice'
const FORUM_TEMPLATES = [
  { id: 'blank', titleKey: 'createForum.template.blank.title', descriptionKey: 'createForum.template.blank.description', categories: [{ nameKey: 'createForum.category.general', channels: [{ nameKey: 'createForum.channel.general', type: 'text' }] }] },
  { id: 'games', titleKey: 'createForum.template.games.title', descriptionKey: 'createForum.template.games.description', categories: [{ nameKey: 'createForum.category.start', channels: [{ nameKey: 'createForum.channel.welcome', type: 'text' }, { nameKey: 'createForum.channel.rules', type: 'text' }] }, { nameKey: 'createForum.category.conversations', channels: [{ nameKey: 'createForum.channel.general', type: 'text' }, { nameKey: 'createForum.channel.highlights', type: 'text' }] }, { nameKey: 'createForum.category.voice', channels: [{ nameKey: 'createForum.channel.lobby', type: 'voice' }, { nameKey: 'createForum.channel.games', type: 'voice' }] }] },
  { id: 'friends', titleKey: 'createForum.template.friends.title', descriptionKey: 'createForum.template.friends.description', categories: [{ nameKey: 'createForum.category.general', channels: [{ nameKey: 'createForum.channel.general', type: 'text' }, { nameKey: 'createForum.channel.memes', type: 'text' }] }, { nameKey: 'createForum.category.voice', channels: [{ nameKey: 'createForum.channel.hangout', type: 'voice' }, { nameKey: 'createForum.channel.play', type: 'voice' }] }] },
  { id: 'community', titleKey: 'createForum.template.community.title', descriptionKey: 'createForum.template.community.description', categories: [{ nameKey: 'createForum.category.community', channels: [{ nameKey: 'createForum.channel.announcements', type: 'text' }, { nameKey: 'createForum.channel.introductions', type: 'text' }, { nameKey: 'createForum.channel.rules', type: 'text' }] }, { nameKey: 'createForum.category.conversations', channels: [{ nameKey: 'createForum.channel.general', type: 'text' }, { nameKey: 'createForum.channel.suggestions', type: 'text' }] }, { nameKey: 'createForum.category.voice', channels: [{ nameKey: 'createForum.channel.meetups', type: 'voice' }] }] },
] as const

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
    reader.onerror = () => reject(new Error('FILE_READ_FAILED'))
    reader.readAsDataURL(file)
  })
}

// ── Modal de criação de fórum ─────────────────────────────────────────────────
interface CreateForumModalProps {
  onClose: () => void
  onCreated: (forum: Forum) => void
}

const CreateForumModal: React.FC<CreateForumModalProps> = ({ onClose, onCreated }) => {
  const t = useTranslation()
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
  const [uploadedIconUrl, setUploadedIconUrl] = useState<string | null>(null)
  const [uploadedBannerUrl, setUploadedBannerUrl] = useState<string | null>(null)
  const lastBlobUploadAtRef = useRef(0)
  const [failedOptionalImage, setFailedOptionalImage] = useState<'icon' | 'banner' | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [templateId, setTemplateId] = useState<ForumTemplateKey | null>(null)
  const [purpose, setPurpose] = useState<'club' | 'friends' | 'later'>('later')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')

  const iconInputRef   = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // ── Handlers de upload ──────────────────────────────────────────────────
  const handleIconSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const err = validateUpload(file, ICON_MIMES, ICON_MAX, t)
    if (err) { setErrors((p) => ({ ...p, icon: err })); return }
    setErrors((p) => { const n = { ...p }; delete n.icon; return n })
    try {
      setIconCropSrc(await readAsDataURL(file))
    } catch {
      setErrors((p) => ({ ...p, icon: t('createForum.validation.fileRead') }))
    }
  }

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const err = validateUpload(file, BANNER_MIMES, BANNER_MAX, t)
    if (err) { setErrors((p) => ({ ...p, banner: err })); return }
    setErrors((p) => { const n = { ...p }; delete n.banner; return n })
    try {
      setBannerCropSrc(await readAsDataURL(file))
    } catch {
      setErrors((p) => ({ ...p, banner: t('createForum.validation.fileRead') }))
    }
  }

  // ── Tags ────────────────────────────────────────────────────────────────
  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '')
    if (!tag) return
    if (tags.includes(tag)) { setTagInput(''); return }
    if (tags.length >= 10) { setErrors((p) => ({ ...p, tags: t('createForum.validation.tagCount', { count: 10 }) })); return }
    setTags((prev) => [...prev, tag])
    setTagInput('')
    setErrors((p) => { const n = { ...p }; delete n.tags; return n })
  }

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (skipImage?: 'icon' | 'banner') => {
    if (step === 1) {
      if (templateId) setStep(2)
      return
    }
    const errs: Record<string, string> = {}

    const nameErr = validateForumName(name, t)
    if (nameErr) errs.name = nameErr

    const descErr = validateForumDescription(description, t)
    if (descErr) errs.description = descErr

    const tagsErr = validateForumTags(tags, t)
    if (tagsErr) errs.tags = tagsErr

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    if (step === 2) {
      setStep(3)
      return
    }

    setSubmitting(true)
    let finalIcon = skipImage === 'icon' && failedOptionalImage === 'icon' ? null : uploadedIconUrl ?? iconDataUrl
    let finalBanner = skipImage === 'banner' && failedOptionalImage === 'banner' ? null : uploadedBannerUrl ?? bannerDataUrl
    let uploadingImage: 'icon' | 'banner' | null = null
    try {
      if (iconDataUrl && !uploadedIconUrl && !(skipImage === 'icon' && failedOptionalImage === 'icon')) {
        uploadingImage = 'icon'
        const extension = iconDataUrl.startsWith('data:image/webp') ? 'webp' : 'png'
        const asset = await mediaApi.uploadDataUrl('forum-icon', `forum-icon.${extension}`, iconDataUrl)
        lastBlobUploadAtRef.current = Date.now()
        finalIcon = asset.publicUrl
        setUploadedIconUrl(asset.publicUrl)
      }
      if (bannerDataUrl && !uploadedBannerUrl && !(skipImage === 'banner' && failedOptionalImage === 'banner')) {
        uploadingImage = 'banner'
        const spacingMs = 1_100
        const remainingMs = Math.max(0, spacingMs - (Date.now() - lastBlobUploadAtRef.current))
        if (lastBlobUploadAtRef.current > 0 && remainingMs > 0) await new Promise((resolve) => setTimeout(resolve, remainingMs))
        const extension = bannerDataUrl.startsWith('data:image/webp') ? 'webp' : 'png'
        const asset = await mediaApi.uploadDataUrl('forum-banner', `forum-banner.${extension}`, bannerDataUrl)
        lastBlobUploadAtRef.current = Date.now()
        finalBanner = asset.publicUrl
        setUploadedBannerUrl(asset.publicUrl)
      }
    } catch (error) {
      setFailedOptionalImage(uploadingImage)
      const message = error instanceof Error && error.message !== 'FILE_READ_FAILED'
        ? error.message
        : t(error instanceof Error ? 'createForum.validation.fileRead' : 'createForum.imageUploadFailed')
      addNotification(message, 'error')
      setSubmitting(false)
      return
    }
    setFailedOptionalImage(null)
    try {
      const createdForum = await createForum({
      name,
      description,
      iconImage: finalIcon,
      bannerImage: finalBanner,
      tags,
      ownerId: currentUserId,
      visibility,
      structure: { categories: FORUM_TEMPLATES.find((template) => template.id === templateId)!.categories.map((category) => ({ name: t(category.nameKey), channels: category.channels.map((channel) => ({ name: t(channel.nameKey), type: channel.type })) })) },
      })
      addNotification(t('createForum.created', { name: name.trim() }), 'success')
      onCreated(createdForum)
    } catch (error) {
      addNotification(error instanceof Error ? error.message : t('createForum.failed'), 'error')
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
        className="titlebar-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="dialog"
        aria-modal="true"
        aria-label={t('createForum.title')}
      >
        <div className="bg-background-secondary border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[92vh] overflow-hidden">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <h2 className="font-semibold text-text-primary text-base">{t('createForum.title')}</h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors" aria-label={t('common.close')}>
              <X size={18} />
            </button>
          </div>

          {/* Corpo com scroll */}
          <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5">

            {step === 1 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-text-secondary">{t('createForum.chooseStructure')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FORUM_TEMPLATES.map((template) => (
                    <button key={template.id} type="button" onClick={() => setTemplateId(template.id)}
                      className={`text-left rounded-xl border p-3 transition-colors ${templateId === template.id ? 'border-accent bg-accent/10' : 'border-border hover:border-text-secondary'}`}>
                      <span className="block text-sm font-semibold text-text-primary">{t(template.titleKey)}</span>
                      <span className="block mt-1 text-xs text-text-secondary">{t(template.descriptionKey)}</span>
                      <span className="block mt-2 text-[11px] text-text-secondary">{t('createForum.templateCounts', { categories: template.categories.length, channels: template.categories.reduce((total, category) => total + category.channels.length, 0) })}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && <>

            {/* Banner */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {t('createForum.bannerOptional')}
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
                        {t('createForum.changeImage')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBannerDataUrl(null); setUploadedBannerUrl(null) }}
                        className="text-xs text-white bg-black/60 px-2 py-1 rounded"
                      >
                        {t('common.remove')}
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
                    <span className="text-xs">{t('createForum.addBanner')}</span>
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
                  {t('createForum.icon')}
                </label>
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  className="relative w-14 h-14 rounded-xl border border-dashed border-border overflow-hidden flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                  aria-label={t('createForum.selectIcon')}
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
                    onClick={() => { setIconDataUrl(null); setUploadedIconUrl(null) }}
                    className="text-[10px] text-text-secondary hover:text-accent-red transition-colors"
                  >
                    {t('common.remove')}
                  </button>
                )}
                {errors.icon && <p className="text-xs text-accent-red text-center">{errors.icon}</p>}
                <input ref={iconInputRef} type="file" accept={ICON_MIMES.join(',')} className="hidden" onChange={handleIconSelect} />
              </div>

              {/* Nome */}
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  {t('createForum.name')} <span className="text-accent-red">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => { const n = { ...p }; delete n.name; return n }) }}
                  maxLength={60}
                  placeholder={t('createForum.namePlaceholder')}
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
                  {t('createForum.description')} <span className="text-accent-red">*</span>
                </label>
                <span className="text-xs text-text-secondary">{description.length}/{DESC_MAX}</span>
              </div>
              <textarea
                ref={descriptionRef}
                value={description}
                onChange={(e) => { setDescription(e.target.value.slice(0, DESC_MAX)); setErrors((p) => { const n = { ...p }; delete n.description; return n }) }}
                rows={3}
                placeholder={t('createForum.descriptionPlaceholder')}
                className="w-full bg-background-tertiary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                aria-invalid={!!errors.description}
              />
              <div className="flex items-center justify-between gap-2">
                <EmojiPicker
                  isOpen={emojiOpen}
                  onToggle={() => setEmojiOpen((value) => !value)}
                  onClose={() => setEmojiOpen(false)}
                  onSelect={handleInsertEmoji}
                  label={t('createForum.openDescriptionEmojiPicker')}
                />
                <span className="text-[11px] text-text-secondary">{t('createForum.shortcodesInfo')}</span>
              </div>
              {errors.description && <p className="text-xs text-accent-red">{errors.description}</p>}
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {t('createForum.tagsOptional')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder={t('createForum.tagPlaceholder')}
                  maxLength={30}
                  className="flex-1 bg-background-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <Button variant="secondary" size="sm" onClick={addTag} type="button">
                  {t('createForum.addTag')}
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
                        aria-label={t('createForum.removeTag', { name: tag })}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            </>}

            {step === 3 && templateId && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{t('createForum.reviewStructure')}</h3>
                  <p className="mt-1 text-xs text-text-secondary">{t('createForum.structureWillBeCreated')}</p>
                </div>
                <div className="rounded-xl border border-border p-3 flex flex-col gap-3">
                  {FORUM_TEMPLATES.find((template) => template.id === templateId)?.categories.map((category) => (
                    <div key={category.nameKey}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{t(category.nameKey)}</p>
                      <p className="mt-1 text-sm text-text-primary">{category.channels.map((channel) => `${channel.type === 'voice' ? '◖' : '#'} ${t(channel.nameKey)}`).join(' · ')}</p>
                    </div>
                  ))}
                </div>
                {templateId === 'blank' && <fieldset className="flex flex-col gap-2">
                  <legend className="text-xs font-semibold text-text-primary">{t('createForum.purposeQuestion')}</legend>
                  {([['club', 'createForum.purpose.club'], ['friends', 'createForum.purpose.friends'], ['later', 'createForum.purpose.later']] as const).map(([value, key]) => (
                    <label key={value} className="flex items-center gap-2 text-sm text-text-secondary"><input type="radio" name="forum-purpose" checked={purpose === value} onChange={() => setPurpose(value)} />{t(key)}</label>
                  ))}
                </fieldset>}
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-xs font-semibold text-text-primary">{t('createForum.visibilityQuestion')}</legend>
                  {([['public', 'createForum.visibility.public'], ['private', 'createForum.visibility.private']] as const).map(([value, key]) => (
                    <label key={value} className="flex items-center gap-2 text-sm text-text-secondary"><input type="radio" name="forum-visibility" checked={visibility === value} onChange={() => setVisibility(value)} />{t(key)}</label>
                  ))}
                </fieldset>
                <p className="text-xs text-text-secondary">{t('createForum.purposeNote')}</p>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border shrink-0">
            <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
            {step > 1 && <Button variant="ghost" size="sm" onClick={() => setStep(step === 3 ? 2 : 1)}>{t('common.back')}</Button>}
            {step === 3 && failedOptionalImage && <Button variant="secondary" size="sm" onClick={() => void handleSubmit(failedOptionalImage)} loading={submitting} disabled={submitting}>
              {t('createForum.createWithoutImage', { image: t(failedOptionalImage === 'banner' ? 'createForum.banner' : 'createForum.icon').toLowerCase() })}
            </Button>}
            <Button variant="primary" size="sm" onClick={() => void handleSubmit()} loading={submitting} disabled={step === 1 && !templateId}>
              {step === 1 ? t('createForum.continue') : step === 2 ? t('createForum.review') : t('createForum.create')}
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
          title={t('createForum.cropIcon')}
          onApply={(dataUrl) => { setIconDataUrl(dataUrl); setUploadedIconUrl(null); setIconCropSrc(null) }}
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
          title={t('createForum.cropBanner')}
          onApply={(dataUrl) => { setBannerDataUrl(dataUrl); setUploadedBannerUrl(null); setBannerCropSrc(null) }}
          onCancel={() => setBannerCropSrc(null)}
        />
      )}
    </>
  )
}

export default CreateForumModal
