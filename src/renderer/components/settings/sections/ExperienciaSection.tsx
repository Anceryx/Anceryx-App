import React, { useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { hasAnceryxPlus } from '@/lib/premium'
import { Lock } from 'lucide-react'
import type { Theme } from '@/types/ui'
import ToggleSwitch from '../ToggleSwitch'
import { useTranslation } from '@/i18n'
import { getKeyboardShortcuts } from '@/utils/keyboardShortcuts'
import { communityVoiceClient } from '@/services/webrtc/communityVoiceClient'

// â”€â”€ helpers de layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-base font-semibold text-text-primary mt-8 mb-2 first:mt-0">{children}</h3>
)

interface ToggleRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}
const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-border last:border-0">
    <div className="flex-1 pr-8">
      <p className="text-sm text-text-primary">{label}</p>
      {description && <p className="text-xs text-text-disabled mt-0.5">{description}</p>}
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} ariaLabel={label} />
  </div>
)

interface SliderRowProps {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
  unit?: string
}
const SliderRow: React.FC<SliderRowProps> = ({ label, value, min = 0, max = 100, onChange, unit = '%' }) => (
  <div className="py-3.5 border-b border-border last:border-0">
    <div className="flex justify-between mb-2">
      <p className="text-sm text-text-primary">{label}</p>
      <span className="text-xs text-text-secondary">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-purple-500 cursor-pointer h-1.5"
      aria-label={label}
    />
  </div>
)

interface SelectRowProps {
  label: string
  description?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}
const SelectRow: React.FC<SelectRowProps> = ({ label, description, value, options, onChange }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 py-3.5 border-b border-border last:border-0">
    <div className="flex-1 pr-8">
      <p className="text-sm text-text-primary">{label}</p>
      {description && <p className="text-xs text-text-disabled mt-0.5">{description}</p>}
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-full sm:w-auto sm:min-w-40 bg-background-primary border border-border text-text-primary text-xs rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
      aria-label={label}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
)

const ShortcutList: React.FC = () => {
  const t = useTranslation()
  const [query, setQuery] = useState('')
  const [voiceConnected, setVoiceConnected] = useState(communityVoiceClient.status === 'connected')
  React.useEffect(() => communityVoiceClient.subscribe(() => setVoiceConnected(communityVoiceClient.status === 'connected')), [])
  const shortcuts = getKeyboardShortcuts().map((shortcut) => {
    const labels = { label: t(shortcut.labelKey), description: t(shortcut.descriptionKey) }
    const keys = ['Ctrl', ...(shortcut.shift ? ['Shift'] : []), shortcut.code.replace(/^Key/, '').replace('Comma', ',').replace('Slash', '/')]
    return { ...shortcut, ...labels, keys }
  }).filter((shortcut) => `${shortcut.label} ${shortcut.description} ${shortcut.keys.join(' ')} ${shortcut.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const groups = [
    { id: 'navigation', label: t('experience.shortcut.navigation') },
    { id: 'voice', label: t('experience.shortcut.voice') },
  ] as const

  return <section className="space-y-4" aria-label={t('experience.shortcuts')}>
    <div><SectionTitle>{t('experience.shortcuts')}</SectionTitle><p className="text-xs text-text-secondary">{t('experience.shortcut.sectionDescription')}</p></div>
    <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('experience.searchShortcuts')} aria-label={t('experience.searchShortcuts')} className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60" />
    {groups.map((group) => {
      const entries = shortcuts.filter((shortcut) => shortcut.category === group.id)
      if (!entries.length) return null
      return <div key={group.id} className="overflow-hidden rounded-xl border border-border bg-background-secondary">
        <h4 className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">{group.label}</h4>
        <div className="divide-y divide-border">{entries.map((shortcut) => <article key={shortcut.id} className="grid min-w-0 gap-2 px-4 py-3 sm:grid-cols-[minmax(9rem,1fr)_auto_minmax(8rem,0.8fr)] sm:items-center">
          <div className="min-w-0"><h5 className="break-words text-sm font-medium text-text-primary">{shortcut.label}</h5><p className="mt-0.5 text-xs text-text-secondary">{shortcut.description}</p></div>
          <div className="flex flex-wrap gap-1" aria-label={shortcut.keys.join(' + ')}>{shortcut.keys.map((key) => <kbd key={key} className="min-w-7 rounded border border-border bg-background-primary px-2 py-1 text-center text-xs font-medium text-text-primary">{key}</kbd>)}</div>
          <span className={`text-xs ${shortcut.category === 'voice' && !voiceConnected ? 'text-text-secondary' : 'text-emerald-300'}`}>{shortcut.category === 'voice' && !voiceConnected ? t('experience.shortcut.unavailable') : shortcut.category === 'voice' ? t('experience.shortcut.available') : t('experience.shortcut.app')}</span>
        </article>)}</div>
      </div>
    })}
    {shortcuts.length === 0 && <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-text-secondary">{t('experience.shortcut.empty')}</p>}
  </section>
}

// â”€â”€ componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ExperienciaSection: React.FC = () => {
  const t = useTranslation()
  const tFn = t
  const locale = useUIStore((s) => s.locale)
  const setLocale = useUIStore((s) => s.setLocale)
  const timeFormat = useUIStore((s) => s.timeFormat)
  const setTimeFormat = useUIStore((s) => s.setTimeFormat)
  const dateFormat = useUIStore((s) => s.dateFormat)
  const setDateFormat = useUIStore((s) => s.setDateFormat)
  const experienceSection = useUIStore((s) => s.experienceSection)
  const setExperienceSection = useUIStore((s) => s.setExperienceSection)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const sidebarMode = useUIStore((s) => s.sidebarMode)
  const setSidebarMode = useUIStore((s) => s.setSidebarMode)
  const reduzirMotion = useUIStore((s) => s.reduceMotion)
  const setReduceMotion = useUIStore((s) => s.setReduceMotion)
  const user      = useAuthStore((s) => s.user)
  const subscriptionVerified = useAuthStore((s) => s.subscriptionVerified)
  const isPremium = subscriptionVerified && hasAnceryxPlus(user?.subscription)

  // Aviso inline para temas premium bloqueados
  const [premiumNotice, setPremiumNotice] = useState(false)
  // Aviso inline para qualidade de stream bloqueada
  const [streamPremiumNotice, setStreamPremiumNotice] = useState(false)
  // Audio settings
  const [mic,        setMic]        = useState('default')
  const [volMic,     setVolMic]     = useState(80)
  const [saida,      setSaida]      = useState('default')
  const [volSaida,   setVolSaida]   = useState(100)
  // Streaming and calls
  const [reducaoRuido, setReducaoRuido] = useState(true)
  const [ecoCancelado, setEcoCancelado] = useState(true)
  const [videoHD,      setVideoHD]      = useState(false)
  const [qualStream,   setQualStream]   = useState('720p')

  // Acessibilidade
  const [tamChat,        setTamChat]        = useState<'sm' | 'md' | 'lg'>('md')
  const [sublinharLinks, setSublinharLinks] = useState(true)
  const [altoContraste,  setAltoContraste]  = useState(false)

  const MIC_OPTIONS    = [{ value: 'default', label: t('experience.microphoneDefault') }, { value: 'usb', label: t('experience.microphoneUsb') }, { value: 'webcam', label: t('experience.microphoneWebcam') }]
  const SAIDA_OPTIONS  = [{ value: 'default', label: t('experience.speakersDefault') }, { value: 'fones', label: t('experience.headphones') }]
  const STREAM_OPTIONS = [
    { value: '720p',  label: '720p' },
    { value: '1080p', label: '1080p' },
    { value: '1440p', label: isPremium ? '1440p' : t('experience.premiumResolution', { resolution: '1440p' }) },
    { value: '2160p', label: isPremium ? '2160p (4K)' : t('experience.premiumResolution4k') },
  ]

  return (
    <div className="max-w-3xl space-y-5">
      <nav className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background-secondary p-1 sm:grid-cols-4" aria-label={t('experience.sections')}>
        {([
          ['appearance', 'experience.appearance'],
          ['language-date-time', 'experience.languageDateTime'],
          ['shortcuts', 'experience.shortcuts'],
          ['preferences', 'experience.preferences'],
        ] as const).map(([section, key]) => <button key={section} type="button" onClick={() => setExperienceSection(section)} aria-current={experienceSection === section ? 'page' : undefined} className={`min-h-10 rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${experienceSection === section ? 'bg-accent/15 text-text-primary' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}>{t(key)}</button>)}
      </nav>

      {experienceSection === 'appearance' && <>

      <SectionTitle>{t('experience.sidebar')}</SectionTitle>
      <div className="bg-background-secondary rounded-lg px-5 border border-border">
        <SelectRow
          label={t('experience.sidebarBehavior')}
          description={t('experience.sidebarDescription')}
          value={sidebarMode}
          options={[{ value: 'automatic', label: t('experience.automatic') }, { value: 'manual', label: t('experience.manual') }]}
          onChange={(value) => setSidebarMode(value === 'manual' ? 'manual' : 'automatic')}
        />
      </div>

      </>}

      {experienceSection === 'language-date-time' && <>
        <SectionTitle>{t('experience.languageDateTime')}</SectionTitle>
        <div className="rounded-lg border border-border bg-background-secondary px-5">
          <SelectRow label={t('experience.language')} description={t('experience.language.help')} value={locale} options={[{ value: 'pt-BR', label: t('experience.locale.pt') }, { value: 'en-US', label: t('experience.locale.en') }, { value: 'es-ES', label: t('experience.locale.es') }]} onChange={(value) => setLocale(value as typeof locale)} />
          <SelectRow label={t('experience.timeFormat')} value={timeFormat} options={[{ value: 'auto', label: t('experience.hour.auto') }, { value: '12h', label: t('experience.hour.12') }, { value: '24h', label: t('experience.hour.24') }]} onChange={(value) => setTimeFormat(value as typeof timeFormat)} />
          <SelectRow label={t('experience.dateFormat')} value={dateFormat} options={[{ value: 'auto', label: t('experience.date.auto') }, { value: 'dmy', label: t('experience.date.dmy') }, { value: 'mdy', label: t('experience.date.mdy') }, { value: 'ymd', label: t('experience.date.ymd') }]} onChange={(value) => setDateFormat(value as typeof dateFormat)} />
          <p className="py-3 text-xs text-text-secondary">{t('experience.deviceTimeZone')}</p>
        </div>
      </>}

      {experienceSection === 'shortcuts' && <ShortcutList />}

      {experienceSection === 'preferences' && <>
      {/* â”€â”€ Voz e Ãudio â”€â”€ */}
      <SectionTitle>{t('experience.audioHeading')}</SectionTitle>
      <div className="bg-background-secondary rounded-lg px-5 border border-border">
        <SelectRow label={t('experience.microphone')} value={mic} options={MIC_OPTIONS} onChange={setMic} />
        <SliderRow label={t('experience.microphoneVolume')} value={volMic} onChange={setVolMic} />
        <SelectRow label={t('experience.audioOutput')} value={saida} options={SAIDA_OPTIONS} onChange={setSaida} />
        <SliderRow label={t('experience.outputVolume')} value={volSaida} onChange={setVolSaida} />
      </div>
      {/* Streaming and calls */}
      <SectionTitle>{t('experience.callsHeading')}</SectionTitle>
      <div className="bg-background-secondary rounded-lg px-5 border border-border">
        <ToggleRow label={t('experience.noiseReduction')} description={t('experience.noiseDescription')}  checked={reducaoRuido} onChange={setReducaoRuido} />
        <ToggleRow label={t('experience.echoCancellation')} description={t('experience.echoDescription')}        checked={ecoCancelado} onChange={setEcoCancelado} />
        <ToggleRow label={t('experience.hdVideo')} description={t('experience.hdVideoDescription')}        checked={videoHD}      onChange={setVideoHD} />
        <SelectRow label={t('experience.streamQuality')} description={t('experience.streamDescription')}       value={qualStream} options={STREAM_OPTIONS} onChange={(v) => {
          if ((v === '1440p' || v === '2160p') && !isPremium) {
            // Show inline feedback instead of silently ignoring the selection
            setStreamPremiumNotice(true)
            setTimeout(() => setStreamPremiumNotice(false), 3000)
            return
          }
          setQualStream(v)
        }} />
        {streamPremiumNotice && (
          <div
            className="mb-2 mt-1 text-xs px-3 py-2 rounded-lg border"
            style={{
              color: 'var(--color-accent)',
              borderColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)',
              background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
            }}
          >
            {t('experience.premiumAvailable')}
          </div>
        )}
      </div>
      </>}

      {/* â”€â”€ Acessibilidade â”€â”€ */}
      {experienceSection === 'appearance' && <>
      <SectionTitle>{t('experience.accessibility')}</SectionTitle>
      <div className="bg-background-secondary rounded-lg px-5 border border-border">

        {/* Tamanho do chat */}
        <div className="py-3.5 border-b border-border">
          <p className="text-sm text-text-primary mb-3">{t('experience.chatSize')}</p>
          <div className="flex gap-2">
            {(['sm', 'md', 'lg'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTamChat(t)}
                className={[
                  'flex-1 py-2 rounded-lg border text-xs font-medium transition-colors',
                  tamChat === t
                    ? 'border-accent bg-surface-selected text-accent-secondary'
                    : 'border-border bg-background-primary text-text-secondary hover:border-border-hover',
                ].join(' ')}
              >
                {t === 'sm' ? tFn('experience.small') : t === 'md' ? tFn('experience.medium') : tFn('experience.large')}
              </button>
            ))}
          </div>
        </div>

        <ToggleRow label={t('experience.underlineLinks')} description={t('experience.underlineDescription')}       checked={sublinharLinks} onChange={setSublinharLinks} />
        <ToggleRow label={t('experience.reduceMotion')} description={t('experience.reduceMotionDescription')}    checked={reduzirMotion}  onChange={setReduceMotion} />
        <ToggleRow label={t('experience.highContrast')} description={t('experience.highContrastDescription')} checked={altoContraste}  onChange={setAltoContraste} />
      </div>
      {/* Appearance and theme */}
      <SectionTitle>{t('experience.appearance')}</SectionTitle>
      <div className="bg-background-secondary rounded-lg px-5 py-4 border border-border">
        <p className="text-sm text-text-primary mb-4">{t('experience.theme')}</p>

        {/* Aviso inline para temas premium */}
        {premiumNotice && (
          <div
            className="mb-3 text-xs px-3 py-2 rounded-lg border"
            style={{
              color: 'var(--color-accent)',
              borderColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)',
              background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
            }}
          >
            {t('experience.premiumAvailable')}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {THEME_OPTIONS.map((themeOption) => {
            const isActive  = theme === themeOption.id
            const isLocked  = themeOption.premium && !isPremium

            const handleClick = () => {
              if (isLocked) {
                setPremiumNotice(true)
                setTimeout(() => setPremiumNotice(false), 3000)
                return
              }
              setTheme(themeOption.id as Theme)
            }

            return (
              <button
                key={themeOption.id}
                onClick={handleClick}
                className={[
                  'relative rounded-xl border-2 overflow-hidden transition-all text-left',
                isActive
                    ? 'border-accent ring-1 ring-accent/50'
                    : 'border-border hover:border-border-hover',
                ].join(' ')}
                aria-pressed={isActive}
                aria-label={t('experience.theme.aria', { name: t(themeOption.labelKey), premium: themeOption.premium ? ` (${t('common.premium')})` : '' })}
              >
                {/* Preview swatches */}
                <div className="p-3" style={{ background: themeOption.previewBg }}>
                  <div className="flex h-[52px] gap-2 rounded-md p-2" style={{ background: themeOption.panel }}>
                    <div className="w-1/4 rounded-sm" style={{ background: themeOption.surface }} />
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                      <span className="text-[10px] font-semibold leading-none" style={{ color: themeOption.text }}>Aa</span>
                      <span className="h-1.5 w-4/5 rounded-full" style={{ background: themeOption.text, opacity: 0.78 }} />
                      <span className="h-1.5 w-1/2 rounded-full" style={{ background: themeOption.accent }} />
                    </div>
                  </div>
                </div>

                <div className="py-2 text-center" style={{ background: themeOption.labelBg }}>
                  <span className={[
                    'text-xs font-medium',
                    isActive ? 'text-accent-secondary' : 'text-text-secondary',
                  ].join(' ')}>
                    {t(themeOption.labelKey)}
                  </span>
                </div>

                {/* Lock overlay for premium themes */}
                {isLocked && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[11px]"
                    style={{ background: 'rgba(0,0,0,0.55)' }}
                    aria-hidden="true"
                  >
                    <Lock size={14} style={{ color: 'var(--color-accent)' }} />
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--color-accent)' }}>
                      Anceryx+
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
      </>}

    </div>
  )
}

// Theme preview config (colors are hardcoded to avoid relying on CSS vars in preview)
const THEME_OPTIONS = [
  {
    id: 'dark',
    labelKey: 'experience.theme.dark',
    premium: false,
    previewBg: '#0d0d0d',
    panel: '#18181b',
    surface: '#242424',
    text: '#ffffff',
    accent: '#8b5cf6',
    labelBg: '#1a1a1a',
  },
  {
    id: 'light',
    labelKey: 'experience.theme.light',
    premium: false,
    previewBg: '#f4f4f5',
    panel: '#ffffff',
    surface: '#e4e4e7',
    text: '#09090b',
    accent: '#7c3aed',
    labelBg: '#f4f4f5',
  },
  {
    id: 'autumn',
    labelKey: 'experience.theme.autumn',
    premium: true,
    previewBg: 'hsl(349 28% 22%)',
    panel: 'hsl(345 27% 29%)',
    surface: 'hsl(341 27% 36%)',
    text: 'hsl(350 62% 93%)',
    accent: 'hsl(347 50% 55%)',
    labelBg: 'hsl(345 27% 29%)',
  },
  {
    id: 'rose-moon',
    labelKey: 'experience.theme.roseMoon',
    premium: true,
    previewBg: 'hsl(246 24% 17%)',
    panel: 'hsl(248 24% 20%)',
    surface: 'hsl(248 21% 26%)',
    text: 'hsl(245 50% 95%)',
    accent: 'hsl(2 66% 75%)',
    labelBg: 'hsl(248 24% 20%)',
  },
] as const

export default ExperienciaSection
