import React, { useEffect, useRef, useState } from 'react'
import { Copy, Flag, Share2, UserX } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useUIStore } from '@/store/uiStore'
import { ANCERYX_BASE_URL } from '@/lib/premium'
import { socialApi } from '@/services/socialApi'

interface Props { userId: string; publicUserId: string; isSelf: boolean; displayName: string; handle: string }
const reasons = ['spam', 'harassment', 'inappropriate_content', 'scam_or_fraud', 'violence_or_threat', 'personal_information', 'other']

const ProfileMenu: React.FC<Props> = ({ userId, publicUserId, isSelf, handle }) => {
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
  const copy = async (value: string, label: string) => { try { await navigator.clipboard.writeText(value); notify(label, 'success') } catch { notify('Nao foi possivel copiar.', 'error') } setOpen(false) }
  const updateBlock = async () => { try { if (blocked) await socialApi.unblock(userId); else await socialApi.block(userId); setBlocked(!blocked); notify(blocked ? 'Usuario desbloqueado.' : 'Usuario bloqueado.', 'success'); setOpen(false) } catch (err) { notify(err instanceof Error ? err.message : 'Falha ao atualizar bloqueio.', 'error') } }
  const report = async () => { try { await socialApi.report(userId, reason, details); notify('Denuncia enviada.', 'success'); setOpen(false) } catch (err) { notify(err instanceof Error ? err.message : 'Falha ao enviar denuncia.', 'error') } }
  const item = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-white/5'
  return <div ref={root} className="relative"><button type="button" onClick={() => { setOpen(!open); setMode('main') }} className="h-8 w-8 rounded-lg text-text-secondary hover:bg-white/10" aria-label={`Mais opcoes para @${handle}`}>•••</button>
    {open && <div className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-border bg-background-secondary p-1 shadow-xl">
      {mode === 'main' && <><button className={item} onClick={() => void copy(publicUserId, 'ID copiado!')}><Copy size={14} />Copiar ID</button><button className={item} onClick={() => void copy(`${ANCERYX_BASE_URL}/@${handle}`, 'Link copiado!')}><Share2 size={14} />Compartilhar perfil</button>{!isSelf && <><button className={`${item} text-red-400`} onClick={() => setMode('block')}><UserX size={14} />{blocked ? 'Desbloquear usuario' : 'Bloquear usuario'}</button><button className={item} onClick={() => setMode('report')}><Flag size={14} />Denunciar perfil</button></>}</>}
      {mode === 'block' && <div className="space-y-3 p-2"><p className="text-xs text-text-secondary">{blocked ? 'Desbloquear' : 'Bloquear'} @{handle}?</p><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setMode('main')}>Cancelar</Button><Button size="sm" variant="danger" onClick={() => void updateBlock()}>Confirmar</Button></div></div>}
      {mode === 'report' && <div className="space-y-2 p-2"><select value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded border border-border bg-background-tertiary p-2 text-xs">{reasons.map((value) => <option key={value}>{value}</option>)}</select><textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} className="w-full rounded border border-border bg-background-tertiary p-2 text-xs" placeholder="Detalhes opcionais" /><Button size="sm" onClick={() => void report()}>Enviar</Button></div>}
    </div>}
  </div>
}
export default ProfileMenu
