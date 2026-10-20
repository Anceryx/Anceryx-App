import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { ContentSectionCard, SectionHeader } from '@/components/ui/index'
import type { LicenseManifest, LicenseRecord } from '../../../../shared/licenseTypes'

const emptyManifest: LicenseManifest = { generatedAt: '', source: 'package-lock.json', records: [], warnings: [], legalNotes: [] }

const LicencasSection: React.FC = () => {
  const [manifest, setManifest] = useState<LicenseManifest>(emptyManifest)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    void window.electronAPI?.licenses.getManifest().then((next) => setManifest(next)).catch(() => undefined)
  }, [])

  const records = useMemo(() => manifest.records.filter((record) => `${record.name} ${record.license} ${record.version}`.toLowerCase().includes(query.toLowerCase())), [manifest.records, query])
  const renderRecord = (record: LicenseRecord) => {
    const open = selected === `${record.name}@${record.version}`
    return <div key={`${record.name}@${record.version}`} className="border-b border-border last:border-b-0">
      <button type="button" onClick={() => setSelected(open ? null : `${record.name}@${record.version}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-text-primary">{record.name}</span><span className="text-xs text-text-secondary">{record.version} · {record.license}</span></span>
        <span className="rounded-full border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-text-secondary">{record.scope}</span><ChevronDown size={16} className={open ? 'rotate-180 text-accent' : 'text-text-secondary'} />
      </button>
      {open && <div className="space-y-3 bg-background-tertiary px-4 pb-4 pt-1 text-xs leading-relaxed text-text-secondary">
        {record.author && <p><span className="font-semibold text-text-primary">Copyright/autor:</span> {record.author}</p>}
        {record.notice && <p className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-amber-100">{record.notice}</p>}
        {record.repository && <p className="break-all"><span className="font-semibold text-text-primary">Origem:</span> {record.repository}</p>}
        {record.licenseText ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded border border-border bg-background-secondary p-3 font-mono text-[11px]">{record.licenseText}</pre> : <p>O texto integral não foi incluído no pacote instalado; consulte o repositório de origem antes de redistribuir.</p>}
      </div>}
    </div>
  }

  return <div className="space-y-5">
    <SectionHeader eyebrow="Sobre a Anceryx" title="Licenças de código aberto" description="Inventário offline gerado no build a partir das versões efetivamente instaladas. Não depende de API externa." />
    <ContentSectionCard className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background-tertiary px-3 py-2"><Search size={16} className="text-text-secondary" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar biblioteca ou licença" className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary" /></div>
      <div className="overflow-hidden rounded-lg border border-border">{records.length > 0 ? records.map(renderRecord) : <p className="p-4 text-sm text-text-secondary">Nenhum registro disponível. Execute um build para gerar o inventário.</p>}</div>
      {(manifest.warnings?.length ?? 0) > 0 && <p className="text-xs leading-relaxed text-amber-200">O manifesto contém {manifest.warnings?.length} aviso(s) de metadados ou textos de licença ausentes; eles exigem revisão antes de uma distribuição.</p>}
      {manifest.legalNotes.map((note) => <p key={note} className="text-[11px] leading-relaxed text-text-secondary">{note}</p>)}
    </ContentSectionCard>
  </div>
}

export default LicencasSection
