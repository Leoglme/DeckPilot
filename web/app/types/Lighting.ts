import type { RgbDevice } from '~/types/RgbDevice'

export type PcComponentId = 'gpu' | 'mobo' | 'aio' | 'fans' | 'ram' | 'case'

export type LightingScope = PcComponentId | 'all'

export type LightingEffect = 'static' | 'breathing' | 'wave' | 'cycle' | 'reactive'

export type LightingEffectOption = {
  id: LightingEffect
  label: string
}

export type SceneId = 'abyss' | 'nebula' | 'gaming' | 'sunset' | 'toxic' | 'night'

export type PcComponent = {
  id: PcComponentId
  category: string
  model: string
  brand: string
  color: string
  /** This component's base colours: null or one colour = solid, several = a gradient / scene spread. */
  gradient: string[] | null
  effect: LightingEffect
  brightness: number
  isOn: boolean
  zones: number
  detected: boolean
}

export type LightingScene = {
  id: SceneId
  name: string
  description: string
  colors: readonly [string, string, string]
}

export type LightingState = {
  scenes: LightingScene[]
  components: PcComponent[]
  activeSceneId: SceneId
  scope: LightingScope
  masterOn: boolean
  loaded: boolean
  allColorOverride: string | null
  hardwareDevices: RgbDevice[]
  isDetecting: boolean
}
