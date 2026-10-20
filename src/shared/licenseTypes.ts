export interface LicenseRecord {
  name: string
  version: string
  license: string
  scope: 'runtime' | 'development' | 'transitive'
  direct: boolean
  author?: string
  repository?: string
  licenseText?: string
  notice?: string
  review: 'permissive' | 'review' | 'copyleft' | 'attribution' | 'unknown'
}

export interface LicenseManifest {
  generatedAt: string
  source: 'package-lock.json'
  packageCount?: number
  records: LicenseRecord[]
  warnings?: LicenseWarning[]
  legalNotes: string[]
}

export interface LicenseWarning {
  type: 'missing-metadata' | 'unknown-license' | 'missing-license-text'
  packagePath?: string
  name?: string
  version?: string
  license?: string
}
