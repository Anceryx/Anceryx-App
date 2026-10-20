import React from 'react'

interface State { hasError: boolean }

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State { return { hasError: true } }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="grid min-h-screen place-items-center bg-background-primary p-6 text-center text-text-primary">
        <section className="max-w-md rounded-xl border border-border bg-background-secondary p-8">
          <h1 className="text-xl font-semibold">Algo deu errado</h1>
          <p className="mt-3 text-sm text-text-secondary">O Anceryx encontrou um problema inesperado. Reabra o aplicativo para continuar.</p>
          <button className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" onClick={() => window.location.reload()}>
            Reabrir aplicativo
          </button>
        </section>
      </main>
    )
  }
}
