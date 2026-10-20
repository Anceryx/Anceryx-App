import React, { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button, Modal } from '@/components/ui/index'
import { CURRENT_RELEASE_NOTES } from '@/lib/releaseNotes'
import { useAuthStore } from '@/store/authStore'

const STORAGE_KEY = 'anceryx:lastSeenReleaseNotesVersion'

const ReleaseNotesModal: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    const seen = localStorage.getItem(STORAGE_KEY)
    if (seen !== CURRENT_RELEASE_NOTES.version) setOpen(true)
  }, [isAuthenticated])

  const close = () => {
    localStorage.setItem(STORAGE_KEY, CURRENT_RELEASE_NOTES.version)
    setOpen(false)
  }

  return (
    <Modal isOpen={open} onClose={close} title="Novidades desta versão">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-background-tertiary p-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">{CURRENT_RELEASE_NOTES.title}</p>
            <p className="text-xs text-text-secondary">{CURRENT_RELEASE_NOTES.version}</p>
          </div>
        </div>
        <ul className="space-y-2">
          {CURRENT_RELEASE_NOTES.highlights.map((item) => (
            <li key={item} className="rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary">
              {item}
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={close}>Entendi</Button>
        </div>
      </div>
    </Modal>
  )
}

export default ReleaseNotesModal
