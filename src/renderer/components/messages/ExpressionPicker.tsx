import React, { useEffect, useRef, useState } from 'react'
import { Loader2, Search, SmilePlus } from 'lucide-react'
import { listKlipyGifs, type KlipyGif, KlipyApiError } from '@/services/klipyApi'
import { UNICODE_EMOJI_CATEGORIES } from '@/lib/unicodeEmojis'
import { anceryxEmojis } from '@/lib/anceryxEmojis'
import { useTranslation } from '@/i18n'

const EMOJI_CATEGORY_KEYS = [
  'emojiCategory.recent', 'emojiCategory.people', 'emojiCategory.animals', 'emojiCategory.food',
  'emojiCategory.activities', 'emojiCategory.objects', 'emojiCategory.symbols', 'emojiCategory.flags',
] as const

interface ExpressionPickerProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onSelectEmoji: (emoji: string) => void
  onSelectGif: (gif: KlipyGif) => void
}

const ExpressionPicker: React.FC<ExpressionPickerProps> = ({ isOpen, onToggle, onClose, onSelectEmoji, onSelectGif }) => {
  const t = useTranslation()
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const requestId = useRef(0)
  const [tab, setTab] = useState<'gifs' | 'emoji'>('gifs')
  const [query, setQuery] = useState('')
  const [emojiCategory, setEmojiCategory] = useState(-1)
  const [gifs, setGifs] = useState<KlipyGif[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(360, window.innerWidth - 24)
    const height = Math.min(430, window.innerHeight - 24)
    const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.right - width))
    const above = rect.top - height - 10
    setPanelStyle({ position: 'fixed', left, top: Math.max(12, above >= 12 ? above : Math.min(window.innerHeight - height - 12, rect.bottom + 10)), width, maxHeight: height })
  }

  useEffect(() => {
    if (!isOpen) return
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) onClose()
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    updatePosition()
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || tab !== 'gifs') return
    const currentRequest = ++requestId.current
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await listKlipyGifs({ query, page: 1, signal: controller.signal })
        if (currentRequest !== requestId.current) return
        setGifs(result.items); setPage(1); setHasMore(result.hasMore)
      } catch (err) {
        if (controller.signal.aborted || currentRequest !== requestId.current) return
        setError(err instanceof KlipyApiError && err.status === 429 ? t('messages.klipyRateLimited') : err instanceof Error ? err.message : t('messages.gifLoadFailed'))
      } finally {
        if (currentRequest === requestId.current) setLoading(false)
      }
    }, query.trim() ? 300 : 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [isOpen, query, retryNonce, tab])

  const loadMore = async () => {
    if (loading || !hasMore) return
    setLoading(true); setError(null)
    try {
      const result = await listKlipyGifs({ query, page: page + 1 })
      setGifs((current) => [...current, ...result.items]); setPage((current) => current + 1); setHasMore(result.hasMore)
    } catch (err) {
      setError(err instanceof KlipyApiError && err.status === 429 ? t('messages.klipyRateLimited') : err instanceof Error ? err.message : t('messages.gifLoadMoreFailed'))
    } finally { setLoading(false) }
  }

  return <div ref={rootRef} className="relative">
    <button ref={triggerRef} type="button" onClick={() => { updatePosition(); onToggle() }} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary" aria-label={t('messages.openExpressions')} aria-haspopup="dialog" aria-expanded={isOpen} title={t('messages.gifEmojiTitle')}><SmilePlus size={18} /></button>
    {isOpen && <div ref={panelRef} style={panelStyle} role="dialog" aria-label={t('messages.gifEmojiTitle')} className="motion-menu-in z-[80] flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-background-elevated shadow-2xl">
      <div className="flex border-b border-border p-1">
        {(['gifs', 'emoji'] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${tab === item ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/10 hover:text-text-primary'}`}>{item === 'gifs' ? 'GIFs' : t('messages.emoji')}</button>)}
      </div>
      {tab === 'gifs' ? <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="relative mb-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('messages.searchKlipy')} className="w-full rounded-xl border border-border bg-background-tertiary py-2 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-accent" aria-label={t('messages.searchGifs')} /></div>
        <div className="mb-2 flex items-center justify-between text-[10px] text-text-secondary"><span>{t('messages.trendingAndSearch')}</span><span>{t('messages.gifProviderAttribution')}</span></div>
        {error && <div className="rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert">{error}<button type="button" onClick={() => setRetryNonce((value) => value + 1)} className="ml-2 underline">{t('common.retry')}</button></div>}
        {!error && loading && gifs.length === 0 && <div className="grid grid-cols-3 gap-2">{Array.from({ length: 9 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-xl bg-background-tertiary" />)}</div>}
        {!error && !loading && gifs.length === 0 && <p className="py-10 text-center text-xs text-text-secondary">{t('messages.noGifs')}</p>}
        <div className="anceryx-scroll grid min-h-0 grid-cols-3 gap-2 overflow-y-auto pr-1">{gifs.map((gif) => <button key={`${gif.id}-${gif.slug}`} type="button" onClick={() => { onSelectGif(gif); onClose() }} className="group aspect-square overflow-hidden rounded-xl border border-border bg-background-tertiary transition-transform hover:-translate-y-0.5 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={t('messages.sendGif', { title: gif.title })} title={gif.title}><img src={gif.previewUrl} alt={gif.title} loading="lazy" className="h-full w-full object-cover" draggable={false} /></button>)}</div>
        {hasMore && <button type="button" onClick={() => void loadMore()} disabled={loading} className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-text-secondary hover:bg-white/10 disabled:opacity-50">{loading && <Loader2 size={13} className="animate-spin" />}{t('common.loadMore')}</button>}
      </div> : <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="anceryx-scroll mb-2 flex gap-1 overflow-x-auto pb-1"><button type="button" onClick={() => setEmojiCategory(-1)} className={`whitespace-nowrap rounded-lg px-2 py-1 text-[10px] ${emojiCategory === -1 ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/10'}`}>Anceryx</button>{UNICODE_EMOJI_CATEGORIES.map((_category, index) => <button key={index} type="button" onClick={() => setEmojiCategory(index)} className={`whitespace-nowrap rounded-lg px-2 py-1 text-[10px] ${emojiCategory === index ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/10'}`}>{t(EMOJI_CATEGORY_KEYS[index])}</button>)}</div>
        <div className="anceryx-scroll grid min-h-0 grid-cols-7 gap-1 overflow-y-auto pr-1">{emojiCategory === -1 ? anceryxEmojis.map((emoji) => <button key={emoji.shortcode} type="button" onClick={() => onSelectEmoji(emoji.shortcode)} className="grid aspect-square place-items-center rounded-lg p-1 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent" aria-label={t('messages.insertEmoji', { name: emoji.name })} title={emoji.shortcode}><img src={emoji.asset} alt={emoji.name} className="h-8 w-8 object-contain" draggable={false} /></button>) : UNICODE_EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, index) => <button key={`${emoji}-${index}`} type="button" onClick={() => onSelectEmoji(emoji)} className="grid aspect-square place-items-center rounded-lg text-xl hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent" aria-label={t('messages.insertEmoji', { name: emoji })}>{emoji}</button>)}</div>
      </div>}
    </div>}
  </div>
}

export default ExpressionPicker
