import type { H3Event } from 'h3'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Serve the mobile PWA shell at `/` when building for deckpilote.dibodev.fr.
 * The desktop Nuxt UI is only shipped inside the Tauri shell.
 */
export default defineEventHandler((event: H3Event): string | undefined => {
  if (process.env.NUXT_MOBILE_DEPLOY !== '1') {
    return undefined
  }
  const htmlPath: string = join(process.cwd(), 'mobile', 'index.html')
  const html: string = readFileSync(htmlPath, 'utf-8')
  setHeader(event, 'content-type', 'text/html; charset=utf-8')
  setHeader(event, 'cache-control', 'no-cache')
  return html
})
