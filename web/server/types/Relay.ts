/** A colour command queued for the desktop client to execute. */
export type RelayCommand =
  | { type: 'all'; r: number; g: number; b: number }
  | { type: 'slot'; slot: string; r: number; g: number; b: number }
  | { type: 'gradient'; colors: [number, number, number][] }

/** In-memory desktop session tracked by pairing token. */
export interface DesktopSession {
  lastSeen: number
  commands: RelayCommand[]
}

/** Response body for `GET /api/status`. */
export interface RelayStatusResponse {
  connected: boolean
  lastSeen: number | null
}

/** Response body for `GET /api/relay/poll`. */
export interface RelayPollResponse {
  ok: true
  commands: RelayCommand[]
}
