/**
 * Bridge to the cloud relay pairing commands exposed by the Tauri shell.
 */
export class RemoteService {
  /**
   * Whether the current runtime is the Tauri desktop shell.
   *
   * @returns `true` when `invoke` is available.
   */
  private static isDesktopRuntime(): boolean {
    return import.meta.client && '__TAURI_INTERNALS__' in window
  }

  /**
   * Return the persistent pairing code for this desktop install.
   *
   * @returns Eight-character pairing token.
   */
  static async getPairingToken(): Promise<string> {
    if (!RemoteService.isDesktopRuntime()) {
      return 'dev-token'
    }
    const { invoke }: { invoke: (cmd: string) => Promise<string> } = await import('@tauri-apps/api/core')
    return invoke('pairing_token')
  }

  /**
   * Return the PWA URL pre-filled with the pairing token.
   *
   * @returns Public télécommande URL for iPhone install.
   */
  static async getPwaUrl(): Promise<string> {
    if (!RemoteService.isDesktopRuntime()) {
      return 'https://deckpilote.dibodev.fr/?pair=dev-token'
    }
    const { invoke }: { invoke: (cmd: string) => Promise<string> } = await import('@tauri-apps/api/core')
    return invoke('pwa_url')
  }
}
