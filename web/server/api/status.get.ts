import type { H3Event } from 'h3'
import type { RelayStatusResponse } from '../types/Relay'
import { getSessionStatus, readTokenHeader } from '../utils/relayStore'

/** Report whether the paired desktop is currently connected to the cloud relay. */
export default defineEventHandler((event: H3Event): RelayStatusResponse => {
  const token: string | null = readTokenHeader(event.headers)
  if (!token) {
    return { connected: false, lastSeen: null }
  }
  return getSessionStatus(token)
})
