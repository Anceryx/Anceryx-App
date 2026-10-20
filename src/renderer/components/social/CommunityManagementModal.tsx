import React from 'react'
import { X } from 'lucide-react'

export interface CommunityManagementSection {
  id: string
  label: string
}

interface CommunityManagementModalProps {
  communityName: string
  sections: CommunityManagementSection[]
  activeSection: string
  onSelectSection: (section: string) => void
  onClose: () => void
  children: React.ReactNode
}

const CommunityManagementModal: React.FC<CommunityManagementModalProps> = ({
  communityName,
  sections,
  activeSection,
  onSelectSection,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 sm:p-5" role="dialog" aria-modal="true" aria-label={`Gerenciar ${communityName}`} onClick={(event) => event.target === event.currentTarget && onClose()}>
    <div className="flex h-full max-h-[900px] w-full max-w-[1400px] overflow-hidden rounded-2xl border border-border bg-background-primary shadow-2xl">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background-secondary p-3 sm:block">
        <div className="mb-4 border-b border-border px-2 pb-3">
          <p className="truncate text-sm font-semibold text-text-primary">{communityName}</p>
          <p className="text-xs text-text-secondary">Gerenciamento do Fórum</p>
        </div>
        <nav className="max-h-[calc(100%-4rem)] space-y-1 overflow-y-auto" aria-label="Seções de gerenciamento">
          {sections.map((section) => (
            <button key={section.id} type="button" onClick={() => onSelectSection(section.id)} aria-current={activeSection === section.id ? 'page' : undefined} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${activeSection === section.id ? 'bg-accent/15 font-semibold text-text-primary' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}>
              {section.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-text-primary sm:text-lg">Painel do Fórum</h2>
            <nav className="mt-1 flex gap-1 overflow-x-auto sm:hidden" aria-label="Seções de gerenciamento">
              {sections.map((section) => <button key={section.id} type="button" onClick={() => onSelectSection(section.id)} aria-current={activeSection === section.id ? 'page' : undefined} className={`shrink-0 rounded-md px-2 py-1 text-xs ${activeSection === section.id ? 'bg-accent/15 text-text-primary' : 'text-text-secondary'}`}>{section.label}</button>)}
            </nav>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-2 text-text-secondary hover:bg-white/10 hover:text-text-primary" aria-label="Fechar gerenciamento"><X size={18} /></button>
        </header>
        <section className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 anceryx-scroll">
          {children}
        </section>
      </main>
    </div>
  </div>
)

export default CommunityManagementModal
