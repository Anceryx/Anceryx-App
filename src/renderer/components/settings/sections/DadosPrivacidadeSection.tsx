import React, { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, RotateCw, ShieldBan, UserRoundX } from 'lucide-react'
import { Avatar, Button, ContentSectionCard, SectionHeader } from '@/components/ui/index'
import { socialApi, type BlockedUserDto } from '@/services/socialApi'

const PAGE_SIZE = 50

const DadosPrivacidadeSection: React.FC = () => {
  const [blocks, setBlocks] = useState<BlockedUserDto[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unblockingId, setUnblockingId] = useState<string | null>(null)

  const loadBlocks = useCallback(async (nextOffset = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError(null)
    try {
      const result = await socialApi.blocks(PAGE_SIZE, nextOffset)
      setBlocks((current) => append ? [...current, ...result.blocks] : result.blocks)
      setOffset(nextOffset + result.blocks.length)
      setHasMore(result.blocks.length === PAGE_SIZE)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as contas bloqueadas.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => { void loadBlocks() }, [loadBlocks])

  const unblock = async (userId: string) => {
    setUnblockingId(userId)
    setError(null)
    try {
      await socialApi.unblock(userId)
      setBlocks((current) => current.filter((user) => user.id !== userId))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível desbloquear esta conta.')
    } finally {
      setUnblockingId(null)
    }
  }

  return <div className="max-w-2xl space-y-5">
    <SectionHeader eyebrow="Privacidade" title="Dados e privacidade" description="Informações sobre proteção e uso dos dados na Anceryx." />
    <ContentSectionCard className="space-y-5">
      <div><p className="text-sm font-medium text-text-primary">Chamadas</p><p className="mt-1 text-xs text-text-secondary">Chamadas usam WebRTC. O aplicativo não fornece criptografia ponta a ponta para esse recurso.</p></div>
      <div><p className="text-sm font-medium text-text-primary">Telemetria</p><p className="mt-1 text-xs text-text-secondary">A coleta de dados de uso não está habilitada nesta versão.</p></div>
      <div><p className="text-sm font-medium text-text-primary">Mensagens diretas</p><p className="mt-1 text-xs text-text-secondary">As mensagens são protegidas por autenticação, autorização, bloqueios e controles de privacidade no servidor. O conteúdo não usa criptografia ponta a ponta.</p></div>
      <p className="border-t border-border pt-4 text-xs text-text-secondary">As opções de visibilidade do perfil e de quem pode iniciar conversas ficam em Configurações → Perfil.</p>
    </ContentSectionCard>

    <ContentSectionCard className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldBan size={19} className="mt-0.5 shrink-0 text-accent" />
          <div><h3 className="font-semibold text-text-primary">Contas bloqueadas</h3><p className="mt-1 text-sm text-text-secondary">Essas contas não podem iniciar interações com você. Desbloqueá-las não restaura amizades nem conversas removidas.</p></div>
        </div>
        {!loading && <Button size="sm" variant="ghost" aria-label="Atualizar contas bloqueadas" onClick={() => void loadBlocks()}><RotateCw size={15} /></Button>}
      </div>

      {loading ? <div role="status" className="flex items-center gap-2 py-5 text-sm text-text-secondary"><LoaderCircle size={16} className="animate-spin" /> Carregando contas bloqueadas…</div>
        : error && blocks.length === 0 ? <div role="alert" className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300"><p>{error}</p><Button size="sm" variant="secondary" onClick={() => void loadBlocks()}>Tentar novamente</Button></div>
          : blocks.length === 0 ? <div className="flex items-center gap-3 rounded-lg border border-border bg-background-secondary p-4 text-sm text-text-secondary"><UserRoundX size={18} /> Você não bloqueou nenhuma conta.</div>
            : <div className="space-y-2" aria-live="polite">
              {blocks.map((user) => <div key={user.id} className="flex items-center gap-3 rounded-lg border border-border bg-background-secondary p-3">
                <Avatar src={user.avatarUrl} name={user.displayName} size="md" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-text-primary">{user.displayName}</p><p className="truncate text-xs text-text-secondary">@{user.username}</p></div>
                <Button size="sm" variant="secondary" loading={unblockingId === user.id} disabled={unblockingId !== null} onClick={() => void unblock(user.id)}>Desbloquear</Button>
              </div>)}
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              {hasMore && <Button variant="ghost" loading={loadingMore} onClick={() => void loadBlocks(offset, true)}>Carregar mais</Button>}
            </div>}
    </ContentSectionCard>
  </div>
}

export default DadosPrivacidadeSection
