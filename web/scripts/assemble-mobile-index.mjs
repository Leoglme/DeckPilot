import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const mobileIndex = join(rootDir, 'mobile', 'index.html')
const towerPartial = join(rootDir, 'mobile', 'preview-tower.html')
const previewCssSource = join(rootDir, 'app', 'assets', 'css', 'pc-preview-3d.css')
const previewCssPublic = join(rootDir, 'public', 'pc-preview-3d.css')
const placeholder = '<!-- PREVIEW_TOWER -->'

/**
 * Inject the 3D tower markup into the mobile shell and sync preview CSS to public/.
 *
 * @param {string} targetIndex - Destination index.html path.
 */
function assembleMobileIndex(targetIndex) {
  if (!existsSync(mobileIndex)) {
    console.error('[assemble-mobile] mobile/index.html introuvable')
    process.exit(1)
  }
  if (!existsSync(towerPartial)) {
    console.error('[assemble-mobile] mobile/preview-tower.html introuvable')
    process.exit(1)
  }

  let html = readFileSync(mobileIndex, 'utf8')
  const tower = readFileSync(towerPartial, 'utf8').trim()
  if (!html.includes(placeholder)) {
    console.error('[assemble-mobile] placeholder PREVIEW_TOWER manquant dans mobile/index.html')
    process.exit(1)
  }
  html = html.replace(placeholder, tower)
  writeFileSync(targetIndex, html)
}

if (existsSync(previewCssSource)) {
  copyFileSync(previewCssSource, previewCssPublic)
  console.log('[assemble-mobile] pc-preview-3d.css → public/')
}

const publicIndex = join(rootDir, 'public', 'index.html')
assembleMobileIndex(publicIndex)
console.log('[assemble-mobile] public/index.html assemblé')
