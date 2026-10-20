import React, { useCallback, useEffect, useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import { ActionRow, Button, ContentSectionCard, SectionHeader } from '@/components/ui/index'
import { accountApi, type SessionDto } from '@/services/accountApi'

const SessoesDispositivosSection: React.FC = () => {
  const [sessions, setSessions] = useState<SessionDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setSessions((await accountApi.sessions()).sessions) } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao carregar sessoes.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const revoke = async (id: string) => { setLoading(true); setError(null); try { await accountApi.revokeSession(id); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao encerrar sessao.'); setLoading(false) } }
  const revokeOthers = async () => { setLoading(true); setError(null); try { await accountApi.revokeOtherSessions(); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao encerrar sessoes.'); setLoading(false) } }
  return <div className="space-y-5">
    <SectionHeader eyebrow="Dispositivos" title="Sessoes e dispositivos" description="Sessoes reais vinculadas a sua conta." action={<Button size="sm" variant="secondary" onClick={() => void revokeOthers()} disabled={loading}>Encerrar outras</Button>} />
    <ContentSectionCard><div className="space-y-3">
      {loading && <p className="text-sm text-text-secondary">Carregando...</p>}
      {error && <div className="flex items-center gap-2 text-sm text-accent-red">{error}<Button size="sm" variant="ghost" onClick={() => void load()}>Tentar novamente</Button></div>}
      {!loading && !error && sessions.length === 0 && <p className="text-sm text-text-secondary">Nenhuma sessao ativa.</p>}
      {sessions.map((session) => <ActionRow key={session.id} icon={session.browser ? <Monitor size={18} /> : <Smartphone size={18} />} title={session.deviceLabel ?? session.platform ?? 'Dispositivo'} description={`${new Date(session.lastUsedAt).toLocaleString()} • IP: ${session.maskedIpAddress ?? 'indisponivel'} • ${session.loginMethod}`} meta={session.currentSession ? <span className="text-emerald-400">Este dispositivo</span> : undefined} action={!session.currentSession ? <Button size="sm" variant="danger" onClick={() => void revoke(session.id)}>Encerrar</Button> : undefined} />)}
    </div></ContentSectionCard>
  </div>
}
export default SessoesDispositivosSection
