import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import SettingsNav, { SETTINGS_NAV_GROUPS, type SettingsSection } from './SettingsNav'
import ContaSection              from './sections/ContaSection'
import PerfilSection             from './sections/PerfilSection'
import DadosPrivacidadeSection   from './sections/DadosPrivacidadeSection'
import NotificacoesSection       from './sections/NotificacoesSection'
import CobrancaSection           from './sections/CobrancaSection'
import ExperienciaSection        from './sections/ExperienciaSection'
import VozSection                from './sections/VozSection'
import SegurancaSection          from './sections/SegurancaSection'
import ConexoesLoginSection      from './sections/ConexoesLoginSection'
import SessoesDispositivosSection from './sections/SessoesDispositivosSection'
import UltimosLoginsSection      from './sections/UltimosLoginsSection'
import SobreSection              from './sections/SobreSection'

const SECTION_TITLES: Record<SettingsSection, string> = {
  'conta':             'Conta',
  'perfil':            'Perfil',
  'seguranca':         'Segurança',
  'conexoes-login':    'Conexões de Login',
  'sessoes-dispositivos': 'Sessões e dispositivos',
  'ultimos-logins':    'Últimos logins',
  'dados-privacidade': 'Dados e Privacidade',
  'notificacoes':      'Notificações',
  'cobranca':          'Cobrança',
  'experiencia':       'Experiência',
  'voz':               'Voz e Dispositivos',
  'sobre':             'Sobre a Anceryx',
}

export interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  initialSection?: SettingsSection
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialSection }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('conta')
  const [mobileSection, setMobileSection] = useState<SettingsSection | null>(null)

  // Fecha com Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Reseta seção ao abrir — usa initialSection quando fornecido
  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection ?? 'conta')
      setMobileSection(initialSection ?? null)
    }
  }, [isOpen, initialSection])

  if (!isOpen) return null

  const renderSection = () => {
    switch (activeSection) {
      case 'conta':             return <ContaSection />
      case 'perfil':            return <PerfilSection />
      case 'seguranca':         return <SegurancaSection />
      case 'conexoes-login':    return <ConexoesLoginSection />
      case 'sessoes-dispositivos': return <SessoesDispositivosSection />
      case 'ultimos-logins':    return <UltimosLoginsSection />
      case 'dados-privacidade': return <DadosPrivacidadeSection />
      case 'notificacoes':      return <NotificacoesSection />
      case 'cobranca':          return <CobrancaSection />
      case 'experiencia':       return <ExperienciaSection />
      case 'voz':               return <VozSection />
      case 'sobre':             return <SobreSection />
    }
  }

  return (
    /* Overlay fullscreen */
    <div
      className="motion-backdrop-in fixed inset-0 z-50 flex bg-black/70 p-0 md:p-4"
      aria-modal="true"
      role="dialog"
      aria-label="Configurações"
    >
      {/* Modal container */}
      <div className="motion-surface-in mx-auto flex h-[100dvh] w-full max-w-[1160px] overflow-hidden border-border bg-background-primary shadow-2xl md:h-full md:rounded-2xl md:border">

        {/* Coluna esquerda — navegação */}
        <div className="hidden md:flex">
          <SettingsNav active={activeSection} onSelect={setActiveSection} onClose={onClose} />
        </div>

        <div key={mobileSection ? 'list-hidden' : 'list'} className={["motion-view-in min-w-0 flex-1 flex-col md:hidden", mobileSection ? 'hidden' : 'flex'].join(' ')}>
          <header className="safe-area-top flex min-h-16 shrink-0 items-center justify-between border-b border-border px-4">
            <h2 className="text-xl font-bold text-text-primary">Configurações</h2>
            <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl text-text-secondary hover:bg-white/10 hover:text-text-primary" aria-label="Fechar configurações"><X size={21} /></button>
          </header>
          <div className="mobile-scroll flex-1 overflow-y-auto overflow-x-hidden pb-[max(1rem,env(safe-area-inset-bottom))]">
            {SETTINGS_NAV_GROUPS.map((group) => (
              <section key={group.label} className="border-b border-border px-3 py-4 last:border-b-0">
                <h3 className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70">{group.label}</h3>
                <div className="flex flex-col gap-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setActiveSection(item.id); setMobileSection(item.id) }}
                      className="motion-control flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-text-primary hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background-tertiary text-text-secondary">{item.icon}</span>
                      <span className="min-w-0 flex-1 break-words">{item.label}</span>
                      <ChevronRight size={18} className="shrink-0 text-text-secondary/70" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Coluna direita — conteúdo */}
        <div className="hidden min-w-0 flex-1 flex-col overflow-hidden md:flex">

          {/* Header da seção */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-border shrink-0">
            <h2 className="text-xl font-bold text-text-primary">
              {SECTION_TITLES[activeSection]}
            </h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors p-2 rounded-md hover:bg-white/10"
              aria-label="Fechar configurações"
            >
              <X size={20} />
            </button>
          </div>

          {/* Conteúdo com scroll */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-7 py-6 anceryx-scroll">
            <div className="mx-auto w-full max-w-[820px]">
              {renderSection()}
            </div>
        </div>

        <div key={mobileSection ?? 'section-hidden'} className={["motion-view-forward min-w-0 flex-1 flex-col overflow-hidden md:hidden", mobileSection ? 'flex' : 'hidden'].join(' ')}>
          <header className="safe-area-top flex min-h-16 shrink-0 items-center gap-2 border-b border-border px-3">
            <button type="button" onClick={() => setMobileSection(null)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-text-secondary hover:bg-white/10 hover:text-text-primary" aria-label="Voltar para categorias de configurações"><ChevronLeft size={22} /></button>
            <h2 className="min-w-0 flex-1 break-words text-lg font-bold text-text-primary">{mobileSection ? SECTION_TITLES[mobileSection] : 'Configurações'}</h2>
            <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-text-secondary hover:bg-white/10 hover:text-text-primary" aria-label="Fechar configurações"><X size={21} /></button>
          </header>
          <div className="mobile-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5">
            <div className="mx-auto w-full max-w-[820px] break-words">{mobileSection && renderSection()}</div>
          </div>
        </div>

      </div>
      </div>
    </div>
  )
}

export default SettingsModal
