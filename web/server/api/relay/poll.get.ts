import type { H3Event } from 'h3'
import { createError } from 'h3'
import type { RelayPollResponse } from '../../types/Relay'
import { drainCommands, normalizeToken, touchSession } from '../../utils/relayStore'

/** Desktop long-poll endpoint — drains queued colour commands for the paired token. */
export default defineEventHandler((event: H3Event): RelayPollResponse => {
  const query: Record<string, string | string[] | undefined> = getQuery(event)
  const raw: string | string[] | undefined = query.token
  const token: string | null = normalizeToken(typeof raw === 'string' ? raw : null)
  if (!token) {
    throw createError({ statusCode: 400, message: 'Token requis' })
  }
  touchSession(token)
  return { ok: true, commands: drainCommands(token) }
})
