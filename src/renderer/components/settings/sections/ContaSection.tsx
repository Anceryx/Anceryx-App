import React, { useEffect, useState } from 'react'
import { Button, ContentSectionCard, SectionHeader } from '@/components/ui/index'
import { useAuthStore } from '@/store/authStore'
import { useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { socialApi } from '@/services/socialApi'
import { ANCERYX_PRIVACY_URL, ANCERYX_TERMS_URL } from '@/lib/premium'

const ContaSection: React.FC = () => {
  const user = useAuthStore((state) => state.user)
  const { userProfile, updateUserProfile, hydrateSocial } = useSocialStore()
  const notify = useUIStore((state) => state.addNotification)
  const [name, setName] = useState(userProfile.displayName)
  useEffect(() => { void hydrateSocial() }, [hydrateSocial])
  useEffect(() => setName(userProfile.displayName), [userProfile.displayName])
  if (!user) return null
  const save = async () => { try { const { user: updated } = await socialApi.updateMe({ displayName: name.trim() }); updateUserProfile({ displayName: updated.displayName }); useAuthStore.getState().setDisplayName(updated.displayName); notify('Nome atualizado.', 'success') } catch (error) { notify(error instanceof Error ? error.message : 'Falha ao atualizar nome.', 'error') } }
  return <div className="space-y-5"><SectionHeader eyebrow="Conta" title="Dados da sua conta" description="Informações vinculadas à sua conta Anceryx." />
    <ContentSectionCard className="space-y-4"><label className="block text-xs text-text-secondary">Nome exibido<div className="mt-1 flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} className="flex-1 rounded-md border border-border bg-background-tertiary px-3 py-2 text-sm" /><Button size="sm" onClick={() => void save()}>Salvar</Button></div></label><Field label="Nome de usuário" value={`@${userProfile.handle || user.username || ''}`} /><Field label="E-mail" value={user.email} /><Field label="Criado em" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Indisponível'} /></ContentSectionCard>
    <ContentSectionCard><p className="text-sm text-text-secondary">A alteração do nome de usuário, do telefone e o encerramento da conta ainda não estão disponíveis.</p></ContentSectionCard>
    <ContentSectionCard><div className="flex gap-3 text-sm"><button className="text-blue-400" onClick={() => window.electronAPI?.openExternal(ANCERYX_TERMS_URL)}>Termos</button><button className="text-blue-400" onClick={() => window.electronAPI?.openExternal(ANCERYX_PRIVACY_URL)}>Privacidade</button></div></ContentSectionCard>
  </div>
}
const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="border-t border-border pt-3"><small className="block text-text-secondary">{label}</small><span className="text-sm text-text-primary">{value}</span></div>
export default ContaSection
