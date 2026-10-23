import React, { useEffect, useRef, useState } from 'react'
import { Copy, Flag, Share2, UserX } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useUIStore } from '@/store/uiStore'
import { socialApi } from '@/services/socialApi'
import { useTranslation } from '@/i18n'

interface Props { userId: string; publicUserId: string; isSelf: boolean; displayName: string; handle: string }
const reasons = ['spam', 'harassment', 'inappropriate_content', 'scam_or_fraud', 'violence_or_threat', 'personal_information', 'other']

const ProfileMenu: React.FC<Props> = ({ userId, publicUserId, isSelf, handle }) => {
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'main' | 'block' | 'report'>('main')
  const [blocked, setBlocked] = useState(false)
  const [reason, setReason] = useState(reasons[0])
  const [details, setDetails] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const notify = useUIStore((state) => state.addNotification)
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    if (!isSelf) void socialApi.blocks().then(({ blocks }) => setBlocked(blocks.some((user) => user.id === userId))).catch(() => undefined)
    return () => document.removeEventListener('mousedown', close)
  }, [isSelf, open, userId])
  const copy = async (value: string, label: string) => { try { await navigator.clipboard.writeText(value); notify(label, 'success') } catch { notify(t('profileMenu.copyFailed'), 'error') } setOpen(false) }
  const updateBlock = async () => { try { if (blocked) await socialApi.unblock(userId); else await socialApi.block(userId); setBlocked(!blocked); notify(blocked ? t('profileMenu.unblocked') : t('profileMenu.blocked'), 'success'); setOpen(false) } catch (err) { notify(err instanceof Error ? err.message : t('profileMenu.blockFailed'), 'error') } }
  const report = async () => { try { await socialApi.report(userId, reason, details); notify(t('profileMenu.reportSent'), 'success'); setOpen(false) } catch (err) { notify(err instanceof Error ? err.message : t('profileMenu.reportFailed'), 'error') } }
  const item = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-white/5'
  const reasonLabels: Record<string, string> = { spam: t('post.reasonSpam'), harassment: t('post.reasonHarassment'), inappropriate_content: t('post.reasonInappropriate'), scam_or_fraud: t('post.reasonScam'), violence_or_threat: t('post.reasonViolence'), personal_information: t('post.reasonPersonalInfo'), other: t('post.reasonOther') }
  return <div ref={root} className="relative"><button type="button" onClick={() => { setOpen(!open); setMode('main') }} className="h-8 w-8 rounded-lg text-text-secondary hover:bg-white/10" aria-label={t('profileMenu.moreOptions', { name: handle })}>•••</button>
    {open && <div className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-border bg-background-secondary p-1 shadow-xl">
      {mode === 'main' && <><button className={item} onClick={() => void copy(publicUserId, t('profileMenu.idCopied'))}><Copy size={14} />{t('profileMenu.copyId')}</button><button className={item} onClick={() => void copy(`anceryx://profile/${encodeURIComponent(handle)}`, t('profileMenu.linkCopied'))}><Share2 size={14} />{t('profileMenu.shareProfile')}</button>{!isSelf && <><button className={`${item} text-red-400`} onClick={() => setMode('block')}><UserX size={14} />{blocked ? t('profileMenu.unblock') : t('profileMenu.block')}</button><button className={item} onClick={() => setMode('report')}><Flag size={14} />{t('profileMenu.report')}</button></>}</>}
      {mode === 'block' && <div className="space-y-3 p-2"><p className="text-xs text-text-secondary">{t(blocked ? 'profileMenu.confirmUnblock' : 'profileMenu.confirmBlock', { name: handle })}</p><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setMode('main')}>{t('common.cancel')}</Button><Button size="sm" variant="danger" onClick={() => void updateBlock()}>{t('common.confirm')}</Button></div></div>}
      {mode === 'report' && <div className="space-y-2 p-2"><select value={reason} onChange={(event) => setReason(event.target.value)} aria-label={t('profileMenu.reportReason')} className="w-full rounded border border-border bg-background-tertiary p-2 text-xs">{reasons.map((value) => <option key={value} value={value}>{reasonLabels[value]}</option>)}</select><textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} className="w-full rounded border border-border bg-background-tertiary p-2 text-xs" placeholder={t('post.reportDetails')} /><Button size="sm" onClick={() => void report()}>{t('post.sendReport')}</Button></div>}
    </div>}
  </div>
}
export default ProfileMenu
