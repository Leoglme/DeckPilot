import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const publicDir = join(rootDir, 'public')

/** Brand colours for the RGB ring (matches `AppLogo.vue`). */
const RING_COLORS = ['#28d7f0', '#8b5cf6', '#ff4d8d', '#ffb020', '#34e0c4', '#28d7f0']

/** Output PNG sizes — same layout as DevLeadHunter (`apple-touch-icon` + android chrome). */
const OUTPUTS = [
  { fileName: 'apple-touch-icon.png', size: 180 },
  { fileName: 'android-chrome-192x192.png', size: 192 },
  { fileName: 'android-chrome-512x512.png', size: 512 },
]

/**
 * Build one SVG wedge for the spectrum ring.
 *
 * @param {number} cx - Center X.
 * @param {number} cy - Center Y.
 * @param {number} innerR - Inner radius.
 * @param {number} outerR - Outer radius.
 * @param {number} startAngle - Start angle in radians.
 * @param {number} endAngle - End angle in radians.
 * @param {string} fill - Segment fill colour.
 * @returns {string} SVG path markup.
 */
function wedgePath(cx, cy, innerR, outerR, startAngle, endAngle, fill) {
  const x1 = cx + outerR * Math.cos(startAngle)
  const y1 = cy + outerR * Math.sin(startAngle)
  const x2 = cx + outerR * Math.cos(endAngle)
  const y2 = cy + outerR * Math.sin(endAngle)
  const x3 = cx + innerR * Math.cos(endAngle)
  const y3 = cy + innerR * Math.sin(endAngle)
  const x4 = cx + innerR * Math.cos(startAngle)
  const y4 = cy + innerR * Math.sin(startAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `<path d="M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z" fill="${fill}" />`
}

/**
 * Build a full-bleed PWA icon SVG (no outer padding — iOS applies its own mask).
 *
 * @param {number} size - Canvas size in pixels.
 * @returns {string} SVG source string.
 */
function buildIconSvg(size) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.34
  const innerR = size * 0.156
  const coreR = size * 0.086
  const segmentCount = RING_COLORS.length - 1
  const startDeg = 135
  const wedges = []

  for (let index = 0; index < segmentCount; index += 1) {
    const startAngle = ((startDeg + (index * 360) / segmentCount) * Math.PI) / 180
    const endAngle = ((startDeg + ((index + 1) * 360) / segmentCount) * Math.PI) / 180
    wedges.push(wedgePath(cx, cy, innerR, outerR, startAngle, endAngle, RING_COLORS[index] ?? '#28d7f0'))
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none">
  <defs>
    <radialGradient id="bg" cx="30%" cy="18%" r="90%">
      <stop offset="0%" stop-color="#241b38" />
      <stop offset="72%" stop-color="#0b0812" />
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="#0C0A14" />
  <rect width="${size}" height="${size}" fill="url(#bg)" />
  ${wedges.join('\n  ')}
  <circle cx="${cx}" cy="${cy}" r="${coreR}" fill="#ffffff" />
</svg>`
}

/** Generate all PWA PNG icons from the vector source. */
async function main() {
  const masterSvg = buildIconSvg(512)
  await writeFile(join(publicDir, 'pwa-icon.svg'), masterSvg, 'utf-8')

  for (const output of OUTPUTS) {
    const targetPath = join(publicDir, output.fileName)
    await mkdir(dirname(targetPath), { recursive: true })
    await sharp(Buffer.from(masterSvg)).resize(output.size, output.size).png().toFile(targetPath)
    console.log(`[gen-pwa-icons] ${output.fileName} (${output.size}px)`)
  }
}

main().catch((error) => {
  console.error('[gen-pwa-icons] failed', error)
  process.exit(1)
})
