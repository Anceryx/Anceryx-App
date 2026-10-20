export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error'

export type UpdateChannel = 'stable' | 'beta'

export interface UpdateSnapshot {
  state: UpdateState
  currentVersion: string
  latestVersion: string | null
  channel: UpdateChannel
  configured: boolean
  lastCheckedAt: string | null
  progress: number | null
  releaseNotes: string[]
  message: string | null
}
