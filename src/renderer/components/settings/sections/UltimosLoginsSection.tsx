import React, { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { ActionRow, Button, ContentSectionCard, SectionHeader } from '@/components/ui/index'
import { accountApi, type LoginHistoryDto } from '@/services/accountApi'

const UltimosLoginsSection: React.FC = () => {
  const [logins, setLogins] = useState<LoginHistoryDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => { setLoading(true); setError(null); try { setLogins((await accountApi.loginHistory()).logins) } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao carregar historico.') } finally { setLoading(false) } }, [])
  useEffect(() => { void load() }, [load])
  return <div className="space-y-5"><SectionHeader eyebrow="Historico" title="Ultimos logins" description="Eventos reais recentes, com IP mascarado pelo backend." />
    <ContentSectionCard><div className="space-y-3">
      {loading && <p className="text-sm text-text-secondary">Carregando...</p>}
      {!loading && error && <div className="flex items-center gap-2 text-sm text-accent-red">{error}<Button size="sm" variant="ghost" onClick={() => void load()}>Tentar novamente</Button></div>}
      {!loading && !error && logins.length === 0 && <p className="text-sm text-text-secondary">Nenhum evento recente.</p>}
      {logins.map((login) => <ActionRow key={login.id} icon={login.success ? <CheckCircle2 size={18} /> : <XCircle size={18} />} title={login.deviceLabel ?? login.platform ?? 'Dispositivo'} description={`${new Date(login.occurredAt).toLocaleString()} • IP: ${login.maskedIpAddress ?? 'indisponivel'} • ${login.loginMethod}`} meta={login.currentSession ? <span className="text-emerald-400">Sessao atual</span> : undefined} action={<span className={`text-xs font-medium ${login.success ? 'text-emerald-400' : 'text-red-400'}`}>{login.success ? 'Sucesso' : 'Falha'}</span>} />)}
    </div></ContentSectionCard>
  </div>
}
export default UltimosLoginsSection
