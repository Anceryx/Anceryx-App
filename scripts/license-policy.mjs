const SPDX_ID = /^[A-Za-z0-9.-]+$/

const KNOWN_IDS = new Set([
  '0BSD', 'AFL-2.1', 'Apache-2.0', 'Artistic-2.0', 'BSD-2-Clause', 'BSD-3-Clause',
  'BlueOak-1.0.0', 'CC0-1.0', 'CC-BY-3.0', 'CC-BY-4.0', 'ISC', 'MIT', 'MPL-2.0', 'Python-2.0', 'Unlicense', 'WTFPL',
  'AGPL-1.0-only', 'AGPL-1.0-or-later', 'AGPL-3.0-only', 'AGPL-3.0-or-later',
  'GPL-1.0-only', 'GPL-1.0-or-later', 'GPL-2.0-only', 'GPL-2.0-or-later',
  'GPL-3.0-only', 'GPL-3.0-or-later', 'LGPL-2.0-only', 'LGPL-2.0-or-later',
  'LGPL-2.1-only', 'LGPL-2.1-or-later', 'LGPL-3.0-only', 'LGPL-3.0-or-later',
  'Classpath-exception-2.0', 'LLVM-exception', 'OpenSSL-exception',
])

const COPYLEFT = /^(?:A?GPL|LGPL|MPL)-/i
const REVIEW_ONLY = new Set(['MPL-2.0'])

export function parseLicenseExpression(value) {
  const expression = String(value ?? '').trim()
  if (!expression || /^(?:UNKNOWN|UNLICENSED)$/i.test(expression)) {
    return { recognized: false, ids: [], operators: [], reason: 'missing SPDX expression' }
  }

  const tokens = expression.replace(/[()]/g, ' ').split(/\s+/).filter(Boolean)
  const ids = tokens.filter((token) => token !== 'AND' && token !== 'OR' && token !== 'WITH')
  const operators = tokens.filter((token) => token === 'AND' || token === 'OR' || token === 'WITH')
  const unknown = ids.filter((id) => !SPDX_ID.test(id) || !KNOWN_IDS.has(id))
  return {
    recognized: unknown.length === 0 && ids.length > 0,
    ids,
    operators,
    reason: unknown.length > 0 ? `unrecognized SPDX identifier: ${unknown.join(', ')}` : undefined,
  }
}

export function classifyLicenseExpression(value) {
  const parsed = parseLicenseExpression(value)
  if (!parsed.recognized) return { review: 'unknown', parsed }
  if (parsed.ids.some((id) => REVIEW_ONLY.has(id))) return { review: 'review', parsed }
  if (parsed.ids.some((id) => COPYLEFT.test(id))) return { review: 'copyleft', parsed }
  if (parsed.ids.some((id) => id.startsWith('CC-BY-'))) return { review: 'attribution', parsed }
  return { review: 'permissive', parsed }
}
