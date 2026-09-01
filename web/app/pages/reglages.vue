<template>
  <div>
    <header class="dp-head">
      <h1 class="app-page-title">Réglages</h1>
      <p class="dp-head__sub">Le comportement de fond, les mises à jour, l'apparence.</p>
    </header>

    <div class="app-card dp-set">
      <p class="app-label dp-set__title">Démarrage & fond</p>
      <div v-for="setting in startupSettings" :key="setting.key" class="dp-set__row">
        <div>
          <b>{{ setting.title }}</b>
          <small>{{ setting.hint }}</small>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="setting.on"
          :aria-label="setting.title"
          class="dp-switch"
          :class="{ 'dp-switch--on': setting.on }"
          @click="setting.on = !setting.on"
        />
      </div>
    </div>

    <div class="app-card dp-set">
      <p class="app-label dp-set__title">Mises à jour</p>
      <div v-for="setting in updateSettings" :key="setting.key" class="dp-set__row">
        <div>
          <b>{{ setting.title }}</b>
          <small>{{ setting.hint }}</small>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="setting.on"
          :aria-label="setting.title"
          class="dp-switch"
          :class="{ 'dp-switch--on': setting.on }"
          @click="setting.on = !setting.on"
        />
      </div>
    </div>

    <div class="app-card dp-set">
      <p class="app-label dp-set__title">iPhone</p>
      <div class="dp-remote">
        <p class="dp-remote__hint">
          Ouvre ce lien sur ton iPhone, puis <strong>Partager → Sur l'écran d'accueil</strong>. DeckPilot doit tourner
          sur ton PC pour que la télécommande fonctionne.
        </p>
        <p class="dp-remote__code" aria-label="Code de liaison">{{ pairingToken }}</p>
        <div class="dp-remote__actions">
          <button type="button" class="dp-remote__btn" @click="copyPwaUrl">Copier le lien</button>
          <a :href="pwaUrl" class="dp-remote__btn dp-remote__btn--ghost" target="_blank" rel="noopener noreferrer">
            Ouvrir la PWA
          </a>
        </div>
        <p v-if="copyFeedback" class="dp-remote__feedback">{{ copyFeedback }}</p>
      </div>
    </div>

    <div class="app-card dp-set">
      <p class="app-label dp-set__title">À propos</p>
      <div class="dp-about">
        <AppLogo :size="44" />
        <div>
          <b>DeckPilot</b>
          <small>version 0.1.0 · Tauri + Nuxt</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Ref } from 'vue'
import type { SettingToggle } from '~/types/Settings'
import { onMounted, ref } from 'vue'
import { RemoteService } from '~/services/remoteService'

useHead({ title: 'Réglages' })

const pairingToken: Ref<string> = ref('…')
const pwaUrl: Ref<string> = ref('https://deckpilote.dibodev.fr/')
const copyFeedback: Ref<string> = ref('')

/** Load the cloud pairing code and PWA URL from the desktop shell. */
async function loadRemotePairing(): Promise<void> {
  pairingToken.value = await RemoteService.getPairingToken()
  pwaUrl.value = await RemoteService.getPwaUrl()
}

/** Copy the PWA install link to the clipboard. */
async function copyPwaUrl(): Promise<void> {
  try {
    await navigator.clipboard.writeText(pwaUrl.value)
    copyFeedback.value = 'Lien copié — ouvre-le sur ton iPhone.'
  } catch {
    copyFeedback.value = 'Impossible de copier automatiquement.'
  }
}

onMounted((): void => {
  void loadRemotePairing()
})

const startupSettings: Ref<SettingToggle[]> = ref([
  {
    key: 'startWithWindows',
    title: 'Démarrer avec Windows',
    hint: 'DeckPilot se lance automatiquement à l’ouverture de session.',
    on: true,
  },
  {
    key: 'keepRgbAlive',
    title: 'Garder le RGB actif, app fermée',
    hint: 'Le service de fond maintient tes effets même sans fenêtre ouverte — ce qui remplace VelocityX & co.',
    on: true,
  },
  {
    key: 'minimizeToTray',
    title: 'Réduire dans la barre système',
    hint: 'La croix minimise au lieu de quitter.',
    on: true,
  },
])

const updateSettings: Ref<SettingToggle[]> = ref([
  {
    key: 'checkDriversOnStart',
    title: 'Vérifier les pilotes au démarrage',
    hint: 'Prévient dès qu’un pilote a une mise à jour.',
    on: true,
  },
  {
    key: 'autoInstallDrivers',
    title: 'Installer les pilotes automatiquement',
    hint: 'Désactivé : DeckPilot demande avant d’installer.',
    on: false,
  },
])
</script>

<style scoped>
.dp-head {
  margin-bottom: 20px;
}

.dp-head__sub {
  margin-top: 4px;
  font-size: 13.5px;
  color: var(--app-ink-soft);
}

.dp-set {
  margin-bottom: 16px;
  padding: 8px 20px;
}

.dp-set__title {
  padding: 16px 0 4px;
}

.dp-set__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid var(--app-line);
  padding: 15px 0;
}

.dp-set__row:first-of-type {
  border-top: 0;
}

.dp-set__row b {
  font-size: 14px;
  font-weight: 600;
}

.dp-set__row small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--app-ink-soft);
}

.dp-about {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 0;
}

.dp-about b {
  font-family: var(--app-font-display);
  font-size: 16px;
  font-weight: 800;
}

.dp-about small {
  display: block;
  font-family: var(--app-font-mono);
  font-size: 11px;
  color: var(--app-faint);
}

.dp-remote {
  padding: 16px 0;
}

.dp-remote__hint {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--app-ink-soft);
}

.dp-remote__code {
  margin: 0 0 14px;
  font-family: var(--app-font-mono);
  font-size: 28px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: lowercase;
  color: var(--app-ink);
}

.dp-remote__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.dp-remote__btn {
  border: 1px solid var(--app-line-2);
  border-radius: 12px;
  background: var(--app-surface-3);
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--app-ink);
  text-decoration: none;
}

.dp-remote__btn--ghost {
  background: transparent;
}

.dp-remote__feedback {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--app-ok);
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
  background: var(--app-ok);
}

.dp-switch--on::after {
  left: 21px;
  background: #fff;
}
</style>
