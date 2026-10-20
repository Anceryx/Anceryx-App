import React, { useEffect, useRef, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { KAOLI_STICKERS, type KaoliStickerKey } from '@/lib/kaoliStickers'

interface StickerPickerProps { isOpen: boolean; onToggle: () => void; onClose: () => void; onSelect: (key: KaoliStickerKey) => void }

const StickerPicker: React.FC<StickerPickerProps> = ({ isOpen, onToggle, onClose, onSelect }) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [query, setQuery] = useState('')
  const [style, setStyle] = useState<React.CSSProperties>({})
  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect(); if (!rect) return
    const width = Math.min(360, window.innerWidth - 24); const height = Math.min(390, window.innerHeight - 24)
    const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.right - width)); const above = rect.top - height - 10
    setStyle({ position: 'fixed', left, top: Math.max(12, above >= 12 ? above : Math.min(window.innerHeight - height - 12, rect.bottom + 10)), width, maxHeight: height })
  }
  useEffect(() => {
    if (!isOpen) return
    const outside = (event: PointerEvent) => { const target = event.target as Node; if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) onClose() }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    updatePosition(); document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape); window.addEventListener('resize', updatePosition); window.addEventListener('scroll', updatePosition, true)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', updatePosition, true) }
  }, [isOpen, onClose])
  const stickers = KAOLI_STICKERS.filter((sticker) => sticker.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <div ref={rootRef} className="relative">
    <button ref={triggerRef} type="button" onClick={() => { updatePosition(); onToggle() }} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary" aria-label="Abrir figurinhas Kaoli" aria-haspopup="dialog" aria-expanded={isOpen} title="Figurinhas"><Sparkles size={18} /></button>
    {isOpen && <div ref={panelRef} style={style} role="dialog" aria-label="Figurinhas Kaoli" className="motion-menu-in z-[80] flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-background-elevated p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between"><div><p className="text-sm font-semibold text-text-primary">Figurinhas</p><p className="text-[10px] text-text-secondary">Kaoli · Anceryx</p></div><span className="text-[10px] text-text-secondary">{KAOLI_STICKERS.length}</span></div>
      <div className="relative mb-3"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar figurinha" className="w-full rounded-xl border border-border bg-background-tertiary py-2 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-accent" /></div>
      <div className="anceryx-scroll grid min-h-0 grid-cols-2 gap-2 overflow-y-auto pr-1">{stickers.map((sticker) => <button key={sticker.key} type="button" onClick={() => { onSelect(sticker.key); onClose() }} className="group rounded-xl border border-border bg-background-tertiary p-2 transition-transform hover:-translate-y-0.5 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={`Enviar figurinha ${sticker.name}`} title={sticker.name}><img src={sticker.asset} alt={sticker.name} loading="lazy" className="mx-auto h-28 w-full object-contain" draggable={false} /><span className="block truncate text-[11px] text-text-secondary group-hover:text-text-primary">{sticker.name}</span></button>)}</div>
    </div>}
  </div>
}

export default StickerPicker
