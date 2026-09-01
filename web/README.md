# DeckPilot — web (Nuxt + Tauri)

The DeckPilot front-end + desktop shell. Same stack as DevLeadHunter: **Nuxt 4**, **Vue 3.5**,
**Nuxt UI v4 (Tailwind v4)**, **Pinia**, **Tauri 2** — one codebase for Windows (priority) and
iPhone.

## Commands

```bash
npm install          # deps + `nuxt prepare`
npm run dev          # desktop UI dev server (http://localhost:3000)
npm run dev:remote   # iPhone PWA + cloud relay API locally (http://localhost:3000)
npm run tauri:dev    # desktop app (Nuxt + Tauri window)
npm run build:remote # production build for deckpilote.dibodev.fr (PWA + relay API)
npm run lint         # prettier + eslint + typecheck
npm run tauri:build  # packaged desktop build
```

## iPhone PWA (deckpilote.dibodev.fr)

The deployed site at **https://deckpilote.dibodev.fr/** is the iPhone télécommande — not the desktop
UI. Flow:

1. Run DeckPilot on your PC (`npm run tauri:dev` or the installed app).
2. Open **Réglages → iPhone** and copy the link (or scan the pairing code).
3. On iPhone: open the link → **Partager → Sur l'écran d'accueil**.
4. The PWA talks to the VPS relay; the desktop app polls it and drives RGB.

Local testing: `npm run dev:remote` serves the same mobile shell + API on port 3000. Point the
desktop relay at it with `DECKPILOT_CLOUD_URL=http://localhost:3000` before `tauri dev`.

## Structure

- `app/` — pages, layouts, components, composables, services, stores, types (Nuxt 4 `app/` dir).
  - `components/lighting/` — the Lumière screen (scene picker, control panel, PC preview).
  - `services/lightingService.ts`, `services/healthService.ts` — the seams that will bridge to
    the hardware (OpenRGB / vendor SDKs) through Tauri `invoke`. **Currently mocked with Léo's rig.**
  - `stores/lighting.ts` — reactive lighting state.
- `src-tauri/` — the Rust desktop shell (the RGB / driver bridge lives here later).

## To finish the desktop build (one-time)

- `npm run tauri -- icon path/to/icon.png` to generate `src-tauri/icons/*`.
- `npm run tauri -- signer generate` and set the updater pubkey in `src-tauri/tauri.conf.json`.

## Conventions

TypeScript ultra-strict (typed everything + JSDoc), runtime `defineProps`, types in `app/types/`,
SFC order `template → script → style`, services as classes of static methods. Run `/relecture`
before committing.
