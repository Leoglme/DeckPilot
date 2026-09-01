<template>
  <span class="dp-logo" :style="{ width: sizePx, height: sizePx }" aria-hidden="true" />
</template>

<script lang="ts" setup>
import type { ComputedRef } from 'vue'
import type { AppLogoProps } from '~/types/AppLogo'
import { computed } from 'vue'

/** The DeckPilot app icon — an RGB spectrum ring (additive light) around a white core. */
const props: AppLogoProps = defineProps({
  size: {
    type: Number,
    default: 34,
  },
})

const sizePx: ComputedRef<string> = computed((): string => `${props.size ?? 34}px`)
</script>

<style scoped>
.dp-logo {
  position: relative;
  flex: none;
  overflow: hidden;
  border-radius: 27%;
  background: radial-gradient(125% 125% at 30% 18%, #241b38, #0b0812 72%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.16),
    inset 0 0 0 1px rgb(255 255 255 / 0.06),
    0 6px 16px -6px rgb(0 0 0 / 0.75);
}

.dp-logo::before {
  content: '';
  position: absolute;
  inset: 23%;
  border-radius: 50%;
  background: conic-gradient(from 135deg, #28d7f0, #8b5cf6, #ff4d8d, #ffb020, #34e0c4, #28d7f0);
  -webkit-mask: radial-gradient(closest-side, transparent 46%, #000 49%);
  mask: radial-gradient(closest-side, transparent 46%, #000 49%);
  filter: saturate(1.2);
}

.dp-logo::after {
  content: '';
  position: absolute;
  inset: 43%;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 7px 1px rgb(255 255 255 / 0.5);
}
</style>
