import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useTranslation } from '@/i18n'

type Scope = 'dm' | 'forum-channel' | 'forum-topic' | 'forum-reply' | 'post'
type Persistence = 'loading' | 'ready' | 'unavailable'

export function usePersistentDraft(userId: string, scope: Scope, resourceId: string, initialValue = '') {
  const keyId = userId && resourceId ? `${userId}:${scope}:${resourceId}` : ''
  const key = keyId ? { userId, scope, resourceId } : null
  const [value, setValueState] = useState(initialValue)
  const valueRef = useRef(initialValue)
  const [readyKey, setReadyKey] = useState('')
  const [persistence, setPersistence] = useState<Persistence>('loading')
  const addNotification = useUIStore((state) => state.addNotification)
  const t = useTranslation()
  const warnedRef = useRef(false)
  const markUnavailable = useCallback(() => {
    setPersistence('unavailable')
    if (window.electronAPI?.drafts && !warnedRef.current) {
      warnedRef.current = true
      addNotification(t('messages.draftSaveUnavailable'), 'error')
    }
  }, [addNotification, t])

  const setValue = useCallback((next: string) => {
    const bounded = next.slice(0, 20_000)
    valueRef.current = bounded
    setValueState(bounded)
  }, [])

  useLayoutEffect(() => {
    valueRef.current = initialValue
    setValueState(initialValue)
    setReadyKey('')
  }, [keyId])

  useEffect(() => {
    if (!key) { setPersistence('loading'); return }
    const api = window.electronAPI?.drafts
    if (!api) { setPersistence('unavailable'); return }
    let active = true
    setPersistence('loading')
    void api.get(key).then((result) => {
      if (!active) return
      if (!result.ok) { markUnavailable(); return }
      if (result.content !== null && valueRef.current === initialValue) {
        valueRef.current = result.content
        setValueState(result.content)
      }
      setPersistence('ready')
      setReadyKey(keyId)
    }).catch(() => { if (active) markUnavailable() })
    return () => { active = false }
  }, [keyId, markUnavailable])

  const persist = useCallback(async () => {
    if (!key || readyKey !== keyId || !window.electronAPI?.drafts) return false
    try {
      const ok = await window.electronAPI.drafts.save(key, valueRef.current)
      if (!ok) markUnavailable()
      return ok
    } catch { markUnavailable(); return false }
  }, [keyId, readyKey, markUnavailable])

  useEffect(() => {
    if (!key || readyKey !== keyId || !window.electronAPI?.drafts) return
    const timer = window.setTimeout(() => { void persist() }, 250)
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') void persist() }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVisibilityChange) }
  }, [keyId, readyKey, value, persist])

  const discard = useCallback(async () => {
    valueRef.current = ''
    setValueState('')
    if (!key || !window.electronAPI?.drafts) return false
    try {
      const ok = await window.electronAPI.drafts.delete(key)
      if (!ok) markUnavailable()
      return ok
    } catch { markUnavailable(); return false }
  }, [keyId, markUnavailable])

  return { value, setValue, discard, persist, persistence }
}
