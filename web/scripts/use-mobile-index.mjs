import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const assembleScript = join(rootDir, 'scripts', 'assemble-mobile-index.mjs')

if (!existsSync(assembleScript)) {
  console.error('[use-mobile-index] assemble-mobile-index.mjs introuvable')
  process.exit(1)
}

await import(assembleScript)
