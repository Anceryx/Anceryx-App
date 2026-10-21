export function safeReturnTo(state: unknown): string {
  const value = typeof state === 'object' && state !== null && 'returnTo' in state
    ? (state as { returnTo?: unknown }).returnTo
    : null
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/app'
}
