import React from 'react'
import { useTranslation } from '@/i18n'

interface State { hasError: boolean }

function ErrorFallback() {
  const t = useTranslation()
  return (
      <main className="grid min-h-screen place-items-center bg-background-primary p-6 text-center text-text-primary">
        <section className="max-w-md rounded-xl border border-border bg-background-secondary p-8">
          <h1 className="text-xl font-semibold">{t('auth.errorTitle')}</h1>
          <p className="mt-3 text-sm text-text-secondary">{t('auth.errorDescription')}</p>
          <button className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" onClick={() => window.location.reload()}>
            {t('auth.reopen')}
          </button>
        </section>
      </main>
  )
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State { return { hasError: true } }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children
    return <ErrorFallback />
  }
}
