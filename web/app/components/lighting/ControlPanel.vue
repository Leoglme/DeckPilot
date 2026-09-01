<template>
  <div class="app-card dp-control">
    <div class="dp-scope">
      <button
        type="button"
        class="dp-scope__chip dp-scope__chip--all"
        :class="{ 'dp-scope__chip--active': store.scope === 'all' }"
        @click="store.selectScope('all')"
      >
        <span class="dp-scope__dot dp-scope__dot--all" />Tout
      </button>
      <button
        v-for="component in store.components"
        :key="component.id"
        type="button"
        class="dp-scope__chip"
        :class="{
          'dp-scope__chip--active': store.scope === component.id,
          'dp-scope__chip--live': component.detected,
          'dp-scope__chip--muted': store.hardwareDevices.length > 0 && !component.detected,
        }"
        :style="{ '--c': component.color }"
        @click="store.selectScope(component.id)"
      >
        <span class="dp-scope__dot" />{{ componentLabel(component) }}
      </button>
    </div>

    <button
      v-if="store.hardwareDevices.length > 0"
      type="button"
      class="dp-rescan"
      :disabled="store.isDetecting"
      @click="store.detectHardware()"
    >
      <UIcon
        :name="store.isDetecting ? 'i-lucide-loader-circle' : 'i-lucide-refresh-cw'"
        class="dp-rescan__icon"
        :class="{ 'dp-rescan__icon--spin': store.isDetecting }"
      />{{ store.isDetecting ? 'Rescan…' : 'Rescanner' }}
    </button>

    <p class="dp-scope-line">
      Je règle : <b>{{ scopeLabel }}</b>
    </p>

    <div class="dp-field dp-field--row">
      <span class="dp-power"><UIcon name="i-lucide-power" class="h-[18px] w-[18px]" />Allumé</span>
      <button
        type="button"
        role="switch"
        :aria-checked="scopedOn"
        aria-label="Allumé"
        class="dp-switch"
        :class="{ 'dp-switch--on': scopedOn }"
        @click="onTogglePower"
      />
    </div>

    <div class="dp-field">
      <div class="dp-field__label">
        Luminosité <span class="dp-field__value">{{ brightnessValue }}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        class="dp-range"
        :style="{ '--p': `${brightnessValue}%` }"
        :value="brightnessValue"
        aria-label="Luminosité"
        @input="onBrightnessInput"
      />
    </div>

    <div class="dp-field">
      <div class="dp-field__label">Couleur</div>
      <div class="dp-swatches">
        <button
          v-for="hex in SWATCHES"
          :key="hex"
          type="button"
          class="dp-swatch"
          :class="{ 'dp-swatch--active': isActiveColor(hex) }"
          :style="{ background: hex, color: hex }"
          :aria-label="`Couleur ${hex}`"
          @click="store.setColor(hex)"
        />
        <label class="dp-swatch dp-swatch--custom" :class="{ 'dp-swatch--active': isCustomActive }">
          <input
            type="color"
            class="dp-swatch__input"
            :value="customColor"
            aria-label="Couleur personnalisée"
            @input="onCustomColor"
          />
          <UIcon name="i-lucide-pipette" class="dp-swatch__pick" />
        </label>
      </div>
    </div>

    <div v-if="store.scope !== 'all'" class="dp-field">
      <div class="dp-field__label">Dégradé (2 couleurs)</div>
      <div class="dp-gradient">
        <label class="dp-grad-swatch" :style="{ background: gradientA }">
          <input
            type="color"
            class="dp-swatch__input"
            :value="gradientA"
            aria-label="Couleur de départ"
            @input="onGradientA"
          />
        </label>
        <span class="dp-gradient__bar" :style="{ background: `linear-gradient(90deg, ${gradientA}, ${gradientB})` }" />
        <label class="dp-grad-swatch" :style="{ background: gradientB }">
          <input
            type="color"
            class="dp-swatch__input"
            :value="gradientB"
            aria-label="Couleur de fin"
            @input="onGradientB"
          />
        </label>
      </div>
    </div>

    <div class="dp-field">
      <div class="dp-field__label">Effet</div>
      <div class="dp-effects">
        <button
          v-for="effect in EFFECTS"
          :key="effect.id"
          type="button"
          class="dp-effect"
          :class="{ 'dp-effect--active': currentEffect === effect.id }"
          @click="store.setEffect(effect.id)"
        >
          {{ effect.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ComputedRef, Ref } from 'vue'
import type { LightingEffect, LightingEffectOption, LightingScope, PcComponent } from '~/types/Lighting'
import { computed, ref } from 'vue'
import { useLightingStore } from '~/stores/lighting'

const store: ReturnType<typeof useLightingStore> = useLightingStore()

const SWATCHES: string[] = ['#00FFD5', '#8B00D6', '#F81683', '#FFD400', '#0400FF', '#FF0000', '#FFFFFF']

const customColor: Ref<string> = ref('#7C3AED')

const gradientA: Ref<string> = ref('#00FFD5')
const gradientB: Ref<string> = ref('#8B00D6')

const EFFECTS: LightingEffectOption[] = [
  { id: 'static', label: 'Fixe' },
  { id: 'breathing', label: 'Respire' },
  { id: 'wave', label: 'Vague' },
  { id: 'cycle', label: 'Cycle' },
  { id: 'reactive', label: 'Réactif' },
]

/**
 * The label of a component: its real model when live, a generic category when the hardware
 * is connected but this slot is not detected by OpenRGB.
 * @param component - The component to label.
 * @returns The display label.
 */
const componentLabel: (component: PcComponent) => string = (component: PcComponent): string =>
  store.hardwareDevices.length > 0 && !component.detected ? component.category : component.model

const scopeLabel: ComputedRef<string> = computed((): string => {
  if (store.scope === 'all') {
    return `Tout · ${store.components.length} composants`
  }
  return store.scopedComponent ? componentLabel(store.scopedComponent) : '—'
})

/** The component whose values feed the controls (the scoped one, or the first for the whole rig). */
const representative: ComputedRef<PcComponent | null> = computed(
  (): PcComponent | null => store.scopedComponent ?? store.components[0] ?? null,
)

/** Whether the active colour is a custom one (not one of the preset swatches). */
const isCustomActive: ComputedRef<boolean> = computed((): boolean => {
  const current: string = (representative.value?.color ?? '').toUpperCase()
  return current !== '' && !SWATCHES.some((hex: string): boolean => hex.toUpperCase() === current)
})

const scopedOn: ComputedRef<boolean> = computed((): boolean =>
  store.scope === 'all' ? store.masterOn : (store.scopedComponent?.isOn ?? true),
)

const brightnessValue: ComputedRef<number> = computed((): number => representative.value?.brightness ?? 100)

const currentEffect: ComputedRef<LightingEffect> = computed(
  (): LightingEffect => representative.value?.effect ?? 'static',
)

/** Toggle power for the current scope (whole rig or a single component). */
function onTogglePower(): void {
  const scope: LightingScope = store.scope
  if (scope === 'all') {
    store.toggleMaster()
  } else {
    store.toggleComponent(scope)
  }
}

/**
 * Apply the slider value as the scope brightness.
 * @param event - The range input event.
 */
function onBrightnessInput(event: Event): void {
  const target: HTMLInputElement = event.target as HTMLInputElement
  store.setBrightness(Number(target.value))
}

/**
 * Apply a colour chosen from the custom colour picker.
 * @param event - The colour input event.
 */
function onCustomColor(event: Event): void {
  const target: HTMLInputElement = event.target as HTMLInputElement
  customColor.value = target.value
  store.setColor(target.value)
}

/**
 * Apply the gradient's start colour from its picker.
 * @param event - The colour input event.
 */
function onGradientA(event: Event): void {
  gradientA.value = (event.target as HTMLInputElement).value
  store.setComponentGradient(gradientA.value, gradientB.value)
}

/**
 * Apply the gradient's end colour from its picker.
 * @param event - The colour input event.
 */
function onGradientB(event: Event): void {
  gradientB.value = (event.target as HTMLInputElement).value
  store.setComponentGradient(gradientA.value, gradientB.value)
}

/**
 * Whether a swatch matches the current scope color.
 * @param hex - The swatch color.
 * @returns True when it is the active color.
 */
function isActiveColor(hex: string): boolean {
  return (representative.value?.color ?? '').toUpperCase() === hex.toUpperCase()
}
</script>

<style scoped>
.dp-control {
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.dp-scope {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.dp-scope__chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--app-line);
  border-radius: 999px;
  background: var(--app-surface-2);
  padding: 8px 13px 8px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-ink-soft);
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.dp-scope__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c, var(--app-ink));
  box-shadow: 0 0 7px var(--c, transparent);
}

.dp-scope__dot--all {
  background: conic-gradient(#28d7f0, #8b5cf6, #ff4d8d, #34e0c4, #ffb020, #28d7f0);
  box-shadow: none;
}

.dp-scope__chip:hover {
  color: var(--app-ink);
  background: var(--app-surface-3);
}

.dp-scope__chip--active {
  color: var(--app-ink);
  border-color: color-mix(in srgb, var(--c, var(--scene-a)) 60%, transparent);
  background: color-mix(in srgb, var(--c, var(--scene-a)) 15%, var(--app-surface-2));
}

/* a slot backed by a real detected controller: a green live ring on its dot */
.dp-scope__chip--live .dp-scope__dot {
  box-shadow:
    0 0 7px var(--c, transparent),
    0 0 0 2px color-mix(in srgb, var(--app-ok) 65%, transparent);
}

/* hardware connected but this slot is not controlled by OpenRGB yet: muted */
.dp-scope__chip--muted {
  opacity: 0.5;
}

.dp-rescan {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  margin-top: 12px;
  border: 1px solid var(--app-line);
  border-radius: 999px;
  background: var(--app-surface-2);
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--app-ink-soft);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.dp-rescan:hover:not(:disabled) {
  color: var(--app-ink);
  background: var(--app-surface-3);
}

.dp-rescan:disabled {
  cursor: default;
  opacity: 0.7;
}

.dp-rescan__icon {
  width: 13px;
  height: 13px;
}

.dp-rescan__icon--spin {
  animation: dp-spin 0.8s linear infinite;
}

@keyframes dp-spin {
  to {
    transform: rotate(360deg);
  }
}

.dp-scope-line {
  margin-top: 15px;
  border-top: 1px solid var(--app-line);
  padding-top: 15px;
  font-size: 12.5px;
  color: var(--app-ink-soft);
}

.dp-scope-line b {
  color: var(--app-ink);
  font-weight: 700;
}

.dp-field {
  margin-top: 18px;
}

.dp-field--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dp-power {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
}

.dp-power :deep(svg) {
  color: var(--scope);
  transition: color 0.5s ease;
}

.dp-field__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 11px;
  font-family: var(--app-font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--app-faint);
}

.dp-field__value {
  font-family: var(--app-font-mono);
  text-transform: none;
  letter-spacing: 0;
  color: var(--app-ink);
}

.dp-switch {
  position: relative;
  width: 44px;
  height: 25px;
  flex: none;
  border: 1px solid var(--app-line-2);
  border-radius: 999px;
  background: var(--app-surface-3);
  transition: background-color 0.25s ease;
}

.dp-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: #d5d0e0;
  transition: left 0.25s cubic-bezier(0.5, 1.6, 0.4, 1);
}

.dp-switch--on {
  background: var(--scope);
}

.dp-switch--on::after {
  left: 21px;
  background: #fff;
}

.dp-range {
  width: 100%;
  height: 9px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 999px;
  outline: none;
  background:
    linear-gradient(var(--scope), var(--scope)) 0 / var(--p, 75%) 100% no-repeat,
    rgb(255 255 255 / 0.09);
}

.dp-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 21px;
  height: 21px;
  cursor: pointer;
  border: 3px solid var(--scope);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.4);
}

.dp-range::-moz-range-thumb {
  width: 19px;
  height: 19px;
  cursor: pointer;
  border: 3px solid var(--scope);
  border-radius: 50%;
  background: #fff;
}

.dp-swatches {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 8px;
}

.dp-swatch {
  aspect-ratio: 1;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 9px;
  padding: 0;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.28);
  transition: transform 0.12s ease;
}

.dp-swatch:hover {
  transform: scale(1.14);
}

.dp-swatch--active {
  border-color: #fff;
  box-shadow:
    0 0 0 2px var(--app-bg),
    0 0 12px -2px currentColor;
}

.dp-swatch--custom {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: conic-gradient(from 0deg, #ff1e8c, #ffd400, #00e676, #28d7f0, #b026ff, #ff1e8c);
}

.dp-swatch__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  border: none;
  padding: 0;
  opacity: 0;
}

.dp-swatch__pick {
  width: 14px;
  height: 14px;
  color: #fff;
  pointer-events: none;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.55));
}

.dp-gradient {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dp-grad-swatch {
  position: relative;
  width: 46px;
  height: 34px;
  flex: none;
  overflow: hidden;
  border: 2px solid var(--app-line-2);
  border-radius: 9px;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.28);
}

.dp-gradient__bar {
  flex: 1;
  height: 12px;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.08);
}

.dp-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dp-effect {
  border: 1px solid var(--app-line);
  border-radius: 999px;
  background: var(--app-surface-2);
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--app-ink-soft);
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.dp-effect:hover {
  color: var(--app-ink);
  background: var(--app-surface-3);
}

.dp-effect--active {
  color: var(--app-ink);
  border-color: color-mix(in srgb, var(--scope) 55%, transparent);
  background: color-mix(in srgb, var(--scope) 20%, transparent);
}
</style>
