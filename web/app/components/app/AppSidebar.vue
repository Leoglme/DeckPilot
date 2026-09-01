<template>
  <aside class="dp-sidebar">
    <div class="dp-brand">
      <AppLogo :size="34" />
      <span class="dp-brand__name">DeckPilot</span>
    </div>

    <nav class="dp-nav" aria-label="Navigation principale">
      <p class="app-label dp-nav__section">Pilotage</p>
      <NuxtLink
        v-for="item in primaryNav"
        :key="item.to"
        :to="item.to"
        class="dp-nav__item"
        active-class="dp-nav__item--active"
      >
        <UIcon :name="item.icon" class="dp-nav__icon" />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="dp-nav dp-sidebar__foot">
      <NuxtLink to="/reglages" class="dp-nav__item" active-class="dp-nav__item--active">
        <UIcon name="i-lucide-settings" class="dp-nav__icon" />
        Réglages
      </NuxtLink>
    </div>
  </aside>
</template>

<script lang="ts" setup>
import type { AppNavItem } from '~/types/AppNav'

const primaryNav: AppNavItem[] = [
  { label: 'Lumière', to: '/', icon: 'i-lucide-sparkles' },
  { label: 'Pilotes', to: '/pilotes', icon: 'i-lucide-activity' },
]
</script>

<style scoped>
.dp-sidebar {
  display: flex;
  width: 232px;
  flex: none;
  flex-direction: column;
  gap: 22px;
  border-right: 1px solid var(--app-line);
  background: rgb(0 0 0 / 0.14);
  padding: 18px 14px;
}

.dp-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 6px;
}

.dp-brand__name {
  font-family: var(--app-font-display);
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.dp-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dp-nav__section {
  padding: 0 8px 4px;
}

.dp-nav__item {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-ink-soft);
  transition:
    background-color 0.16s ease,
    color 0.16s ease;
}

.dp-nav__icon {
  width: 19px;
  height: 19px;
  flex: none;
  transition: color 0.5s ease;
}

.dp-nav__item:hover {
  background-color: var(--app-surface);
  color: var(--app-ink);
}

.dp-nav__item--active {
  background-color: color-mix(in srgb, var(--scene-a) 15%, var(--app-surface));
  color: var(--app-ink);
}

.dp-nav__item--active .dp-nav__icon {
  color: var(--scene-a);
}

.dp-nav__item--active::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 50%;
  height: 22px;
  width: 3px;
  transform: translateY(-50%);
  border-radius: 0 3px 3px 0;
  background: var(--scene-a);
  box-shadow: 0 0 12px var(--scene-a);
  transition: background-color 0.5s ease;
}

.dp-sidebar__foot {
  margin-top: auto;
}
</style>
