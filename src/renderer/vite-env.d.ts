interface ImportMetaEnv {
  readonly PROD: boolean
  readonly VITE_ANCERYX_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
