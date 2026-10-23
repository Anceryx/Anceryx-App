import React, { useEffect, useState } from 'react'
import {
  User, Shield, Bell, CreditCard, Sliders, LogOut, Mic, Link2, Monitor, History, Info,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { resolveAvatarName } from '@/utils/avatar'
import { useSocialStore } from '@/store/socialStore'
import { Avatar } from '@/components/ui/index'
import { useNavigate } from 'react-router-dom'
import { ANCERYX_PRIVACY_URL, ANCERYX_TERMS_URL } from '@/lib/premium'
import { openExternalUrl } from '@/platform/platform'
import { realtimeClient } from '@/services/realtimeClient'
import { useTranslation, type TranslationKey } from '@/i18n'

export type SettingsSection =
  | 'conta'
  | 'perfil'
  | 'seguranca'
  | 'conexoes-login'
  | 'sessoes-dispositivos'
  | 'ultimos-logins'
  | 'dados-privacidade'
  | 'notificacoes'
  | 'cobranca'
  | 'experiencia'
  | 'voz'
  | 'sobre'

interface NavGroup {
  labelKey: TranslationKey
  items: { id: SettingsSection; labelKey: TranslationKey; icon: React.ReactNode }[]
}

export const SETTINGS_NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'settings.group.user',
    items: [
      { id: 'conta', labelKey: 'settings.account', icon: <User size={16} /> },
      { id: 'perfil', labelKey: 'settings.profile', icon: <User size={16} /> },
      { id: 'seguranca', labelKey: 'settings.security', icon: <Shield size={16} /> },
      { id: 'conexoes-login', labelKey: 'settings.loginConnections', icon: <Link2 size={16} /> },
      { id: 'sessoes-dispositivos', labelKey: 'settings.sessions', icon: <Monitor size={16} /> },
      { id: 'ultimos-logins', labelKey: 'settings.loginHistory', icon: <History size={16} /> },
      { id: 'dados-privacidade', labelKey: 'settings.privacy', icon: <Shield size={16} /> },
      { id: 'notificacoes', labelKey: 'settings.notifications', icon: <Bell size={16} /> },
      { id: 'cobranca', labelKey: 'settings.billing', icon: <CreditCard size={16} /> },
    ],
  },
  {
    labelKey: 'settings.group.app',
    items: [
      { id: 'experiencia', labelKey: 'settings.experience', icon: <Sliders size={16} /> },
      { id: 'voz', labelKey: 'settings.voice', icon: <Mic size={16} /> },
      { id: 'sobre', labelKey: 'settings.about', icon: <Info size={16} /> },
    ],
  },
]

interface SettingsNavProps {
  active: SettingsSection
  onSelect: (s: SettingsSection) => void
  onClose: () => void
}

const SettingsNav: React.FC<SettingsNavProps> = ({ active, onSelect, onClose }) => {
  const t = useTranslation()
  const user        = useAuthStore((s) => s.user)
  const logout      = useAuthStore((s) => s.logout)
  const userProfile = useSocialStore((s) => s.userProfile)
  const displayName = resolveAvatarName(userProfile.displayName, user?.name, user?.username)
  const resetSocial = useSocialStore((s) => s.reset)
  const navigate    = useNavigate()
  const [appVersion, setAppVersion] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    void window.electronAPI?.getVersion().then((version) => {
      if (mounted) setAppVersion(version)
    })
    return () => {
      mounted = false
    }
  }, [])

  const handleLogout = async () => {
    onClose()
    await logout()
    realtimeClient.disconnect()
    resetSocial()
    navigate('/login')
  }

  return (
    <div className="w-64 bg-background-secondary flex flex-col shrink-0 border-r border-border overflow-y-auto anceryx-scroll">
      {/* User info */}
      {user && (
        <div className="px-4 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar} name={displayName} size="md" />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-text-primary truncate">{displayName}</p>
              <p className="text-xs text-text-secondary truncate">@{userProfile.handle || user.username}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-5">
        {SETTINGS_NAV_GROUPS.map((group) => (
          <div key={group.labelKey}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/70 px-2 mb-1">
              {t(group.labelKey)}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = active === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={[
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left',
                      isActive
                        ? 'bg-accent/18 text-text-primary border-l-2 border-accent pl-[10px]'
                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary border-l-2 border-transparent pl-[10px]',
                    ].join(' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {t(item.labelKey)}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 border-t border-border pt-4">
        <button
          onClick={() => void handleLogout()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut size={16} />
          {t('common.logout')}
        </button>

        <div className="mt-4 px-1 text-[10px] text-zinc-500">
          <p className="leading-relaxed">{t('settings.appVersionLabel', { version: appVersion ?? '...' })}</p>
          <div className="mt-1 flex items-center gap-3">
            <button
              onClick={() => openExternalUrl(ANCERYX_PRIVACY_URL)}
              className="cursor-pointer hover:text-accent-secondary transition-colors"
            >
              {t('settings.privacy')}
            </button>
            <button
              onClick={() => openExternalUrl(ANCERYX_TERMS_URL)}
              className="cursor-pointer hover:text-accent-secondary transition-colors"
            >
              {t('settings.terms')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsNav
