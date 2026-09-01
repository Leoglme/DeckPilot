<template>
  <div>
    <header class="dp-head">
      <h1 class="app-page-title">Pilotes</h1>
      <p class="dp-head__sub">Les pilotes réellement installés sur cette machine — au même endroit.</p>
    </header>

    <div class="app-card dp-hero">
      <div class="dp-meter" :style="{ '--v': meterRatio }">
        <div class="dp-meter__in">
          <b>{{ recentCount }}/{{ totalCount }}</b>
          <small>RÉCENTS</small>
        </div>
      </div>
      <div class="dp-hero__text">
        <h2 class="dp-hero__title">{{ heroTitle }}</h2>
        <p class="dp-hero__desc">
          DeckPilot lit les pilotes signés de ta machine. {{ toCheckCount }} pilote(s) datent de plus de deux ans — à
          vérifier côté constructeur ou via Windows Update.
        </p>
        <div class="dp-hero__stats">
          <div>
            <b class="text-[var(--app-ok)]">{{ recentCount }}</b
            ><small>récents</small>
          </div>
          <div>
            <b class="text-[var(--app-warn)]">{{ toCheckCount }}</b
            ><small>à vérifier</small>
          </div>
          <div>
            <b class="text-[var(--app-info)]">{{ totalCount }}</b
            ><small>détectés</small>
          </div>
        </div>
      </div>
      <button type="button" class="app-btn-accent dp-hero__action" @click="onCheckUpdates">
        <UIcon name="i-lucide-refresh-cw" class="h-4 w-4" />Rechercher les mises à jour
      </button>
    </div>

    <div v-if="isLoading" class="dp-drivers">
      <div v-for="n in 5" :key="n" class="app-card dp-driver dp-driver--skeleton" />
    </div>

    <div v-else-if="totalCount === 0" class="app-card dp-empty">
      <UIcon name="i-lucide-search-x" class="h-6 w-6" />
      <p>Aucun pilote lu. Lance DeckPilot en application (bureau) pour détecter le matériel.</p>
    </div>

    <div v-for="group in groups" v-else :key="group.category" class="dp-group">
      <div class="dp-group__head">
        <UIcon :name="group.icon" class="h-[15px] w-[15px]" />
        <span>{{ group.label }}</span>
        <span class="dp-group__count">{{ group.drivers.length }}</span>
      </div>
      <div class="dp-drivers">
        <div v-for="driver in group.drivers" :key="driver.id" class="app-card dp-driver">
          <span class="dp-driver__icon"><UIcon :name="group.icon" class="h-[18px] w-[18px]" /></span>
          <div class="dp-driver__info">
            <b>{{ driver.name }}</b>
            <small>{{ driver.provider }}{{ driver.date ? ` · ${formatDate(driver.date)}` : '' }}</small>
          </div>
          <span class="dp-driver__ver">{{ driver.version }}</span>
          <span class="dp-status" :class="`dp-status--${driver.freshness}`">{{
            freshnessLabel(driver.freshness)
          }}</span>
          <button v-if="driver.freshness === 'old'" type="button" class="dp-driver__btn" @click="onUpdate(driver)">
            <UIcon name="i-lucide-external-link" class="h-3.5 w-3.5" />Mettre à jour
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ComputedRef, Ref } from 'vue'
import type { Driver, DriverCategory, DriverFreshness, DriverGroup } from '~/types/Health'
import { computed, onMounted, ref } from 'vue'
import { HealthService } from '~/services/healthService'

useHead({ title: 'Pilotes' })

const CATEGORY_META: Record<DriverCategory, { label: string; icon: string }> = {
  gpu: { label: 'Carte graphique', icon: 'i-lucide-monitor' },
  network: { label: 'Réseau', icon: 'i-lucide-wifi' },
  audio: { label: 'Audio & média', icon: 'i-lucide-volume-2' },
  system: { label: 'Système & chipset', icon: 'i-lucide-cpu' },
  storage: { label: 'Stockage', icon: 'i-lucide-hard-drive' },
}

const CATEGORY_ORDER: DriverCategory[] = ['gpu', 'network', 'audio', 'system', 'storage']

const drivers: Ref<Driver[]> = ref([])
const isLoading: Ref<boolean> = ref(true)

const totalCount: ComputedRef<number> = computed((): number => drivers.value.length)

const recentCount: ComputedRef<number> = computed(
  (): number => drivers.value.filter((driver: Driver): boolean => driver.freshness === 'recent').length,
)

const toCheckCount: ComputedRef<number> = computed((): number => totalCount.value - recentCount.value)

const meterRatio: ComputedRef<string> = computed((): string =>
  totalCount.value === 0 ? '0' : (recentCount.value / totalCount.value).toFixed(3),
)

const heroTitle: ComputedRef<string> = computed((): string =>
  toCheckCount.value === 0 ? 'Tout est récent' : 'Quelques pilotes à vérifier',
)

const groups: ComputedRef<DriverGroup[]> = computed((): DriverGroup[] =>
  CATEGORY_ORDER.map((category: DriverCategory): DriverGroup => ({
    category,
    label: CATEGORY_META[category].label,
    icon: CATEGORY_META[category].icon,
    drivers: drivers.value.filter((driver: Driver): boolean => driver.category === category),
  })).filter((group: DriverGroup): boolean => group.drivers.length > 0),
)

/**
 * Human label of a freshness verdict.
 * @param freshness - The freshness verdict.
 * @returns The pill label.
 */
function freshnessLabel(freshness: DriverFreshness): string {
  return freshness === 'recent' ? 'Récent' : 'À vérifier'
}

/**
 * Format a `yyyy-MM-dd` driver date as a short French month + year.
 * @param date - The ISO date.
 * @returns The formatted date, e.g. `janv. 2026`.
 */
function formatDate(date: string): string {
  const parsed: Date = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return date
  }
  return parsed.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

/** Open Windows Update so the user can actually fetch driver updates. */
function onCheckUpdates(): void {
  void HealthService.openWindowsUpdate()
}

/**
 * Open where the given driver gets updated — its vendor's driver page, or Windows Update.
 * @param driver - The driver to update.
 */
function onUpdate(driver: Driver): void {
  void HealthService.openUpdateSource(driver.name, driver.provider)
}

/** Load the real drivers into the page. */
async function loadDrivers(): Promise<void> {
  drivers.value = await HealthService.listDrivers()
  isLoading.value = false
}

onMounted((): void => {
  void loadDrivers()
})
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

.dp-hero {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 22px;
  padding: 22px 24px;
}

.dp-meter {
  position: relative;
  display: grid;
  width: 92px;
  height: 92px;
  flex: none;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(
    var(--app-ok) calc(var(--v, 0) * 1turn),
    color-mix(in srgb, var(--app-warn) 70%, transparent) 0
  );
}

.dp-meter::before {
  content: '';
  position: absolute;
  inset: 9px;
  border-radius: 50%;
  background: var(--app-surface);
}

.dp-meter__in {
  position: relative;
  text-align: center;
}

.dp-meter__in b {
  font-family: var(--app-font-display);
  font-size: 22px;
  font-weight: 800;
}

.dp-meter__in small {
  display: block;
  margin-top: -2px;
  font-family: var(--app-font-mono);
  font-size: 9px;
  color: var(--app-faint);
}

.dp-hero__text {
  flex: 1;
}

.dp-hero__title {
  margin: 0 0 5px;
  font-family: var(--app-font-display);
  font-size: 22px;
  font-weight: 700;
}

.dp-hero__desc {
  margin: 0;
  max-width: 460px;
  font-size: 13.5px;
  color: var(--app-ink-soft);
}

.dp-hero__stats {
  display: flex;
  gap: 22px;
  margin-top: 14px;
}

.dp-hero__stats b {
  display: block;
  font-family: var(--app-font-display);
  font-size: 19px;
  font-weight: 800;
}

.dp-hero__stats small {
  font-size: 11px;
  color: var(--app-faint);
}

.dp-hero__action {
  flex: none;
}

.dp-group {
  margin-bottom: 18px;
}

.dp-group__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 9px;
  font-family: var(--app-font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--app-faint);
}

.dp-group__count {
  display: inline-grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 999px;
  background: var(--app-surface-3);
  padding: 0 5px;
  font-size: 10px;
  color: var(--app-ink-soft);
}

.dp-drivers {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.dp-driver {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 13px 16px;
}

.dp-driver--skeleton {
  height: 64px;
  animation: dp-shimmer 1.2s ease-in-out infinite;
}

@keyframes dp-shimmer {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.65;
  }
}

.dp-driver__icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: none;
  place-items: center;
  border: 1px solid var(--app-line);
  border-radius: 11px;
  background: var(--app-surface-2);
  color: var(--app-ink-soft);
}

.dp-driver__info {
  flex: 1;
  min-width: 0;
}

.dp-driver__info b {
  display: block;
  overflow: hidden;
  font-family: var(--app-font-display);
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dp-driver__info small {
  display: block;
  margin-top: 2px;
  font-family: var(--app-font-mono);
  font-size: 10.5px;
  color: var(--app-faint);
}

.dp-driver__ver {
  min-width: 118px;
  font-family: var(--app-font-mono);
  font-size: 12px;
  text-align: right;
  color: var(--app-ink-soft);
}

.dp-status {
  display: inline-flex;
  min-width: 96px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid;
  border-radius: 999px;
  padding: 6px 11px;
  font-size: 11.5px;
  font-weight: 600;
}

.dp-status--recent {
  color: var(--app-ok);
  border-color: color-mix(in srgb, var(--app-ok) 35%, transparent);
  background: color-mix(in srgb, var(--app-ok) 10%, transparent);
}

.dp-status--old {
  color: var(--app-warn);
  border-color: color-mix(in srgb, var(--app-warn) 40%, transparent);
  background: color-mix(in srgb, var(--app-warn) 12%, transparent);
}

.dp-driver__btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--app-line);
  border-radius: 10px;
  background: var(--app-surface-2);
  padding: 9px 13px;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-ink);
  transition: background-color 0.15s ease;
}

.dp-driver__btn:hover {
  background: var(--app-surface-3);
}

.dp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 24px;
  text-align: center;
  color: var(--app-ink-soft);
}

.dp-empty :deep(svg) {
  color: var(--app-faint);
}
</style>
