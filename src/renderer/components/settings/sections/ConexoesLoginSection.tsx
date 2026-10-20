import React, { useCallback, useEffect, useState } from 'react'
import { Chrome, Mail } from 'lucide-react'
import { ActionRow, Button, ContentSectionCard, Input, SectionHeader } from '@/components/ui/index'
import { accountApi, type LoginConnectionsDto } from '@/services/accountApi'

const ConexoesLoginSection: React.FC = () => {
  const [connections, setConnections] = useState<LoginConnectionsDto | null>(null)
  const [password, setPassword] = useState('')
  const [disconnecting, setDisconnecting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => { setError(null); try { setConnections((await accountApi.loginConnections()).connections) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao carregar as conexões.') } }, [])
  useEffect(() => { void load() }, [load])
  const connectGoogle = async () => { setBusy(true); setError(null); try { const result = await accountApi.startGoogleConnection(); if (!result.available || !result.authUrl) throw new Error('O login com Google não está configurado no servidor.'); window.electronAPI?.openExternal(result.authUrl) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar a conexão com o Google.') } finally { setBusy(false) } }
  const disconnectGoogle = async () => { setBusy(true); setError(null); try { await accountApi.disconnectGoogle(password); setDisconnecting(false); setPassword(''); await load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao desconectar Google.') } finally { setBusy(false) } }
  return <div className="space-y-5"><SectionHeader eyebrow="Login" title="Conexões de login" description="Métodos vinculados e confirmados pelo servidor." /><ContentSectionCard><div className="space-y-3">
    {error && <p className="rounded bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}
    {!connections && !error && <p className="text-sm text-text-secondary">Carregando...</p>}
    {connections && <><ActionRow icon={<Mail size={18} />} title="E-mail e senha" description={`Conectado como ${connections.email.emailMasked}`} action={<span className="text-xs text-emerald-400">{connections.email.verified ? 'Verificado' : 'Conectado'}</span>} />
      <ActionRow icon={<Chrome size={18} />} title="Google" description={connections.google.connected ? `Conectado como ${connections.google.emailMasked ?? 'conta Google'}` : connections.google.available ? 'Disponível para vinculação OAuth.' : 'Indisponível: configure o login com Google no servidor.'} action={connections.google.connected ? <Button size="sm" variant="danger" onClick={() => setDisconnecting(true)}>Desconectar</Button> : <Button size="sm" variant="secondary" loading={busy} disabled={!connections.google.available} onClick={() => void connectGoogle()}>Conectar</Button>} />
      {disconnecting && <div className="space-y-2 rounded border border-border bg-background-secondary p-3"><Input type="password" label="Senha atual" value={password} onChange={(event) => setPassword(event.target.value)} /><div className="flex gap-2"><Button size="sm" variant="danger" loading={busy} onClick={() => void disconnectGoogle()}>Confirmar</Button><Button size="sm" variant="ghost" onClick={() => setDisconnecting(false)}>Cancelar</Button></div></div>}
    </>}
  </div></ContentSectionCard></div>
}

export default ConexoesLoginSection
