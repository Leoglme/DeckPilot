<template>
  <div class="dp-boot">
    <div class="dp-boot__halo" aria-hidden="true" />

    <div class="dp-boot__card">
      <div class="dp-boot__brand">
        <AppLogo :size="52" />
        <div>
          <h1 class="dp-boot__name">DeckPilot</h1>
          <p class="dp-boot__tag">Préparation de ta machine…</p>
        </div>
      </div>

      <ul class="dp-boot__steps">
        <li v-for="step in steps" :key="step.id" class="dp-boot__step" :class="`dp-boot__step--${step.status}`">
          <span class="dp-boot__icon">
            <UIcon v-if="step.status === 'ok'" name="i-lucide-check" />
            <UIcon v-else-if="step.status === 'running'" name="i-lucide-loader-circle" class="dp-boot__spin" />
            <UIcon v-else-if="step.status === 'action-required'" name="i-lucide-triangle-alert" />
            <UIcon v-else name="i-lucide-circle" />
          </span>
          <span class="dp-boot__text">
            <b>{{ step.label }}</b>
            <small>{{ step.detail }}</small>
          </span>
        </li>
      </ul>

      <button v-if="hasFailed" type="button" class="app-btn-accent dp-boot__retry" @click="runBoot">
        <UIcon name="i-lucide-refresh-cw" class="h-4 w-4" />Réessayer
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ComputedRef, Ref } from 'vue'
import type { BootGateEmit } from '~/types/BootGate'
import type { ReadinessReport, ReadinessStep } from '~/types/Readiness'
import { computed, onMounted, ref } from 'vue'
import { SystemService } from '~/services/systemService'

const emit: BootGateEmit = defineEmits<BootGateEmit>()

const steps: Ref<ReadinessStep[]> = ref([])
const isRunning: Ref<boolean> = ref(false)

const hasFailed: ComputedRef<boolean> = computed(
  (): boolean =>
    !isRunning.value && steps.value.some((step: ReadinessStep): boolean => step.status === 'action-required'),
)

/**
 * Pause helper for the staggered reveal.
 * @param milliseconds - How long to wait.
 * @returns A promise resolved after the delay.
 */
function delay(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve: () => void): void => {
    setTimeout(resolve, milliseconds)
  })
}

/** Run the launch checks, reveal them one by one, then enter the app when ready. */
async function runBoot(): Promise<void> {
  isRunning.value = true
  const report: ReadinessReport = await SystemService.checkReadiness()
  steps.value = report.steps.map((step: ReadinessStep): ReadinessStep => ({ ...step, status: 'pending' }))
  for (const target of report.steps) {
    const current: ReadinessStep | undefined = steps.value.find((step: ReadinessStep): boolean => step.id === target.id)
    if (!current) {
      continue
    }
    current.status = 'running'
    await delay(300)
    current.status = target.status
    await delay(150)
  }
  isRunning.value = false
  await delay(420)
  if (report.ready) {
    emit('ready')
  }
}

onMounted(async (): Promise<void> => {
  await runBoot()
})
</script>

<style scoped>
.dp-boot {
  position: relative;
  display: grid;
  min-height: 100vh;
  place-items: center;
  overflow: hidden;
  padding: 24px;
  background:
    radial-gradient(680px 460px at 50% -10%, color-mix(in srgb, var(--scene-a) 16%, transparent), transparent 60%),
    var(--app-bg);
}

.dp-boot__halo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 460px;
  height: 460px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.45;
  background: conic-gradient(from 0deg, var(--scene-a), var(--scene-b), var(--scene-c), var(--scene-a));
  animation: dp-boot-spin 9s linear infinite;
}

.dp-boot__card {
  position: relative;
  z-index: 1;
  width: min(400px, 100%);
  border: 1px solid var(--app-line);
  border-radius: 22px;
  background: color-mix(in srgb, var(--app-surface) 88%, transparent);
  padding: 28px 26px;
  box-shadow: var(--app-shadow-soft);
  backdrop-filter: blur(6px);
  animation: dp-boot-rise 0.5s cubic-bezier(0.2, 0.75, 0.25, 1) both;
}

.dp-boot__brand {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 22px;
}

.dp-boot__name {
  margin: 0;
  font-family: var(--app-font-display);
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.dp-boot__tag {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--app-ink-soft);
}

.dp-boot__steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dp-boot__step {
  display: flex;
  align-items: center;
  gap: 13px;
  border-radius: 12px;
  padding: 11px 12px;
  opacity: 0.5;
  transition:
    opacity 0.3s ease,
    background-color 0.3s ease;
}

.dp-boot__step--running,
.dp-boot__step--ok,
.dp-boot__step--warning,
.dp-boot__step--action-required {
  opacity: 1;
}

.dp-boot__step--running {
  background: var(--app-surface-2);
}

.dp-boot__icon {
  display: grid;
  width: 26px;
  height: 26px;
  flex: none;
  place-items: center;
  border-radius: 50%;
  background: var(--app-surface-3);
  color: var(--app-faint);
  font-size: 15px;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.dp-boot__step--running .dp-boot__icon {
  color: var(--scene-a);
}

.dp-boot__step--ok .dp-boot__icon {
  background: color-mix(in srgb, var(--app-ok) 22%, transparent);
  color: var(--app-ok);
}

.dp-boot__step--action-required .dp-boot__icon {
  background: color-mix(in srgb, var(--app-warn) 22%, transparent);
  color: var(--app-warn);
}

.dp-boot__spin {
  animation: dp-boot-rotate 0.9s linear infinite;
}

.dp-boot__text {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.dp-boot__text b {
  font-size: 13.5px;
  font-weight: 600;
}

.dp-boot__text small {
  margin-top: 1px;
  font-family: var(--app-font-mono);
  font-size: 10.5px;
  color: var(--app-faint);
}

.dp-boot__retry {
  width: 100%;
  margin-top: 18px;
}

@keyframes dp-boot-spin {
  to {
    transform: translate(-50%, -50%) rotate(1turn);
  }
}

@keyframes dp-boot-rotate {
  to {
    transform: rotate(1turn);
  }
}

@keyframes dp-boot-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
