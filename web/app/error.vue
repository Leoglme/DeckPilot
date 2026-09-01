<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
    <p class="app-label">Erreur {{ props.error.statusCode }}</p>
    <h1 class="app-page-title">Quelque chose a coincé</h1>
    <p class="max-w-sm text-sm text-[var(--app-ink-soft)]">
      {{ props.error.message || 'Une erreur inattendue est survenue.' }}
    </p>
    <button class="app-btn-accent" @click="handleReset">Revenir à Lumière</button>
  </div>
</template>

<script lang="ts" setup>
import type { PropType } from 'vue'
import type { NuxtError } from '#app'
import type { AppErrorProps } from '~/types/AppError'

/** Full-screen error boundary shown when a page fails to render. */
const props: AppErrorProps = defineProps({
  error: {
    type: Object as PropType<NuxtError>,
    required: true,
  },
})

/** Clear the error and navigate back to the home (Lumière) screen. */
function handleReset(): void {
  clearError({ redirect: '/' })
}
</script>
