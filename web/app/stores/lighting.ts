import { defineStore } from 'pinia'
import type {
  LightingEffect,
  LightingScene,
  LightingScope,
  LightingState,
  PcComponent,
  SceneId,
} from '~/types/Lighting'
import type { EngineSlot } from '~/types/Hardware'
import type { RgbDevice } from '~/types/RgbDevice'
import { HardwareService } from '~/services/hardwareService'
import { LightingService } from '~/services/lightingService'

/** Lighting control state: the active ambiance, the machine's components and the edit scope. */
export const useLightingStore = defineStore('lighting', {
  state: (): LightingState => ({
    scenes: [],
    components: [],
    activeSceneId: 'abyss',
    scope: 'all',
    masterOn: true,
    loaded: false,
    allColorOverride: null,
    hardwareDevices: [],
    isDetecting: false,
  }),

  getters: {
    /** The currently active ambiance preset, if any. */
    activeScene(state: LightingState): LightingScene | null {
      return state.scenes.find((scene: LightingScene): boolean => scene.id === state.activeSceneId) ?? null
    },

    /** The component currently being edited, or null when the scope is the whole rig. */
    scopedComponent(state: LightingState): PcComponent | null {
      if (state.scope === 'all') {
        return null
      }
      return state.components.find((component: PcComponent): boolean => component.id === state.scope) ?? null
    },
  },

  actions: {
    /** Load the ambiances, reconcile the physical slots with the real hardware, seed the engine. */
    async load(): Promise<void> {
      this.scenes = LightingService.listScenes()
      this.components = await LightingService.listComponents()
      this.loaded = true
      this.detectHardware()
      this.setScene(this.activeSceneId)
    },

    /**
     * Prepare the devices (Direct mode + ARGB zone sizes), detect the real controllers, and
     * reconcile the tower. Safe to call again (a rescan) once OpenRGB has finished starting up.
     */
    detectHardware(): void {
      this.isDetecting = true
      HardwareService.prepareDevices()
        .then((): Promise<RgbDevice[]> => HardwareService.getDevices())
        .then((devices: RgbDevice[]): Promise<boolean> => {
          this.hardwareDevices = devices
          if (devices.length > 0) {
            this.components = LightingService.applyDetectedDevices(this.components, devices)
          }
          return HardwareService.isAioPresent()
        })
        .then((aioPresent: boolean): void => {
          const aio: PcComponent | undefined = this.components.find(
            (component: PcComponent): boolean => component.id === 'aio',
          )
          if (aio && aioPresent) {
            aio.detected = true
            aio.model = 'Liquid Cooler 280'
          }
          // The case fans are ARGB zones on the motherboard controller — not a controller of
          // their own — so keyword matching never flags them. When the board is live, so are they.
          const mobo: PcComponent | undefined = this.components.find(
            (component: PcComponent): boolean => component.id === 'mobo',
          )
          const fans: PcComponent | undefined = this.components.find(
            (component: PcComponent): boolean => component.id === 'fans',
          )
          if (mobo?.detected && fans) {
            fans.detected = true
          }
        })
        .finally((): void => {
          this.isDetecting = false
          this.pushEngine()
        })
    },

    /**
     * Apply an ambiance preset to the whole rig and reset the scope to all. Each component keeps
     * the FULL scene as its base colours (so every device shows the spread) plus a distinct slice
     * as its solid colour (so the preview reads as varied, not flat).
     * @param sceneId - The scene to activate.
     */
    setScene(sceneId: SceneId): void {
      this.activeSceneId = sceneId
      this.scope = 'all'
      this.allColorOverride = null
      const scene: LightingScene | undefined = this.scenes.find((item: LightingScene): boolean => item.id === sceneId)
      if (scene) {
        this.components.forEach((component: PcComponent, index: number): void => {
          component.color = scene.colors[index % scene.colors.length] ?? component.color
          component.gradient = [...scene.colors]
        })
      }
      this.pushEngine()
    },

    /** Push every component's resolved look (effect + colours + brightness + on) to the engine. */
    pushEngine(): void {
      HardwareService.setEngineState(this.buildEngineSlots())
    },

    /**
     * Build the whole rig's live look for the engine: each component's effect, its base colours,
     * its brightness, and whether it is lit.
     * @returns One engine slot per physical component.
     */
    buildEngineSlots(): EngineSlot[] {
      return this.components.map((component: PcComponent): EngineSlot => ({
        slot: component.id,
        effect: component.effect,
        colors: this.resolveColors(component),
        brightness: component.brightness,
        on: this.masterOn && component.isOn,
      }))
    },

    /**
     * A component's base colours: its gradient/scene spread when it has one, else its solid colour.
     * @param component - The component to resolve.
     * @returns The colours the engine animates (1 = solid, several = a spread).
     */
    resolveColors(component: PcComponent): string[] {
      if (component.gradient && component.gradient.length > 0) {
        return component.gradient
      }
      return [component.color]
    },

    /**
     * Select which component (or the whole rig) the controls act on.
     * @param scope - The component id, or 'all'.
     */
    selectScope(scope: LightingScope): void {
      this.scope = scope
    },

    /**
     * Set the solid colour of the components covered by the current scope.
     * @param hex - The colour to apply.
     */
    setColor(hex: string): void {
      this.forEachScoped((component: PcComponent): void => {
        component.color = hex
        component.gradient = null
      })
      if (this.scope === 'all') {
        this.allColorOverride = hex
      }
      this.pushEngine()
    },

    /**
     * Apply a 2-colour gradient to the scoped component (e.g. the case fans, like the AIO).
     * @param colorA - The gradient's start colour.
     * @param colorB - The gradient's end colour.
     */
    setComponentGradient(colorA: string, colorB: string): void {
      const component: PcComponent | null = this.scopedComponent
      if (!component) {
        return
      }
      component.gradient = [colorA, colorB]
      component.color = colorA
      this.pushEngine()
    },

    /**
     * Set the brightness (0-100) of the current scope.
     * @param brightness - The brightness value; clamped to 0-100.
     */
    setBrightness(brightness: number): void {
      const clamped: number = Math.max(0, Math.min(100, Math.round(brightness)))
      this.forEachScoped((component: PcComponent): void => {
        component.brightness = clamped
      })
      this.pushEngine()
    },

    /**
     * Set the live effect of the current scope, and push it to hardware — the engine then animates
     * those components (breathing, wave, cycle, reactive) in sync with the rest of the rig.
     * @param effect - The effect to apply.
     */
    setEffect(effect: LightingEffect): void {
      this.forEachScoped((component: PcComponent): void => {
        component.effect = effect
      })
      this.pushEngine()
    },

    /**
     * Toggle a single component on/off.
     * @param componentId - The component to toggle.
     */
    toggleComponent(componentId: PcComponent['id']): void {
      const target: PcComponent | undefined = this.components.find(
        (component: PcComponent): boolean => component.id === componentId,
      )
      if (target) {
        target.isOn = !target.isOn
      }
      this.pushEngine()
    },

    /** Toggle the whole rig on/off. */
    toggleMaster(): void {
      this.masterOn = !this.masterOn
      this.components.forEach((component: PcComponent): void => {
        component.isOn = this.masterOn
      })
      this.pushEngine()
    },

    /**
     * Run a mutation over the components covered by the current scope.
     * @param mutate - Mutation applied to each in-scope component.
     */
    forEachScoped(mutate: (component: PcComponent) => void): void {
      this.components.forEach((component: PcComponent): void => {
        if (this.scope === 'all' || component.id === this.scope) {
          mutate(component)
        }
      })
    },
  },
})
