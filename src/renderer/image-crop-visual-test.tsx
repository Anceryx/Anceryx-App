import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import ImageCropModal from './components/ui/ImageCropModal'
import './index.css'

function makeQuadrantImage() {
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 600
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ed2525'; context.fillRect(0, 0, 450, 300)
  context.fillStyle = '#21c55d'; context.fillRect(450, 0, 450, 300)
  context.fillStyle = '#2563eb'; context.fillRect(0, 300, 450, 300)
  context.fillStyle = '#facc15'; context.fillRect(450, 300, 450, 300)
  return canvas.toDataURL('image/png')
}

function App() {
  const [source] = useState(makeQuadrantImage)
  const [result, setResult] = useState<string | null>(null)
  const [checks, setChecks] = useState<string[]>([])
  const inspect = (url: string) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.drawImage(image, 0, 0)
      const samples = [[0.25, 0.25, 'vermelho'], [0.75, 0.25, 'verde'], [0.25, 0.75, 'azul'], [0.75, 0.75, 'amarelo']] as const
      const failures = samples.filter(([x, y, color]) => {
        const [r, g, b] = context.getImageData(Math.floor(image.naturalWidth * x), Math.floor(image.naturalHeight * y), 1, 1).data
        if (color === 'vermelho') return r < 150 || g > 110 || b > 110
        if (color === 'verde') return g < 130 || r > 110 || b > 130
        if (color === 'azul') return b < 130 || r > 100 || g > 130
        return r < 150 || g < 130 || b > 130
      })
      const newChecks = [`Exportação: ${image.naturalWidth}×${image.naturalHeight}`, `Quadrantes detectados: ${4 - failures.length}/4`, 'Confira visualmente a imagem resultante abaixo.']
      if (failures.length) newChecks.push('Falha: a saída não preservou todos os quadrantes esperados.')
      setChecks(newChecks)
      setResult(url)
    }
    image.onerror = () => setChecks(['Falha: não foi possível reabrir a imagem exportada.'])
    image.src = url
  }
  return <main className="min-h-screen bg-background-primary p-6 text-text-primary">
    <h1 className="mb-2 text-xl font-semibold">Teste visual do recorte</h1>
    <p className="mb-4 max-w-2xl text-sm text-text-secondary">O editor abaixo é o mesmo componente usado nos banners de perfil e de Fórum. Arraste a imagem, altere o zoom e aplique. A saída é reaberta e comparada por pixels.</p>
    {!result && <ImageCropModal src={source} shape="rect" aspect={16 / 9} outputWidth={1920} outputHeight={1080} title="Teste de banner 16:9" onApply={inspect} onCancel={() => setChecks(['Teste cancelado.'])} />}
    {result && <section className="mx-auto max-w-3xl space-y-4"><img src={result} alt="Recorte exportado" className="w-full border border-white/30" /><ul className="list-disc pl-6 text-sm">{checks.map((check) => <li key={check}>{check}</li>)}</ul><button className="rounded bg-violet-700 px-4 py-2" onClick={() => { setResult(null); setChecks([]) }}>Repetir teste</button></section>}
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)