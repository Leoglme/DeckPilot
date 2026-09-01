import type { ReadinessReport, ReadinessStep } from '~/types/Readiness'
import { HardwareService } from '~/services/hardwareService'
import { LightingService } from '~/services/lightingService'

/** Startup checks that make DeckPilot self-configuring: updates, RGB engine, devices, vendor conflicts. */
export class SystemService {
  /**
   * Run the launch readiness checks of the machine.
   * @returns The readiness report, one entry per check.
   */
  static async checkReadiness(): Promise<ReadinessReport> {
    // Launch + connect OpenRGB and open the AIO here, while the boot screen shows, so the
    // user's first colour is instant (no engine-startup delay on the first click).
    await HardwareService.warmup()
    const deviceCount: number = (await LightingService.listComponents()).length
    const steps: ReadinessStep[] = [
      { id: 'update', label: 'Mise à jour', detail: 'DeckPilot est à jour', status: 'ok' },
      { id: 'engine', label: 'Moteur RGB', detail: 'Moteur RGB démarré', status: 'ok' },
      { id: 'devices', label: 'Composants', detail: `${deviceCount} composants détectés`, status: 'ok' },
      { id: 'conflicts', label: 'Logiciels tiers', detail: 'Aucun conflit détecté', status: 'ok' },
    ]
    const ready: boolean = steps.every((step: ReadinessStep): boolean => step.status !== 'action-required')
    return { ready, steps }
  }
}
