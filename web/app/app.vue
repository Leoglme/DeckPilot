<template>
  <UApp>
    <NuxtLoadingIndicator color="var(--scene-a)" :height="2" :throttle="200" />
    <DesktopUpdaterPanel />
    <BootGate v-if="!isBooted" @ready="onBootReady" />
    <NuxtLayout v-else>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script lang="ts" setup>
import type { Ref } from 'vue'
import { onMounted, ref } from 'vue'

const appTheme: ReturnType<typeof useAppTheme> = useAppTheme()

const isBooted: Ref<boolean> = ref(false)

/** Reveal the app once the launch checks have passed. */
function onBootReady(): void {
  isBooted.value = true
}

onMounted((): void => {
  appTheme.initTheme()
})
</script>
