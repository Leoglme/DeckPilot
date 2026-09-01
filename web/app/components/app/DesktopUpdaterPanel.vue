<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="visible" class="dp-updater" @click.self="closePanel">
      <div class="dp-updater__card app-card">
        <p class="app-label dp-updater__eyebrow">Mise à jour</p>
        <h2 class="dp-updater__title">{{ statusTitle }}</h2>
        <p class="dp-updater__desc">{{ statusDescription }}</p>

        <div v-if="currentVersion || nextVersion" class="dp-updater__versions">
          <span v-if="currentVersion" class="dp-updater__tag">v{{ currentVersion }}</span>
          <UIcon v-if="currentVersion && nextVersion" name="i-lucide-arrow-right" class="dp-updater__arrow" />
          <span v-if="nextVersion" class="dp-updater__tag dp-updater__tag--next">v{{ nextVersion }}</span>
        </div>

        <div v-if="status === 'downloading'" class="dp-updater__progress">
          <div class="dp-updater__progress-head">
            <span>{{ downloadLabel }}</span>
            <span v-if="totalBytes && totalBytes > 0">
              {{ (downloadedBytes / (1024 * 1024)).toFixed(1) }} / {{ (totalBytes / (1024 * 1024)).toFixed(1) }} Mo
            </span>
          </div>
          <div v-if="downloadPercent != null" class="dp-updater__bar">
            <div class="dp-updater__bar-fill" :style="{ width: `${downloadPercent}%` }" />
          </div>
        </div>

        <div class="dp-updater__actions">
          <button v-if="canDismiss" type="button" class="dp-updater__btn dp-updater__btn--ghost" @click="closePanel">
            Plus tard
          </button>
          <button v-if="status === 'available'" type="button" class="dp-updater__btn" @click="installUpdate">
            Installer la mise à jour
          </button>
          <button v-if="status === 'installed'" type="button" class="dp-updater__btn" @click="restartApp">
            Redémarrer DeckPilot
          </button>
          <button v-if="status === 'error'" type="button" class="dp-updater__btn" @click="installUpdate">
            Réessayer
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import type { UseDesktopRuntimeReturn } from '~/types/Composables'
import type { ComputedRef, Ref } from 'vue'
import type { DownloadEvent, Update } from '@tauri-apps/plugin-updater'
import type { DesktopUpdaterStatus } from '~/types/DesktopUpdaterPanel'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

const desktopRuntime: UseDesktopRuntimeReturn = useDesktopRuntime()
const isProdDesktop: ComputedRef<boolean> = desktopRuntime.isProdDesktop

const visible: Ref<boolean> = ref(false)
const status: Ref<DesktopUpdaterStatus> = ref('idle')
const currentVersion: Ref<string | null> = ref(null)
const nextVersion: Ref<string | null> = ref(null)
const errorMessage: Ref<string | null> = ref(null)
const pendingUpdate: Ref<Update | null> = shallowRef(null)
const downloadedBytes: Ref<number> = ref(0)
const totalBytes: Ref<number | null> = ref(null)

const downloadPercent: ComputedRef<number | null> = computed((): number | null => {
  const total: number | null = totalBytes.value
  if (total == null || total <= 0) {
    return null
  }
  return Math.min(100, Math.round((100 * downloadedBytes.value) / total))
})

const downloadLabel: ComputedRef<string> = computed((): string => {
  if (status.value !== 'downloading') {
    return ''
  }
  const pct: number | null = downloadPercent.value
  if (pct != null) {
    return `${pct}%`
  }
  if (downloadedBytes.value > 0) {
    return `${(downloadedBytes.value / (1024 * 1024)).toFixed(1)} Mo téléchargés`
  }
  return 'Préparation du téléchargement…'
})

const canDismiss: ComputedRef<boolean> = computed(
  (): boolean => status.value === 'available' || status.value === 'error',
)

const statusTitle: ComputedRef<string> = computed((): string => {
  if (status.value === 'available') return 'Mise à jour disponible'
  if (status.value === 'downloading') return 'Téléchargement et installation'
  if (status.value === 'installed') return 'Mise à jour installée'
  if (status.value === 'error') return 'Échec de la mise à jour'
  return 'Mise à jour'
})

const statusDescription: ComputedRef<string> = computed((): string => {
  if (status.value === 'available') {
    if (nextVersion.value && currentVersion.value) {
      return `Passe de la version ${currentVersion.value} à la version ${nextVersion.value}. DeckPilot se fermera brièvement pour finaliser l'installation.`
    }
    return "Une nouvelle version est prête. L'application se fermera brièvement pour finaliser l'installation."
  }
  if (status.value === 'downloading') {
    return 'Ne ferme pas DeckPilot pendant cette étape.'
  }
  if (status.value === 'installed') {
    return 'Redémarre DeckPilot pour charger la nouvelle version.'
  }
  if (status.value === 'error') {
    return errorMessage.value || 'Une erreur est survenue pendant la mise à jour.'
  }
  return ''
})

/** Reset download progress metrics. */
function resetDownloadProgress(): void {
  downloadedBytes.value = 0
  totalBytes.value = null
}

/**
 * Update progress metrics from Tauri updater events.
 *
 * @param event - Updater download event payload.
 */
function onDownloadEvent(event: DownloadEvent): void {
  if (event.event === 'Started') {
    const len: number | undefined = event.data.contentLength
    totalBytes.value = len != null && len > 0 ? len : null
    downloadedBytes.value = 0
  } else if (event.event === 'Progress') {
    downloadedBytes.value += event.data.chunkLength
  }
}

/** Close the panel when dismissal is allowed. */
function closePanel(): void {
  if (!canDismiss.value) {
    return
  }
  visible.value = false
}

/** Download and install the pending update package. */
async function installUpdate(): Promise<void> {
  if (!pendingUpdate.value) {
    return
  }

  try {
    status.value = 'downloading'
    errorMessage.value = null
    resetDownloadProgress()
    await pendingUpdate.value.downloadAndInstall(onDownloadEvent)
    status.value = 'installed'
  } catch (error: unknown) {
    status.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : 'Échec du téléchargement ou de l’installation.'
  }
}

/** Restart the desktop app after a successful update. */
async function restartApp(): Promise<void> {
  try {
    await relaunch()
  } catch (error: unknown) {
    console.error('[DeckPilot] relaunch() failed, reloading WebView as fallback:', error)
    window.location.reload()
  }
}

/** Check for updates once per session and show the panel when available. */
async function checkForUpdate(): Promise<void> {
  if (!import.meta.client || !isProdDesktop.value) {
    return
  }

  if (window.sessionStorage.getItem('deckpilot-updater-checked') === '1') {
    return
  }
  window.sessionStorage.setItem('deckpilot-updater-checked', '1')

  errorMessage.value = null
  resetDownloadProgress()

  try {
    const update: Update | null = await check()
    pendingUpdate.value = update

    if (!update) {
      status.value = 'idle'
      return
    }

    currentVersion.value = update.currentVersion || null
    nextVersion.value = update.version || null
    status.value = 'available'
    visible.value = true
  } catch (error: unknown) {
    console.error('[DeckPilot] Silent update check failed:', error)
    status.value = 'idle'
    pendingUpdate.value = null
  }
}

onMounted((): void => {
  void checkForUpdate()
})
</script>

<style scoped>
.dp-updater {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(0 0 0 / 0.55);
  backdrop-filter: blur(6px);
}

.dp-updater__card {
  width: min(100%, 520px);
  padding: 24px;
}

.dp-updater__eyebrow {
  margin-bottom: 8px;
  color: var(--scene-a);
}

.dp-updater__title {
  margin: 0 0 8px;
  font-family: var(--app-font-display);
  font-size: 22px;
  font-weight: 800;
}

.dp-updater__desc {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--app-ink-soft);
}

.dp-updater__versions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.dp-updater__tag {
  border-radius: 8px;
  background: var(--app-surface-3);
  padding: 4px 8px;
  font-family: var(--app-font-mono);
  font-size: 12px;
  color: var(--app-ink-soft);
}

.dp-updater__tag--next {
  background: color-mix(in srgb, var(--scene-a) 18%, transparent);
  color: var(--scene-a);
}

.dp-updater__arrow {
  width: 14px;
  height: 14px;
  color: var(--app-faint);
}

.dp-updater__progress {
  margin-bottom: 16px;
}

.dp-updater__progress-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--app-ink-soft);
}

.dp-updater__bar {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--app-surface-3);
}

.dp-updater__bar-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--scene-a);
  transition: width 0.2s ease;
}

.dp-updater__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.dp-updater__btn {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--scene-a);
}

.dp-updater__btn--ghost {
  color: var(--app-ink);
  background: var(--app-surface-3);
}
</style>
