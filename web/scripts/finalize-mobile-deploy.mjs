import { copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const mobileIndex = join(rootDir, 'mobile', 'index.html')
const outputIndex = join(rootDir, '.output', 'public', 'index.html')

if (!existsSync(mobileIndex)) {
  console.error('[finalize-mobile-deploy] mobile/index.html introuvable')
  process.exit(1)
}

copyFileSync(mobileIndex, outputIndex)
console.log('[finalize-mobile-deploy] index.html mobile copié vers .output/public/')
