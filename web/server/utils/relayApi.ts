import type { H3Event } from 'h3'
import { createError, readBody } from 'h3'
import { enqueueCommand, isConnected, readTokenHeader } from './relayStore'
import type { RelayCommand, RelayCommandResponse } from '../types/Relay'

/**
 * Read and validate the pairing token from an API request.
 *
 * @param event - Incoming H3 event.
 * @returns Normalized pairing token.
 */
export function requireToken(event: H3Event): string {
  const token: string | null = readTokenHeader(event.headers)
  if (!token) {
    throw createError({ statusCode: 401, message: 'Code de liaison requis' })
  }
  return token
}

/**
 * Queue a relay command and return the standard API response.
 *
 * @param event - Incoming H3 event.
 * @param command - Colour command for the desktop.
 * @returns JSON body matching the legacy LAN remote API.
 */
export async function relayCommand(event: H3Event, command: RelayCommand): Promise<RelayCommandResponse> {
  const token: string = requireToken(event)
  const queued: boolean = enqueueCommand(token, command)
  if (!queued) {
    return { ok: false, error: 'PC injoignable' }
  }
  const updated: number = command.type === 'gradient' ? command.colors.length : 1
  return { ok: true, updated, connected: isConnected(token) }
}

/**
 * Parse a JSON request body and relay it through {@link relayCommand}.
 *
 * @param event - Incoming H3 event.
 * @param build - Maps the parsed body to a relay command.
 * @returns JSON body matching the legacy LAN remote API.
 */
export async function relayFromBody<T>(
  event: H3Event,
  build: (body: T) => RelayCommand | null,
): Promise<RelayCommandResponse> {
  const body: T = await readBody<T>(event)
  const command: RelayCommand | null = build(body)
  if (!command) {
    return { ok: false, error: 'requête invalide' }
  }
  return relayCommand(event, command)
}
