import type { DesktopSession, RelayCommand, RelayStatusResponse } from '../types/Relay'

/** Desktop must heartbeat within this window for the PWA to show "connected". */
const CONNECTED_THRESHOLD_MS: number = 30_000

const sessions: Map<string, DesktopSession> = new Map<string, DesktopSession>()

/**
 * Normalize a pairing token from headers, query strings, or form input.
 *
 * @param raw - Raw token string.
 * @returns Lowercase trimmed token, or `null` when invalid.
 */
export function normalizeToken(raw: string | null | undefined): string | null {
  if (!raw) {
    return null
  }
  const token: string = raw.trim().toLowerCase()
  if (token.length < 6 || token.length > 32) {
    return null
  }
  return token
}

/**
 * Read the pairing token from the `X-DeckPilot-Token` request header.
 *
 * @param headers - Incoming request headers.
 * @returns Normalized token, or `null`.
 */
export function readTokenHeader(headers: Headers): string | null {
  return normalizeToken(headers.get('x-deckpilot-token'))
}

/**
 * Record a desktop heartbeat for the given pairing token.
 *
 * @param token - Normalized pairing token.
 */
export function touchSession(token: string): void {
  const existing: DesktopSession | undefined = sessions.get(token)
  const session: DesktopSession = existing ?? { lastSeen: 0, commands: [] }
  session.lastSeen = Date.now()
  sessions.set(token, session)
}

/**
 * Whether the desktop client recently heartbeated for this token.
 *
 * @param token - Normalized pairing token.
 * @returns `true` when the desktop is considered online.
 */
export function isConnected(token: string): boolean {
  const session: DesktopSession | undefined = sessions.get(token)
  if (!session) {
    return false
  }
  return Date.now() - session.lastSeen < CONNECTED_THRESHOLD_MS
}

/**
 * Queue a colour command for the desktop to pick up on its next poll.
 *
 * @param token - Normalized pairing token.
 * @param command - Command to execute on the PC.
 * @returns `true` when the command was queued.
 */
export function enqueueCommand(token: string, command: RelayCommand): boolean {
  const existing: DesktopSession | undefined = sessions.get(token)
  const session: DesktopSession = existing ?? { lastSeen: 0, commands: [] }
  if (!existing) {
    sessions.set(token, session)
  }
  session.commands.push(command)
  return true
}

/**
 * Drain and clear pending commands for a desktop poll.
 *
 * @param token - Normalized pairing token.
 * @returns Commands queued since the last poll.
 */
export function drainCommands(token: string): RelayCommand[] {
  const session: DesktopSession | undefined = sessions.get(token)
  if (!session) {
    return []
  }
  const pending: RelayCommand[] = session.commands
  session.commands = []
  return pending
}

/**
 * Build the connection status payload for the mobile PWA footer.
 *
 * @param token - Normalized pairing token.
 * @returns Connection status for the PWA.
 */
export function getSessionStatus(token: string): RelayStatusResponse {
  const session: DesktopSession | undefined = sessions.get(token)
  if (!session) {
    return { connected: false, lastSeen: null }
  }
  return {
    connected: isConnected(token),
    lastSeen: session.lastSeen,
  }
}
