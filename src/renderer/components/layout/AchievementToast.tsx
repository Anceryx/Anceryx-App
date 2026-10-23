import React, { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, ChevronRight, X } from 'lucide-react'
import { achievementApi, type PendingAchievement } from '@/services/achievementApi'
import { realtimeClient } from '@/services/realtimeClient'
import { useCallStore } from '@/store/callStore'
import { useSocialStore } from '@/store/socialStore'
import BadgeIcon from '@/components/ui/BadgeIcon'
import { useTranslation } from '@/i18n'

const AchievementToast: React.FC = () => {
  const t = useTranslation()
  const [queue, setQueue] = useState<PendingAchievement[]>([])
  const [busy, setBusy] = useState(false)
  const [safeToDisplay, setSafeToDisplay] = useState(false)
  const setActiveSection = useSocialStore((state) => state.setActiveSection)

  const refresh = useCallback(async () => {
    try {
      const result = await achievementApi.pending()
      setQueue((current) => {
        const ids = new Set(current.map((item) => item.notificationId))
        return [...current, ...result.achievements.filter((item) => !ids.has(item.notificationId))]
      })
    } catch { /* A próxima sincronização ou abertura do app tentará novamente. */ }
  }, [])

  useEffect(() => {
    void refresh()
    const unsubscribe = realtimeClient.subscribe('notification.created', (event) => {
      if (event.payload.type === 'badge.awarded') void refresh()
    })
    const poll = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 30_000)
    return () => { unsubscribe(); window.clearInterval(poll) }
  }, [refresh])

  const complete = useCallback(async (status: 'presented' | 'dismissed', all = false) => {
    const current = queue
    if (!current.length || busy) return
    setBusy(true)
    try {
      await Promise.all((all ? current : [current[0]]).map((item) => achievementApi.complete(item.notificationId, status)))
      const completed = new Set((all ? current : [current[0]]).map((item) => item.notificationId))
      setSafeToDisplay(false)
      setQueue((items) => items.filter((item) => !completed.has(item.notificationId)))
      void refresh()
    } catch { /* O cartão permanece visível e o servidor preserva a apresentação pendente. */ }
    finally { setBusy(false) }
  }, [busy, queue, refresh])

  useEffect(() => {
    if (!queue.length || busy) return
    let visibleFor = 0
    const timer = window.setInterval(() => {
      const active = document.activeElement
      const editing = active instanceof HTMLElement && (active.isContentEditable || Boolean(active.closest('input, textarea, select, [role="textbox"], form')))
      const callStatus = useCallStore.getState().callStatus
      const allowed = document.visibilityState === 'visible' && !editing && callStatus === 'idle'
      setSafeToDisplay(allowed)
      if (allowed) {
        visibleFor += 500
        if (visibleFor >= 5000) {
          window.clearInterval(timer)
          void complete('presented')
        }
      } else {
        visibleFor = 0
      }
    }, 500)
    return () => { window.clearInterval(timer) }
  }, [queue, busy, complete])

  const current = queue[0]
  if (!current || !safeToDisplay) return null
  const badge = { id: current.badgeSlug, label: current.badgeName } as React.ComponentProps<typeof BadgeIcon>['badge']

  return <section aria-live="polite" aria-label={t('achievement.new')} className="fixed bottom-5 right-5 z-[80] w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-background-elevated p-4 text-text-primary shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-right-4">
    <div className="flex items-start gap-3">
      <BadgeIcon badge={badge} size={44} className="mt-1" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent"><BadgeCheck size={14} /> {t('achievement.new')}</p>
        <h2 className="mt-1 truncate text-base font-bold">{current.badgeName}</h2>
        <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{current.badgeDescription}</p>
      </div>
      <button type="button" onClick={() => void complete('dismissed')} disabled={busy} aria-label={t('achievement.dismiss')} className="rounded-lg p-1 text-text-secondary hover:bg-background-secondary"><X size={16} /></button>
    </div>
    <div className="mt-3 flex items-center justify-between gap-2">
      <button type="button" onClick={() => { setActiveSection('perfil'); window.setTimeout(() => window.dispatchEvent(new CustomEvent('anceryx:open-achievement', { detail: { badgeSlug: current.badgeSlug } })), 50); void complete('presented') }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-accent hover:bg-background-secondary">{t('achievement.view')} <ChevronRight size={15} /></button>
      {queue.length > 1 && <div className="flex items-center gap-2"><span className="text-xs text-text-secondary">{t('achievement.pending', { count: queue.length })}</span><button type="button" onClick={() => void complete('dismissed', true)} disabled={busy} className="rounded-lg px-2 py-1 text-xs text-text-secondary hover:bg-background-secondary">{t('achievement.skipQueue')}</button></div>}
    </div>
  </section>
}

export default AchievementToast
