import type { LightingScene, PcComponent, PcComponentId } from '~/types/Lighting'
import type { RgbDevice } from '~/types/RgbDevice'

const RIG_COMPONENTS: PcComponent[] = [
  {
    id: 'gpu',
    category: 'Carte graphique',
    model: 'RTX 4070 Ti',
    brand: 'PNY',
    color: '#28D7F0',
    gradient: null,
    effect: 'static',
    brightness: 100,
    isOn: true,
    zones: 2,
    detected: false,
  },
  {
    id: 'mobo',
    category: 'Carte mère',
    model: 'B850 Aorus Elite',
    brand: 'Gigabyte',
    color: '#A855F7',
    gradient: null,
    effect: 'static',
    brightness: 100,
    isOn: true,
    zones: 5,
    detected: false,
  },
  {
    id: 'aio',
    category: 'Watercooling',
    model: 'Liquid Cooler 280',
    brand: 'Aorus',
    color: '#FF4D8D',
    gradient: null,
    effect: 'static',
    brightness: 100,
    isOn: true,
    zones: 1,
    detected: false,
  },
  {
    id: 'fans',
    category: 'Ventilateurs',
    model: 'RS120-R ARGB ×3',
    brand: 'Corsair',
    color: '#34E0C4',
    gradient: null,
    effect: 'static',
    brightness: 100,
    isOn: true,
    zones: 24,
    detected: false,
  },
]

/** Keywords that map a real OpenRGB controller name to a physical tower slot. */
const SLOT_KEYWORDS: Record<PcComponentId, string[]> = {
  gpu: ['rtx', 'gtx', 'geforce', 'radeon', 'nvidia', 'graphics', 'gpu', 'arc a'],
  ram: ['dram', 'ddr', 'trident', 'vengeance', 'dominator', 'fury', 'ripjaws', 'ram'],
  aio: ['liquid', 'water', 'aio', 'kraken', 'capellix', 'galahad', 'cooler'],
  fans: ['fan', 'argb', 'a-rgb', 'addressable', 'strip', 'll120', 'll140', 'ql120', 'sp120', 'rs120'],
  mobo: [
    'aorus',
    'motherboard',
    'mainboard',
    'b850',
    'b650',
    'b550',
    'x670',
    'x870',
    'z790',
    'z890',
    'b760',
    'z690',
    'x570',
    'mystic light',
  ],
  case: ['case', 'node', 'commander', 'lian li', 'o11'],
}

const AMBIANCE_SCENES: LightingScene[] = [
  { id: 'abyss', name: 'Abyss', description: 'cyan · violet', colors: ['#00E5FF', '#7A1FFF', '#1E4DFF'] },
  { id: 'nebula', name: 'Nebula', description: 'violet · bleu', colors: ['#2A0057', '#170080', '#0300A0'] },
  { id: 'gaming', name: 'Gaming', description: 'magenta · cyan', colors: ['#FF0099', '#00E5FF', '#A200FF'] },
  { id: 'sunset', name: 'Sunset', description: 'coucher de soleil', colors: ['#FF5A00', '#D6002E', '#5B1A8F'] },
  { id: 'toxic', name: 'Toxic', description: 'vert acide', colors: ['#AEFF00', '#00FF66', '#00C853'] },
  { id: 'night', name: 'Night', description: 'tamisé', colors: ['#2439FF', '#6A00CC', '#12123A'] },
]

/** Access to the machine's RGB devices and ambiance presets. */
export class LightingService {
  /**
   * The demo component skeleton shown before (and instead of) real detection.
   * @returns The list of physical components with their default look.
   */
  static async listComponents(): Promise<PcComponent[]> {
    return RIG_COMPONENTS.map((component: PcComponent): PcComponent => ({ ...component }))
  }

  /**
   * The built-in ambiance presets.
   * @returns The list of scenes.
   */
  static listScenes(): LightingScene[] {
    return AMBIANCE_SCENES.map((scene: LightingScene): LightingScene => ({ ...scene }))
  }

  /**
   * Reconcile the physical slots with the machine's real OpenRGB controllers: a slot
   * matched by a real device goes live (its real name and LED count), the rest stay muted.
   * @param components - The physical slot skeleton.
   * @param devices - The controllers OpenRGB actually detected.
   * @returns The components flagged detected/undetected against the real hardware.
   */
  static applyDetectedDevices(components: PcComponent[], devices: RgbDevice[]): PcComponent[] {
    return components.map((component: PcComponent): PcComponent => {
      const match: RgbDevice | undefined = devices.find(
        (device: RgbDevice): boolean => LightingService.matchSlot(device.name) === component.id,
      )
      if (!match) {
        return { ...component, detected: false }
      }
      return { ...component, detected: true, model: match.name, zones: match.ledCount }
    })
  }

  /**
   * Find which physical slot a real controller name belongs to.
   * @param name - The OpenRGB controller name.
   * @returns The matching slot id, or null when nothing fits.
   */
  private static matchSlot(name: string): PcComponentId | null {
    const haystack: string = name.toLowerCase()
    const order: PcComponentId[] = ['gpu', 'ram', 'aio', 'fans', 'mobo', 'case']
    for (const slot of order) {
      if (SLOT_KEYWORDS[slot].some((keyword: string): boolean => haystack.includes(keyword))) {
        return slot
      }
    }
    return null
  }
}
