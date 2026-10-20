import React from 'react'

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CenteredPage: React.FC<SurfaceProps> = ({ children, className = '', ...props }) => (
  <div className={['h-full overflow-y-auto overflow-x-hidden px-5 py-5', className].join(' ')} {...props}>
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-5">
      {children}
    </div>
  </div>
)

export const WidePage: React.FC<SurfaceProps> = ({ children, className = '', ...props }) => (
  <div className={['h-full overflow-y-auto overflow-x-hidden px-5 py-5', className].join(' ')} {...props}>
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5">
      {children}
    </div>
  </div>
)

export const ContentSectionCard: React.FC<SurfaceProps> = ({ children, className = '', ...props }) => (
  <section className={['anceryx-card', className].join(' ')} {...props}>
    {children}
  </section>
)

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ eyebrow, title, description, action }) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0">
      {eyebrow && (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          {eyebrow}
        </p>
      )}
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
)

interface ActionRowProps {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  meta?: React.ReactNode
  action?: React.ReactNode
  muted?: boolean
}

export const ActionRow: React.FC<ActionRowProps> = ({ icon, title, description, meta, action, muted }) => (
  <div className={['anceryx-row', muted ? 'opacity-60' : ''].join(' ')}>
    <div className="flex min-w-0 items-center gap-3">
      {icon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-background-tertiary text-text-secondary">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{title}</p>
        {description && <div className="mt-0.5 text-xs leading-relaxed text-text-secondary">{description}</div>}
        {meta && <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-secondary">{meta}</div>}
      </div>
    </div>
    {action && <div className="ml-3 shrink-0">{action}</div>}
  </div>
)

interface StatCardProps {
  label: string
  value: React.ReactNode
  detail?: string
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, detail }) => (
  <div className="rounded-lg border border-border bg-background-secondary px-4 py-3">
    <p className="text-xs text-text-secondary">{label}</p>
    <p className="mt-1 text-lg font-semibold text-text-primary">{value}</p>
    {detail && <p className="mt-0.5 text-xs text-text-secondary">{detail}</p>}
  </div>
)
