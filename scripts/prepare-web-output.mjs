import { copyFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outputDirectory = join(fileURLToPath(new URL('..', import.meta.url)), 'web-dist')
const indexFile = join(outputDirectory, 'index.html')
await access(indexFile)
await copyFile(indexFile, join(outputDirectory, 'vite.html'))
process.stdout.write('Web SPA fallback generated as vite.html for Square Cloud Sites.\n')
