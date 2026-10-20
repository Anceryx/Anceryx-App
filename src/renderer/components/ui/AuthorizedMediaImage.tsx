import { useEffect, useState } from 'react'
import { apiStream, API_BASE_URL } from '@/services/apiClient'

type Props = { src: string; alt: string; className?: string }

export function AuthorizedMediaImage({ src, alt, className }: Props) {
  const [resolved, setResolved] = useState('')

  useEffect(() => {
    let active = true
    let objectUrl = ''
    setResolved('')
    try {
      const url = new URL(src, `${API_BASE_URL.replace(/\/$/, '')}/`)
      const isPrivateMedia = url.pathname.includes('/media/files/dm-image/') || url.pathname.includes('/media/files/community-message/')
      if (!isPrivateMedia) {
        setResolved(url.toString())
        return () => { active = false }
      }
      void apiStream(`${url.pathname}${url.search}`).then(async (response) => {
        const blob = await response.blob()
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setResolved(objectUrl)
      }).catch(() => { if (active) setResolved('') })
    } catch {
      setResolved('')
    }
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  return resolved ? <img src={resolved} alt={alt} className={className} loading="lazy" /> : null
}
