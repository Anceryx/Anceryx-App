interface ImportMetaEnv {
  readonly PROD: boolean
  readonly VITE_ANCERYX_API_URL?: string
  readonly VITE_ANCERYX_PLATFORM?: 'electron' | 'web'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
