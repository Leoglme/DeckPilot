import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const mobileIndex = join(rootDir, 'mobile', 'index.html')
const towerPartial = join(rootDir, 'mobile', 'preview-tower.html')
const previewCssSource = join(rootDir, 'app', 'assets', 'css', 'pc-preview-3d.css')
const outputIndex = join(rootDir, '.output', 'public', 'index.html')
const outputCss = join(rootDir, '.output', 'public', 'pc-preview-3d.css')
const placeholder = '<!-- PREVIEW_TOWER -->'

if (!existsSync(mobileIndex)) {
  console.error('[finalize-mobile-deploy] mobile/index.html introuvable')
  process.exit(1)
}

let html = readFileSync(mobileIndex, 'utf8')
if (existsSync(towerPartial)) {
  const tower = readFileSync(towerPartial, 'utf8').trim()
  html = html.replace(placeholder, tower)
}

writeFileSync(outputIndex, html)

if (existsSync(previewCssSource)) {
  copyFileSync(previewCssSource, outputCss)
}

console.log('[finalize-mobile-deploy] PWA mobile assemblée vers .output/public/')
