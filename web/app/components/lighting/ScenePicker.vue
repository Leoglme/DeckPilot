<template>
  <section>
    <p class="app-label mb-3">Ambiances</p>
    <div class="dp-scenes">
      <button
        v-for="scene in store.scenes"
        :key="scene.id"
        type="button"
        class="dp-scene"
        :class="{ 'dp-scene--active': scene.id === store.activeSceneId && !store.allColorOverride }"
        :style="sceneStyle(scene)"
        @click="store.setScene(scene.id)"
      >
        <UIcon v-if="scene.id === store.activeSceneId" name="i-lucide-check" class="dp-scene__check" />
        <span class="dp-scene__name">{{ scene.name }}</span>
        <span class="dp-scene__desc">{{ scene.description }}</span>
      </button>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { LightingScene } from '~/types/Lighting'
import { useLightingStore } from '~/stores/lighting'

const store: ReturnType<typeof useLightingStore> = useLightingStore()

/**
 * Inline gradient of a scene pill, from its first two colors.
 * @param scene - The scene to style.
 * @returns The CSS custom properties for the pill gradient.
 */
function sceneStyle(scene: LightingScene): Record<string, string> {
  return { '--pa': scene.colors[0], '--pb': scene.colors[1] }
}
</script>

<style scoped>
.dp-scenes {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 1240px) {
  .dp-scenes {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.dp-scene {
  position: relative;
  overflow: hidden;
  border: 0;
  border-radius: 14px;
  padding: 14px 15px;
  text-align: left;
  color: #fff;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.05),
    0 8px 22px -16px rgb(0 0 0 / 0.7);
  transition: transform 0.16s ease;
}

.dp-scene::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(135deg, var(--pa), var(--pb));
  opacity: 0.94;
}

.dp-scene::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(180deg, rgb(255 255 255 / 0.13), transparent 44%, rgb(0 0 0 / 0.3));
}

.dp-scene > * {
  position: relative;
  z-index: 2;
}

.dp-scene:hover {
  transform: translateY(-3px);
}

.dp-scene:active {
  transform: translateY(-1px) scale(0.98);
}

.dp-scene__name {
  display: block;
  font-family: var(--app-font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-shadow: 0 1px 6px rgb(0 0 0 / 0.35);
}

.dp-scene__desc {
  display: block;
  margin-top: 2px;
  font-family: var(--app-font-mono);
  font-size: 10px;
  opacity: 0.92;
}

.dp-scene--active {
  outline: 2.5px solid #fff;
  outline-offset: 2px;
}

.dp-scene__check {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 18px;
  height: 18px;
  padding: 3px;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.94);
  color: #111;
}
</style>
