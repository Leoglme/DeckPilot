<template>
  <div class="app-card dp-pc-preview" :data-fx="previewFx" :data-power="powerOn ? 'on' : 'off'" :style="previewColors">
    <div class="dp-pv-frame" aria-hidden="true" />

    <div class="aurora" aria-hidden="true">
      <span class="a1" />
      <span class="a2" />
      <span class="a3" />
    </div>

    <div
      ref="stageRef"
      class="stage"
      :class="{ 'stage--dragging': dragging }"
      :data-scope="store.scope"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
    >
      <div ref="pivotRef" class="pivot">
        <div class="pc">
          <div class="floor" aria-hidden="true" />

          <div class="part shell" aria-hidden="true">
            <div class="sk tray" />
            <div class="sk back" />
            <div class="sk psu-top" />
            <div class="sk psu-face" />
            <div class="sk psu-end" />
            <div class="sk top" />
            <div class="sk bottom" />
            <div class="sk striptop" />
            <div class="sk glass" />
            <div class="sk glass-front" />
          </div>

          <div
            class="part"
            data-part="mobo"
            :class="partClass('mobo')"
            role="button"
            tabindex="0"
            aria-label="Régler la carte mère"
            @keydown.enter="onPartActivate('mobo')"
          >
            <div class="sk mobo-board">
              <span class="io" />
              <span class="vrm" />
              <span class="socket" />
              <span class="m2" />
              <span class="pcie" />
              <span class="chipset" />
            </div>
            <div class="sk mobo-strip" />
          </div>

          <div class="part" aria-hidden="true">
            <div
              v-for="stick in RAM_STICKS"
              :key="stick.offsetX"
              class="sk ram-stick"
              :style="{ '--rx3d': stick.offsetX }"
            />
          </div>

          <div
            class="part"
            data-part="aio"
            :class="partClass('aio')"
            role="button"
            tabindex="0"
            aria-label="Régler le watercooling"
            @keydown.enter="onPartActivate('aio')"
          >
            <div class="sk rad-top" />
            <div class="sk rad-back" />
            <div class="sk rad-bottom" />
            <div class="sk rad-cap rad-cap--l" />
            <div class="sk rad-cap rad-cap--r" />
            <div class="sk rad-front"><i>LIQUID · 280</i></div>
            <div class="sk fan fan--slim fan--r1" :style="{ '--fc': aioColor }">
              <span class="fan-face fan-face--b" />
              <span class="blades" />
              <span class="hub" />
              <span class="fan-face fan-face--f" />
              <span class="fan-s fan-s--t" />
              <span class="fan-s fan-s--b" />
              <span class="fan-s fan-s--l" />
              <span class="fan-s fan-s--r" />
            </div>
            <div class="sk fan fan--slim fan--r2" :style="{ '--fc': aioColor }">
              <span class="fan-face fan-face--b" />
              <span class="blades" />
              <span class="hub" />
              <span class="fan-face fan-face--f" />
              <span class="fan-s fan-s--t" />
              <span class="fan-s fan-s--b" />
              <span class="fan-s fan-s--l" />
              <span class="fan-s fan-s--r" />
            </div>
            <div class="sk rad-glow" />
            <span class="sk pump-base-s pump-base-s--t" />
            <span class="sk pump-base-s pump-base-s--b" />
            <span class="sk pump-base-s pump-base-s--l" />
            <span class="sk pump-base-s pump-base-s--r" />
            <div class="sk pump-base" />
            <div class="sk tubes" aria-hidden="true">
              <svg viewBox="0 0 220 170" fill="none">
                <path d="M116 36 C 140 78, 96 96, 62 118" stroke="#241d33" stroke-width="9" stroke-linecap="round" />
                <path
                  d="M116 36 C 140 78, 96 96, 62 118"
                  stroke="rgba(255,255,255,0.16)"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <path d="M138 36 C 168 88, 118 108, 84 124" stroke="#241d33" stroke-width="9" stroke-linecap="round" />
                <path
                  d="M138 36 C 168 88, 118 108, 84 124"
                  stroke="rgba(255,255,255,0.16)"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <span
              v-for="(segment, index) in PUMP_SEGMENTS"
              :key="`seg-${index}`"
              class="sk pump-seg"
              :style="{ '--a': segment.angle, '--lum': segment.luminance }"
            />
            <span
              v-for="(segment, index) in PUMP_RIMS"
              :key="`rim-${index}`"
              class="sk pump-rim"
              :style="{ '--a': segment.angle, '--lum': segment.luminance }"
            />
            <div class="sk pump-cap"><span class="pumpring" /></div>
          </div>

          <div
            class="part"
            data-part="gpu"
            :class="partClass('gpu')"
            role="button"
            tabindex="0"
            aria-label="Régler la carte graphique"
            @keydown.enter="onPartActivate('gpu')"
          >
            <div class="sk gpu-top" />
            <div class="sk gpu-side"><span class="gpustrip" /></div>
            <div class="sk gpu-end" />
          </div>

          <div
            class="part"
            data-part="fans"
            :class="partClass('fans')"
            :style="{ '--fc': fansColor }"
            role="button"
            tabindex="0"
            aria-label="Régler les ventilateurs du boîtier"
            @keydown.enter="onPartActivate('fans')"
          >
            <div class="sk fans-bracket" />
            <div v-for="fanClass in CASE_FAN_CLASSES" :key="fanClass" class="sk fan" :class="fanClass">
              <span class="fan-face fan-face--b" />
              <span class="blades" />
              <span class="hub" />
              <span class="fan-face fan-face--f" />
              <span class="fan-s fan-s--t" />
              <span class="fan-s fan-s--b" />
              <span class="fan-s fan-s--l" />
              <span class="fan-s fan-s--r" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="hud">
      <div class="hud-top">
        <span class="live" :class="{ 'live--hw': store.hardwareDevices.length > 0 }">
          <i /><span>{{ hardwareLabel }}</span>
        </span>
      </div>

      <div class="hud-bottom">
        <div class="scene-meta">
          <span class="app-label">Scène</span>
          <h2>{{ sceneName }}</h2>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ComputedRef, Ref } from 'vue'
import type { PcPreviewPumpSegment, PcPreviewRamStick } from '~/types/PcPreview'
import type { LightingEffect, PcComponent, PcComponentId } from '~/types/Lighting'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useLightingStore } from '~/stores/lighting'

const store: ReturnType<typeof useLightingStore> = useLightingStore()

const RAM_STICKS: PcPreviewRamStick[] = [
  { offsetX: '88px' },
  { offsetX: '108px' },
  { offsetX: '128px' },
  { offsetX: '148px' },
]

const CASE_FAN_CLASSES: string[] = ['fan--f1', 'fan--f2', 'fan--f3', 'fan--rear']

const PUMP_SEGMENTS: PcPreviewPumpSegment[] = [
  { angle: '0deg', luminance: '1.3' },
  { angle: '30deg', luminance: '1.18' },
  { angle: '60deg', luminance: '1.02' },
  { angle: '90deg', luminance: '0.86' },
  { angle: '120deg', luminance: '0.74' },
  { angle: '150deg', luminance: '0.66' },
  { angle: '180deg', luminance: '0.64' },
  { angle: '210deg', luminance: '0.66' },
  { angle: '240deg', luminance: '0.74' },
  { angle: '270deg', luminance: '0.86' },
  { angle: '300deg', luminance: '1.02' },
  { angle: '330deg', luminance: '1.18' },
]

const PUMP_RIMS: PcPreviewPumpSegment[] = [
  { angle: '0deg', luminance: '1.2' },
  { angle: '30deg', luminance: '1.12' },
  { angle: '60deg', luminance: '1' },
  { angle: '90deg', luminance: '0.88' },
  { angle: '120deg', luminance: '0.78' },
  { angle: '150deg', luminance: '0.72' },
  { angle: '180deg', luminance: '0.7' },
  { angle: '210deg', luminance: '0.72' },
  { angle: '240deg', luminance: '0.78' },
  { angle: '270deg', luminance: '0.88' },
  { angle: '300deg', luminance: '1' },
  { angle: '330deg', luminance: '1.12' },
]

const stageRef: Ref<HTMLElement | null> = ref(null)
const pivotRef: Ref<HTMLElement | null> = ref(null)
const dragging: Ref<boolean> = ref(false)
const pointerMoved: Ref<number> = ref(0)
const pointerX: Ref<number> = ref(0)
const pointerY: Ref<number> = ref(0)
const rotateY: Ref<number> = ref(-32)
const rotateX: Ref<number> = ref(-14)
const zoom: Ref<number> = ref(0.78)
const lastTouch: Ref<number> = ref(0)
const sway: Ref<number> = ref(1)

let frameId: number = 0
const partClickCleanups: Array<() => void> = []

const hardwareLabel: ComputedRef<string> = computed((): string =>
  store.hardwareDevices.length > 0 ? `${store.hardwareDevices.length} pilotés en direct` : 'aperçu temps réel',
)

const sceneName: ComputedRef<string> = computed((): string =>
  store.allColorOverride ? 'Perso' : (store.activeScene?.name ?? '—'),
)

const powerOn: ComputedRef<boolean> = computed((): boolean => store.masterOn)

const moboColor: ComputedRef<string> = computed((): string => scaledComponentColor('mobo'))
const aioColor: ComputedRef<string> = computed((): string => scaledComponentColor('aio'))
const gpuColor: ComputedRef<string> = computed((): string => scaledComponentColor('gpu'))
const fansColor: ComputedRef<string> = computed((): string => scaledComponentColor('fans'))

const previewColors: ComputedRef<Record<string, string>> = computed((): Record<string, string> => ({
  '--c1': moboColor.value,
  '--c2': aioColor.value,
  '--c3': gpuColor.value,
}))

const previewFx: ComputedRef<string> = computed((): string => {
  if (store.scope !== 'all') {
    return mapPreviewFx(store.scopedComponent?.effect ?? 'wave')
  }
  const effects: LightingEffect[] = store.components.map((component: PcComponent): LightingEffect => component.effect)
  const allSame: boolean = effects.every((effect: LightingEffect): boolean => effect === effects[0])
  return mapPreviewFx(allSame ? (effects[0] ?? 'wave') : 'wave')
})

/**
 * The rig component behind a tower part.
 * @param id - The component id of the part.
 * @returns The matching component, or undefined.
 */
function componentOf(id: PcComponentId): PcComponent | undefined {
  return store.components.find((component: PcComponent): boolean => component.id === id)
}

/**
 * Scale a component's colour by its brightness for the 3D preview.
 * @param id - The component whose colour and brightness to apply.
 * @returns The dimmed hex colour, or a scene fallback when the slot is missing.
 */
function scaledComponentColor(id: PcComponentId): string {
  const component: PcComponent | undefined = componentOf(id)
  if (!component) {
    const fallbacks: Record<PcComponentId, string> = {
      mobo: 'var(--scene-a)',
      aio: 'var(--scene-b)',
      gpu: 'var(--scene-c)',
      fans: 'var(--scene-a)',
      ram: 'var(--scene-b)',
      case: 'var(--scene-c)',
    }
    return fallbacks[id]
  }
  return scaleHexBrightness(component.color, component.brightness)
}

/**
 * Dim a hex colour linearly to match the hardware brightness slider (0-100).
 * @param hex - The base colour.
 * @param brightness - The brightness percentage.
 * @returns The scaled hex colour.
 */
function scaleHexBrightness(hex: string, brightness: number): string {
  const factor: number = Math.max(0, Math.min(100, brightness)) / 100
  const value: string = hex.replace('#', '')
  if (value.length !== 6) {
    return hex
  }
  const int: number = Number.parseInt(value, 16)
  const r: number = Math.round(((int >> 16) & 255) * factor)
  const g: number = Math.round(((int >> 8) & 255) * factor)
  const b: number = Math.round((int & 255) * factor)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/**
 * Map store lighting effects to the mockup's data-fx attribute values.
 * @param effect - The store effect id.
 * @returns The mockup effect slug.
 */
function mapPreviewFx(effect: LightingEffect): string {
  if (effect === 'breathing' || effect === 'reactive') {
    return 'breathe'
  }
  return effect
}

/**
 * State classes of a tower part (focused scope, powered off).
 * @param id - The component id of the part.
 * @returns The conditional class map.
 */
function partClass(id: PcComponentId): Record<string, boolean> {
  const component: PcComponent | undefined = componentOf(id)
  return {
    'is-on': store.scope === id,
    'part--off': !(store.masterOn && (component?.isOn ?? true)),
  }
}

/**
 * Focus a component from keyboard activation.
 * @param id - The component id to focus.
 */
function onPartActivate(id: PcComponentId): void {
  store.selectScope(store.scope === id ? 'all' : id)
}

/**
 * Toggle or focus a component when the user clicks it (ignoring drag gestures).
 * @param id - The clicked component id.
 */
function onPartClick(id: PcComponentId): void {
  if (pointerMoved.value < 6) {
    store.selectScope(store.scope === id ? 'all' : id)
  }
}

/**
 * Start a camera drag on pointer down.
 * @param event - The pointer down event.
 */
function onPointerDown(event: PointerEvent): void {
  dragging.value = true
  pointerMoved.value = 0
  pointerX.value = event.clientX
  pointerY.value = event.clientY
  lastTouch.value = performance.now()
  stageRef.value?.classList.add('stage--dragging')
  stageRef.value?.setPointerCapture(event.pointerId)
}

/**
 * Update camera rotation while dragging.
 * @param event - The pointer move event.
 */
function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) {
    return
  }
  const deltaX: number = event.clientX - pointerX.value
  const deltaY: number = event.clientY - pointerY.value
  pointerMoved.value += Math.abs(deltaX) + Math.abs(deltaY)
  pointerX.value = event.clientX
  pointerY.value = event.clientY
  rotateY.value += deltaX * 0.35
  rotateX.value = Math.max(-44, Math.min(12, rotateX.value - deltaY * 0.25))
  lastTouch.value = performance.now()
}

/** End the camera drag. */
function onPointerUp(): void {
  dragging.value = false
  stageRef.value?.classList.remove('stage--dragging')
}

/**
 * Zoom the camera with the mouse wheel.
 * @param event - The wheel event.
 */
function onWheel(event: WheelEvent): void {
  zoom.value = Math.max(0.55, Math.min(1.6, zoom.value * (event.deltaY > 0 ? 0.92 : 1.08)))
  lastTouch.value = performance.now()
}

/**
 * Animate the idle camera sway and apply the pivot transform each frame.
 * @param time - The animation frame timestamp.
 */
function animateFrame(time: number): void {
  const idle: boolean = !dragging.value && time - lastTouch.value > 2600
  sway.value += ((idle ? 1 : 0) - sway.value) * 0.03
  const swayY: number = Math.sin(time / 2600) * 6 * sway.value
  const swayX: number = Math.cos(time / 3400) * 2.4 * sway.value
  if (pivotRef.value) {
    pivotRef.value.style.transform = `scale(${zoom.value}) rotateX(${rotateX.value + swayX}deg) rotateY(${rotateY.value + swayY}deg)`
  }
  frameId = requestAnimationFrame(animateFrame)
}

/**
 * Wire part click handlers exactly like the HTML mockup.
 */
function bindPartClicks(): void {
  const parts: NodeListOf<HTMLElement> | undefined = stageRef.value?.querySelectorAll('.part[data-part]')
  parts?.forEach((partEl: HTMLElement): void => {
    const handler: () => void = (): void => {
      const id: PcComponentId = partEl.dataset.part as PcComponentId
      onPartClick(id)
    }
    partEl.addEventListener('click', handler)
    partClickCleanups.push((): void => {
      partEl.removeEventListener('click', handler)
    })
  })
}

onMounted((): void => {
  bindPartClicks()
  frameId = requestAnimationFrame(animateFrame)
})

onUnmounted((): void => {
  cancelAnimationFrame(frameId)
  partClickCleanups.forEach((cleanup: () => void): void => {
    cleanup()
  })
})
</script>

<style src="~/assets/css/pc-preview-3d.css"></style>

<style scoped>
.dp-pv-frame {
  position: absolute;
  inset: 9px;
  z-index: 5;
  border: 1.5px solid transparent;
  border-radius: 15px;
  pointer-events: none;
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.dp-pc-preview {
  isolation: isolate;
  contain: layout paint;
}
</style>
