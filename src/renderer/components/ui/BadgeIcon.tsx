import React from 'react'
import type { Badge } from '@/types/social'
import anceryxPlus from '@/assets/badges/anceryx+.svg'
import moderator from '@/assets/badges/moderator.svg'
import developer from '@/assets/badges/developer.svg'
import cometZero from '@/assets/badges/comet-zero.svg'
import blackNugget from '@/assets/badges/black-nugget.svg'
import verified from '@/assets/badges/verified.svg'
import initialSupporter from '@/assets/badges/initial-supporter.svg'
import earlySupporter from '@/assets/badges/early-supporter.svg'
import bugHunter from '@/assets/badges/bug-hunter.svg'
import { API_BASE_URL } from '@/services/apiClient'

const BADGE_ASSETS: Record<string, string> = {
  'anceryx-plus': anceryxPlus,
  moderator,
  developer,
  'comet-zero': cometZero,
  'black-nugget': blackNugget,
  verified,
  'initial-supporter': initialSupporter,
  'early-supporter': earlySupporter,
  'bug-hunter': bugHunter,
}

export interface BadgeIconProps {
  badge: Badge
  /** Tamanho do ícone em px. Padrão: 16 */
  size?: number
  className?: string
}

/** Renderiza somente os SVGs oficiais empacotados junto ao aplicativo. */
const BadgeIcon: React.FC<BadgeIconProps> = ({ badge, size = 16, className = '' }) => {
  const asset = BADGE_ASSETS[badge.id]
  const src = asset || `${API_BASE_URL}/badges/${encodeURIComponent(badge.id)}/icon.svg`

  return <span className={`motion-control relative group inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }} aria-label={badge.label} role="img">
    <img src={src} alt="" width={size} height={size} className="h-full w-full object-contain" draggable={false} />
    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-background-elevated px-2 py-0.5 text-[11px] font-medium text-text-primary opacity-0 shadow-lg transition-all duration-100 group-hover:scale-100 group-hover:opacity-100" role="tooltip">{badge.label}</span>
  </span>
}

export default BadgeIcon
