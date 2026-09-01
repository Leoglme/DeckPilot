import type { H3Event } from 'h3'
import { createError, readBody } from 'h3'
import { normalizeToken, touchSession } from '../../utils/relayStore'

interface RegisterBody {
  token: string
}

/** Desktop heartbeat — keeps the pairing session alive for the mobile PWA. */
export default defineEventHandler(async (event: H3Event): Promise<{ ok: true }> => {
  const body: RegisterBody = await readBody<RegisterBody>(event)
  const token: string | null = normalizeToken(body?.token)
  if (!token) {
    throw createError({ statusCode: 400, message: 'Token invalide' })
  }
  touchSession(token)
  return { ok: true }
})
