<template>
  <div class="dp-app" :style="rootStyle">
    <AppSidebar />
    <main class="dp-main">
      <slot />
    </main>
  </div>
</template>

<script lang="ts" setup>
import type { ComputedRef } from 'vue'
import { computed, onMounted } from 'vue'
import { useLightingStore } from '~/stores/lighting'

const store: ReturnType<typeof useLightingStore> = useLightingStore()

/** CSS custom properties driving the app-wide recolor: the active scene and the current scope. */
const rootStyle: ComputedRef<Record<string, string>> = computed((): Record<string, string> => {
  const sceneColors: readonly [string, string, string] = store.activeScene?.colors ?? ['#28D7F0', '#8B5CF6', '#4361EE']
  const override: string | null = store.allColorOverride
  const colors: readonly [string, string, string] = override ? [override, override, override] : sceneColors
  const scopeColor: string = store.scopedComponent?.color ?? colors[0]
  return {
    '--scene-a': colors[0],
    '--scene-b': colors[1],
    '--scene-c': colors[2],
    '--scope': scopeColor,
  }
})

onMounted(async (): Promise<void> => {
  if (!store.loaded) {
    await store.load()
  }
})
</script>

<style scoped>
.dp-app {
  display: flex;
  min-height: 100vh;
  transition:
    --scene-a 0.7s ease,
    --scene-b 0.7s ease,
    --scene-c 0.7s ease,
    --scope 0.5s ease;
  background:
    radial-gradient(760px 520px at 8% -6%, color-mix(in srgb, var(--scene-a) 16%, transparent), transparent 58%),
    radial-gradient(820px 600px at 104% -2%, color-mix(in srgb, var(--scene-b) 16%, transparent), transparent 60%),
    radial-gradient(900px 720px at 82% 120%, color-mix(in srgb, var(--scene-c) 12%, transparent), transparent 58%),
    var(--app-bg);
}

.dp-main {
  flex: 1;
  min-width: 0;
  padding: 26px 28px 40px;
  overflow-y: auto;
  max-height: 100vh;
}
</style>
