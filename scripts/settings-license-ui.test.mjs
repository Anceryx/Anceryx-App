import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const about = await readFile(new URL('../src/renderer/components/settings/sections/SobreSection.tsx', import.meta.url), 'utf8')
const nav = await readFile(new URL('../src/renderer/components/settings/SettingsNav.tsx', import.meta.url), 'utf8')
const modal = await readFile(new URL('../src/renderer/components/settings/SettingsModal.tsx', import.meta.url), 'utf8')

for (const source of [about, nav, modal]) {
  assert.doesNotMatch(source, /Central de Licenças|Abrir Central de Licenças|Licenças de código aberto/)
  assert.doesNotMatch(source, /licencas/)
}
console.log('settings license UI smoke: PASS (license compliance materials untouched; UI removed)')
