import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import Button from './Button'
import { clampCropOffset, clampCropZoom, coverScale, getCropOutputSize } from '@/utils/imageCropGeometry'
import { isolateDialogBackground, restoreDialogFocus, trapDialogTabKey } from '@/utils/dialogAccessibility'

export type CropShape = 'circle' | 'rect'

export interface ImageCropModalProps {
  src: string
  shape: CropShape
  aspect: number
  outputWidth: number
  outputHeight: number
  title: string
  onApply: (dataUrl: string) => void
  onCancel: () => void
  preserveOriginal?: boolean
}

const FRAME_HEIGHT = 220
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const ImageCropModal: React.FC<ImageCropModalProps> = ({ src, shape, aspect, outputWidth, outputHeight, title, onApply, onCancel, preserveOriginal = false }) => {
  const frameHeight = FRAME_HEIGHT
  const frameWidth = shape === 'circle' ? FRAME_HEIGHT : Math.round(FRAME_HEIGHT * aspect)
  const stageScale = Math.min(1, (window.innerWidth - 56) / (frameWidth + 48))
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const tokenRef = useRef(0)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const releaseBackground = overlayRef.current
      ? isolateDialogBackground(overlayRef.current, document.body)
      : () => undefined
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      releaseBackground()
      document.body.style.overflow = previousOverflow
      restoreDialogFocus(previousFocus)
    }
  }, [])

  useEffect(() => {
    setZoom(1); setOffset({ x: 0, y: 0 }); setBusy(false); setError(null)
    const image = new Image()
    image.onload = () => setImageSize({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => setError('Não foi possível abrir esta imagem. Tente outro arquivo.')
    image.src = src
    return () => { tokenRef.current += 1 }
  }, [src])

  const baseScale = coverScale(imageSize.width, imageSize.height, frameWidth, frameHeight, zoom)
  const displayWidth = imageSize.width * baseScale
  const displayHeight = imageSize.height * baseScale
  const stageWidth = (frameWidth + 48) * stageScale
  const stageHeight = (frameHeight + 32) * stageScale
  const close = () => { tokenRef.current += 1; onCancel() }
  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (busy || preserveOriginal) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }
  }
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    setOffset(clampCropOffset(drag.offsetX + (event.clientX - drag.x) / stageScale, drag.offsetY + (event.clientY - drag.y) / stageScale, imageSize.width, imageSize.height, frameWidth, frameHeight, zoom))
  }
  const finishDrag = () => { dragRef.current = null }
  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      close()
      return
    }
    trapDialogTabKey(event.currentTarget, event)
  }
  const apply = async () => {
    if (preserveOriginal) { onApply(src); return }
    setBusy(true); setError(null)
    const token = ++tokenRef.current
    try {
      const image = imageRef.current
      if (!image || !image.complete || image.naturalWidth === 0) throw new Error('Não foi possível carregar esta imagem.')
      const canvas = document.createElement('canvas')
      const outputSize = getCropOutputSize(image.naturalWidth, image.naturalHeight, frameWidth, frameHeight, outputWidth, outputHeight, zoom)
      canvas.width = outputSize.width; canvas.height = outputSize.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Não foi possível processar esta imagem.')
      const scale = coverScale(image.naturalWidth, image.naturalHeight, frameWidth, frameHeight, zoom) * (outputSize.width / frameWidth)
      const drawWidth = image.naturalWidth * scale
      const drawHeight = image.naturalHeight * scale
      context.translate(outputSize.width / 2 + offset.x * outputSize.width / frameWidth, outputSize.height / 2 + offset.y * outputSize.height / frameHeight)
      context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
      const result = canvas.toDataURL('image/webp', 0.92)
      if (token === tokenRef.current) onApply(result)
    } catch (reason) {
      if (token === tokenRef.current) { setError(reason instanceof Error ? reason.message : 'Não foi possível processar esta imagem.'); setBusy(false) }
    }
  }

  const maskId = `crop-mask-${React.useId().replace(/:/g, '')}`
  const cropLeft = (frameWidth + 48) / 2 - frameWidth / 2
  const cropTop = (frameHeight + 32) / 2 - frameHeight / 2
  return <div ref={overlayRef} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`${maskId}-title`} className="mx-3 flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-auto rounded-xl border border-border bg-background-secondary shadow-2xl" onKeyDown={handleDialogKeyDown}>
      <header className="flex items-center justify-between border-b border-border px-5 py-4"><h2 id={`${maskId}-title`} className="text-base font-semibold text-text-primary">{title}</h2><button ref={closeButtonRef} onClick={close} className="text-text-secondary hover:text-text-primary" aria-label="Fechar edição"><X size={18} /></button></header>
      <div className="flex min-h-[190px] items-center justify-center overflow-hidden bg-background-primary py-4">
        <div className="relative touch-none select-none" style={{ width: stageWidth, height: stageHeight }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
          <div className="absolute left-1/2 top-1/2 origin-center" style={{ width: frameWidth + 48, height: frameHeight + 32, transform: `translate(-50%, -50%) scale(${stageScale})`, overflow: 'hidden' }}>
            <div role="group" tabIndex={0} aria-label="Área de recorte; use as setas do teclado para mover" onKeyDown={(event) => { const step = event.shiftKey ? 20 : 5; const delta = { x: event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0, y: event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0 }; if (delta.x || delta.y) { event.preventDefault(); setOffset((value) => clampCropOffset(value.x + delta.x, value.y + delta.y, imageSize.width, imageSize.height, frameWidth, frameHeight, zoom)) } }} className="absolute inset-0 overflow-hidden bg-[#111] outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <img ref={imageRef} src={src} alt="Prévia do recorte" draggable={false} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none" style={{ width: displayWidth, height: displayHeight, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }} />
              <svg className="pointer-events-none absolute inset-0" width={frameWidth + 48} height={frameHeight + 32} aria-hidden="true">
                <defs><mask id={maskId}><rect width="100%" height="100%" fill="white" />{shape === 'circle' ? <circle cx={(frameWidth + 48) / 2} cy={(frameHeight + 32) / 2} r={frameHeight / 2} fill="black" /> : <rect x={cropLeft} y={cropTop} width={frameWidth} height={frameHeight} fill="black" />}</mask></defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,.6)" mask={`url(#${maskId})`} />
                {shape === 'circle' ? <circle cx={(frameWidth + 48) / 2} cy={(frameHeight + 32) / 2} r={frameHeight / 2} fill="none" stroke="rgba(255,255,255,.5)" /> : <rect x={cropLeft} y={cropTop} width={frameWidth} height={frameHeight} fill="none" stroke="rgba(255,255,255,.5)" />}
              </svg>
            </div>
          </div>
        </div>
      </div>
      {!preserveOriginal && <div className="flex items-center gap-3 px-5 py-4"><label htmlFor={`${maskId}-zoom`} className="text-sm text-zinc-400">Zoom</label><input id={`${maskId}-zoom`} type="range" min={100} max={300} value={Math.round(zoom * 100)} onChange={(event) => { const nextZoom = clampCropZoom(Number(event.target.value) / 100); setZoom(nextZoom); setOffset((value) => clampCropOffset(value.x, value.y, imageSize.width, imageSize.height, frameWidth, frameHeight, nextZoom)) }} className="flex-1 accent-violet-500" aria-label="Zoom da imagem" /><button className="text-sm text-violet-400 hover:text-violet-300" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }}>Redefinir</button></div>}
      {preserveOriginal && <p className="px-5 text-sm text-text-secondary">GIFs animados serão enviados sem recorte para preservar a animação.</p>}
      {error && <p role="alert" className="px-5 text-sm text-red-300">{error}</p>}
      <footer className="flex justify-end gap-2 px-5 py-4"><Button variant="ghost" size="sm" onClick={close}>Cancelar</Button><Button variant="primary" size="sm" onClick={() => void apply()} loading={busy} disabled={Boolean(error)}>Aplicar</Button></footer>
    </section>
  </div>
}

export default ImageCropModal
