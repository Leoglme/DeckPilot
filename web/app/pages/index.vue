<template>
  <div>
    <header class="dp-head">
      <h1 class="app-page-title">Lumière</h1>
      <p class="dp-head__sub">Choisis une ambiance, puis affine chaque composant.</p>
    </header>

    <ScenePicker class="mb-6" />

    <div class="dp-lum">
      <ControlPanel />
      <PcPreview />
    </div>
  </div>
</template>

<script lang="ts" setup>
useHead({ title: 'Lumière' })
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

.dp-lum {
  display: grid;
  grid-template-columns: 1fr 1.28fr;
  gap: 20px;
  align-items: stretch;
}

@media (max-width: 960px) {
  .dp-lum {
    grid-template-columns: 1fr;
  }
}
</style>
