# DeckPilot

DeckPilot is a **Tauri + Nuxt 4 + Tailwind (Nuxt UI v4)** desktop-first app (Windows priority,
iPhone via the same codebase) that unifies **RGB control** of every PC component (multi-brand)
and **driver/health** management in one place. It replaces juggling VelocityX, iCUE, RGB Fusion &
co., and keeps the RGB state via a background service even when the window is closed.

The front-end + desktop shell live in [`web/`](web/) — see [web/README.md](web/README.md).

## Stack & conventions — mirror DevLeadHunter

DeckPilot deliberately mirrors the **DevLeadHunter** repo (`../devleadhunter/web`): same stack,
tooling, CI patterns and code standards. When in doubt, copy how DevLeadHunter does it.

- **Nuxt 4 / Vue 3.5 / Nuxt UI v4 (Tailwind v4) / Pinia / Tauri 2**. Icons: `lucide` via
  `<UIcon name="i-lucide-…">`. Dark-first theme via `--app-*` / `--scene-*` tokens in
  `app/assets/css/main.css`.
- **TypeScript ultra-strict**: no `any`; every `ref`/`computed`/param/return typed; ESLint
  `typedef` + `explicit-function-return-type` are errors.
- **Vue SFC order**: `<template>` → `<script lang="ts" setup>` → `<style scoped>`.
- **Props**: runtime `const props: XProps = defineProps({ … })` with `as PropType<…>` and
  explicit defaults; the interface lives in `app/types/<Component>.ts`. No `withDefaults`, no
  generic `defineProps<T>()`.
- **JSDoc** (English) above every function / method / class and above `defineProps`.
- **Services** are classes of static methods; **types** live in `app/types/`; **French** UI text
  hardcoded (no i18n in the app).
- The hardware bridge (OpenRGB / vendor SDKs) is a Tauri/Rust concern behind
  `services/lightingService.ts` & `services/healthService.ts` — currently mocked with Léo's rig.

## End of ticket

Run the `/relecture` skill on the diff, then propose a branch + conventional commit (never commit
without asking). Consider whether new PostHog-style events are relevant (none wired yet).
