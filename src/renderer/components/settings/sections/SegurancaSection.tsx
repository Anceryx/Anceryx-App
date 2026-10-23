import React, { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react'
import { ActionRow, Button, ContentSectionCard, Input, SectionHeader } from '@/components/ui/index'
import { accountApi, type AccountSecurityDto } from '@/services/accountApi'
import { useUIStore } from '@/store/uiStore'
import { useTranslation } from '@/i18n'

type Panel = 'none' | 'password' | 'email-verification' | 'mfa-setup' | 'mfa-disable' | 'mfa-codes'
type MfaSetup = { otpauthUri: string; qrCodeDataUrl: string; manualSecret: string; issuer: string; accountName: string; expiresAt: string }

const SegurancaSection: React.FC = () => {
  const t = useTranslation()
  const locale = useUIStore((state) => state.locale)
  const notify = useUIStore((state) => state.addNotification)
  const [security, setSecurity] = useState<AccountSecurityDto | null>(null)
  const [panel, setPanel] = useState<Panel>('none')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [code, setCode] = useState('')
  const [setup, setSetup] = useState<MfaSetup | null>(null)
  const [manualKeyOpen, setManualKeyOpen] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [recoverySaved, setRecoverySaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailActionError, setEmailActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setSecurity((await accountApi.security()).security) }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('security.loadFailed')) }
    finally { setLoading(false) }
  }, [t])
  useEffect(() => { void load() }, [load])

  const run = async (operation: () => Promise<void>, success?: string, errorScope: 'page' | 'email' = 'page') => {
    setBusy(true)
    setError(null)
    setEmailActionError(null)
    try { await operation(); if (success) notify(success, 'success') }
    catch (reason) {
      const message = reason instanceof Error ? reason.message : t('security.operationFailed')
      if (errorScope === 'email') setEmailActionError(message)
      else setError(message)
    }
    finally { setBusy(false) }
  }

  const closePanel = () => {
    const cancelPendingSetup = panel === 'mfa-setup' && setup !== null
    setPanel('none')
    setCurrentPassword('')
    setNewPassword('')
    setCode('')
    setSetup(null)
    setManualKeyOpen(false)
    setEmailActionError(null)
    if (cancelPendingSetup) void accountApi.cancelMfaSetup().catch(() => undefined)
  }

  const copyValue = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); notify(label, 'success') }
    catch { setError(t('security.copyFailed')) }
  }

  const downloadRecoveryCodes = () => {
    const file = new Blob([`${t('security.recoveryCodes')} da Anceryx\n\n${recoveryCodes.join('\n')}\n`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'anceryx-codigos-de-recuperacao.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <ContentSectionCard><p className="text-sm text-text-secondary">{t('security.loading')}</p></ContentSectionCard>
  if (!security) return <ContentSectionCard><p className="text-sm text-red-400">{error}</p><Button className="mt-3" size="sm" onClick={() => void load()}>{t('common.retry')}</Button></ContentSectionCard>

  const startMfaSetup = () => void run(async () => {
    const result = await accountApi.startMfa(currentPassword, security.mfaEnabled ? code : undefined)
    setSetup(result)
    setCode('')
    setManualKeyOpen(false)
  })

  return <div className="space-y-5">
    <SectionHeader eyebrow={t('security.title')} title={t('security.title')} description={t('security.description')} />
    <ContentSectionCard><div className="space-y-3">
      {error && <p role="alert" className="rounded-md bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <ActionRow icon={<CheckCircle2 size={17} />} title={t('security.emailVerified')} description={security.emailVerified ? t('security.emailConfirmed') : t('security.emailVerifyHint')} action={security.emailVerified ? <span className="inline-flex items-center gap-2 text-xs text-emerald-400"><CheckCircle2 size={15} /> {t('security.emailVerified')}</span> : <Button size="sm" variant="secondary" loading={busy} onClick={() => { setCode(''); setPanel('email-verification'); void run(async () => { await accountApi.requestEmailVerification() }, t('security.verificationSent'), 'email') }}>{t('security.verify')}</Button>} />

      {panel === 'email-verification' && <div className="space-y-3 rounded-md border border-border bg-background-secondary p-4">{emailActionError && <p role="alert" className="rounded-md bg-red-500/10 p-3 text-sm text-red-300">{emailActionError}</p>}<p className="text-sm text-text-secondary">{t('security.verificationPrompt')}</p><Input label={t('security.verificationCode')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /><div className="flex flex-wrap gap-2"><Button loading={busy} disabled={code.length !== 6} onClick={() => void run(async () => { await accountApi.confirmEmailVerification(code); setSecurity({ ...security, emailVerified: true }); closePanel() }, t('security.emailConfirmedToast'), 'email')}>{t('security.confirmEmail')}</Button><Button variant="secondary" loading={busy} onClick={() => void run(async () => { await accountApi.resendEmailVerification() }, t('security.newCodeSent'), 'email')}>{t('security.resendCode')}</Button><Button variant="ghost" onClick={closePanel}>{t('security.cancel')}</Button></div></div>}

      <ActionRow icon={<KeyRound size={17} />} title={t('security.password')} description={t('security.passwordDescription')} action={<Button size="sm" variant="secondary" onClick={() => setPanel('password')}>{t('security.change')}</Button>} />
      {panel === 'password' && <div className="space-y-3 rounded-md border border-border bg-background-secondary p-4"><Input type="password" label={t('security.currentPassword')} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><Input type="password" label={t('security.newPassword')} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><div className="flex gap-2"><Button loading={busy} onClick={() => void run(async () => { await accountApi.changePassword(currentPassword, newPassword); closePanel() }, t('security.password'))}>{t('security.save')}</Button><Button variant="ghost" onClick={closePanel}>{t('security.cancel')}</Button></div></div>}

      <div className="anceryx-row flex-col items-stretch">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-text-primary">{t('security.mfa')}</p><p className="text-xs text-text-secondary">{security.mfaEnabled ? t('security.mfaEnabledAt', { time: security.mfaEnabledAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(security.mfaEnabledAt)) : t('profile.dateUnavailable'), count: security.recoveryCodesRemaining }) : t('security.mfaProtection')}</p></div>{security.mfaEnabled ? <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => { setCurrentPassword(''); setCode(''); setPanel('mfa-codes') }}>{t('security.regenerateCodes')}</Button><Button size="sm" variant="secondary" onClick={() => { setCurrentPassword(''); setCode(''); setSetup(null); setPanel('mfa-setup') }}>{t('security.replaceAuthenticator')}</Button><Button size="sm" variant="danger" onClick={() => { setCurrentPassword(''); setCode(''); setPanel('mfa-disable') }}>{t('security.disable')}</Button></div> : <Button size="sm" variant="secondary" leftIcon={<ShieldCheck size={14} />} onClick={() => { setCurrentPassword(''); setCode(''); setSetup(null); setPanel('mfa-setup') }}>{t('security.enable')}</Button>}</div>

        {panel === 'mfa-setup' && <div className="mt-4 space-y-4 rounded-md border border-border bg-background-secondary p-4">
          {!setup ? <>
            <div><h3 className="text-base font-semibold text-text-primary">{t('security.protectAccount')}</h3><p className="mt-1 text-sm text-text-secondary">{t('security.extraLayer')}</p></div>
            <p className="text-sm text-text-secondary">{t('security.authenticatorApps')}</p>
            <Input type="password" label={t('security.currentPassword')} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            {security.mfaEnabled && <Input label={t('security.currentTotp')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />}
            <p className="text-xs text-text-secondary">{security.mfaEnabled ? t('security.currentTotpContinues') : t('security.confirmValidCode')} {t('security.setupExpires')}</p>
            <div className="flex flex-wrap gap-2"><Button loading={busy} disabled={!currentPassword || (security.mfaEnabled && code.length !== 6)} onClick={startMfaSetup}>{t('security.continue')}</Button><Button variant="ghost" onClick={closePanel}>{t('security.cancel')}</Button></div>
          </> : <>
            <div className="space-y-2"><h3 className="text-base font-semibold text-text-primary">{t('security.scanQr')}</h3><p className="text-sm text-text-secondary">{t('security.scanInstructions')}</p></div>
            <img src={setup.qrCodeDataUrl} alt={t('security.qrAlt')} className="mx-auto h-64 w-64 rounded-md bg-white p-2" width={280} height={280} />
            <div><button type="button" className="text-sm font-medium text-accent hover:underline" aria-expanded={manualKeyOpen} onClick={() => setManualKeyOpen(!manualKeyOpen)}>{manualKeyOpen ? t('security.hideManualKey') : t('security.manualKeyPrompt')}</button>
              {manualKeyOpen && <div className="mt-3 space-y-2 rounded-md border border-border bg-background-primary p-3"><p className="text-xs text-text-secondary">{t('security.secretIssuer', { name: setup.issuer, value: setup.accountName })}</p><code className="block break-all text-sm tracking-wider text-text-primary">{setup.manualSecret.match(/.{1,4}/g)?.join(' ')}</code><Button size="sm" variant="secondary" onClick={() => void copyValue(setup.manualSecret, t('security.keyCopied'))}>{t('security.copyKey')}</Button></div>}
            </div>
            <Input label={t('security.verificationCode')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
            <div className="flex flex-wrap gap-2"><Button loading={busy} disabled={code.length !== 6} onClick={() => void run(async () => { const result = await accountApi.confirmMfa(code); setRecoveryCodes(result.recoveryCodes); setRecoverySaved(false); setSecurity({ ...security, mfaEnabled: true, mfaEnabledAt: new Date().toISOString(), recoveryCodesRemaining: result.replaced ? security.recoveryCodesRemaining : result.recoveryCodes.length }); setPanel('none'); setSetup(null); setCode('') }, t('security.mfaEnabledToast'))}>{t('security.confirmActivation')}</Button><Button variant="ghost" onClick={closePanel}>{t('security.cancelSetup')}</Button></div>
          </>}
        </div>}

        {panel === 'mfa-disable' && <div className="mt-4 space-y-3 rounded-md border border-border bg-background-secondary p-4"><p className="text-sm text-text-secondary">{t('security.disablePrompt')}</p><Input type="password" label={t('security.currentPassword')} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><Input label={t('security.currentTotp')} value={code} onChange={(event) => setCode(event.target.value.trim().slice(0, 32))} autoComplete="one-time-code" /><div className="flex gap-2"><Button variant="danger" loading={busy} onClick={() => void run(async () => { await accountApi.disableMfa(currentPassword, code); setSecurity({ ...security, mfaEnabled: false, mfaEnabledAt: null, recoveryCodesRemaining: 0 }); closePanel() }, t('security.mfaDisabledToast'))}>{t('security.disable')}</Button><Button variant="ghost" onClick={closePanel}>{t('security.cancel')}</Button></div></div>}

        {panel === 'mfa-codes' && <div className="mt-4 space-y-3 rounded-md border border-border bg-background-secondary p-4"><p className="text-sm text-text-secondary">{t('security.regeneratePrompt')}</p><Input type="password" label={t('security.currentPassword')} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><Input label={t('security.currentTotp')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /><div className="flex gap-2"><Button loading={busy} disabled={code.length !== 6} onClick={() => void run(async () => { const result = await accountApi.regenerateRecoveryCodes(currentPassword, code); setRecoveryCodes(result.recoveryCodes); setRecoverySaved(false); setSecurity({ ...security, recoveryCodesRemaining: result.recoveryCodes.length }); closePanel() }, t('security.codesGenerated'))}>{t('security.regenerateCodes')}</Button><Button variant="ghost" onClick={closePanel}>{t('security.cancel')}</Button></div></div>}

        {recoveryCodes.length > 0 && <div className="mt-4 space-y-3 rounded-md border border-yellow-700/40 bg-yellow-950/20 p-4"><h3 className="font-semibold text-yellow-100">{t('security.recoveryCodes')}</h3><p className="text-sm text-yellow-200">{t('security.recoveryInstructions')}</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{recoveryCodes.map((item) => <code key={item} className="rounded bg-black/30 px-2 py-1 text-sm text-white">{item}</code>)}</div><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => void copyValue(recoveryCodes.join('\n'), t('security.codesCopied'))}>{t('security.copyAll')}</Button><Button size="sm" variant="secondary" onClick={downloadRecoveryCodes}>{t('security.downloadTxt')}</Button></div><label className="flex items-start gap-2 text-sm text-yellow-100"><input type="checkbox" checked={recoverySaved} onChange={(event) => setRecoverySaved(event.target.checked)} className="mt-1 h-4 w-4" />{t('security.confirmSavedCodes')}</label><Button size="sm" disabled={!recoverySaved} onClick={() => { setRecoveryCodes([]); setRecoverySaved(false) }}>{t('security.finishSetup')}</Button></div>}
      </div>
    </div></ContentSectionCard>
  </div>
}

export default SegurancaSection
