import { copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const mobileIndex = join(rootDir, 'mobile', 'index.html')
const publicIndex = join(rootDir, 'public', 'index.html')

if (!existsSync(mobileIndex)) {
  console.error('[use-mobile-index] mobile/index.html introuvable')
  process.exit(1)
}

copyFileSync(mobileIndex, publicIndex)
console.log('[use-mobile-index] public/index.html ← mobile/index.html')
