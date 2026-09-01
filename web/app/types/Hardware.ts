import type { LightingEffect, PcComponentId } from '~/types/Lighting'

/** One component's resolved live look, pushed to the Rust effect engine whenever it changes. */
export type EngineSlot = {
  slot: PcComponentId
  effect: LightingEffect
  /** Base colours as hex (1 = solid, several = a gradient / scene spread). */
  colors: string[]
  brightness: number
  on: boolean
}

/** The engine payload as the Rust command expects it: colours as `[r, g, b]` channels. */
export type EnginePayloadSlot = {
  slot: PcComponentId
  effect: LightingEffect
  colors: [number, number, number][]
  brightness: number
  on: boolean
}
