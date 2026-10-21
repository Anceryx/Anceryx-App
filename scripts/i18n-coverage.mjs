import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import ts from 'typescript'

const root = new URL('../src/renderer/', import.meta.url)
const rootPath = decodeURIComponent(root.pathname.replace(/^\//, '').replaceAll('/', '\\'))
const files = []

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await collect(path)
    else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) files.push(path)
  }
}

function visibleLiteral(text) {
  return text.trim().length > 0 && !/^[\s\d.,:;!?/(){}%+–—-]+$/.test(text)
}

await collect(rootPath)
const modules = new Map()
let translatedCalls = 0
let hardcodedVisibleStrings = 0

for (const file of files) {
  const sourceText = await readFile(file, 'utf8')
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const counts = { translated: 0, hardcoded: 0 }
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') counts.translated++
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'translate' && node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) counts.translated++
    if (ts.isJsxText(node) && visibleLiteral(node.getText(source))) counts.hardcoded++
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) && /^(aria-label|title|placeholder|alt|label|description)$/.test(node.name.getText(source)) && visibleLiteral(node.initializer.text)) counts.hardcoded++
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && /^(label|title|placeholder|ariaLabel|description)$/.test(node.name.text) && ts.isStringLiteral(node.initializer) && visibleLiteral(node.initializer.text)) counts.hardcoded++
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (counts.translated || counts.hardcoded) {
    const key = relative(rootPath, file).replaceAll('\\', '/')
    modules.set(key, counts)
    translatedCalls += counts.translated
    hardcodedVisibleStrings += counts.hardcoded
  }
}

const denominator = translatedCalls + hardcodedVisibleStrings
const percentage = denominator ? (translatedCalls / denominator) * 100 : 100
const sortedModules = [...modules.entries()].sort(([a], [b]) => a.localeCompare(b))
if (process.argv.includes('--write')) {
  const rows = sortedModules.map(([file, counts]) => {
    const total = counts.translated + counts.hardcoded
    const ratio = total ? (counts.translated / total) * 100 : 100
    return `| \`${file}\` | ${counts.translated} | ${counts.hardcoded} | ${ratio.toFixed(1)}% |`
  })
  const report = [
    '# Relatório de cobertura de internacionalização',
    '',
    '> Estimativa automatizada de rótulos estáticos declarados em JSX e chamadas `t()`/`translate()`. Textos dinâmicos do servidor, mensagens montadas em arrays/objetos fora dos campos reconhecidos e strings em código imperativo não entram na métrica. Este percentual é uma medida parcial, não cobertura total de toda a interface.',
    '',
    `- Chamadas de tradução detectadas: **${translatedCalls}**.`,
    `- Strings visíveis fixas detectadas: **${hardcodedVisibleStrings}**.`,
    `- Cobertura medida neste subconjunto: **${percentage.toFixed(1)}%**.`,
    `- Catálogos exigidos: pt-BR, en-US e es-ES; paridade, placeholders e chaves vazias são verificados por \`npm run test:i18n-catalog\`.`,
    '',
    '| Módulo | Chamadas traduzidas | Strings fixas detectadas | Cobertura medida |',
    '| --- | ---: | ---: | ---: |',
    ...rows,
    '',
  ].join('\n')
  await writeFile(new URL('../docs/I18N_COVERAGE.md', import.meta.url), report, 'utf8')
}
console.log('Internationalization coverage inventory (static JSX labels and t/translate calls; dynamic server text is excluded)')
console.log(`Detected translated call sites: ${translatedCalls}`)
console.log(`Detected hardcoded visible strings: ${hardcodedVisibleStrings}`)
console.log(`Measured coverage for this static subset: ${percentage.toFixed(1)}%`)
console.log('Per module: translated call sites / detected hardcoded visible strings / measured coverage')
for (const [file, counts] of sortedModules) {
  const total = counts.translated + counts.hardcoded
  const ratio = total ? (counts.translated / total) * 100 : 100
  console.log(`${file}\t${counts.translated}\t${counts.hardcoded}\t${ratio.toFixed(1)}%`)
}
