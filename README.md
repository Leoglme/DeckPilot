# DeckPilot

> Take control of your PC's RGB lighting and drivers from a single app — Windows-first, also on iPhone. Built with Tauri + Nuxt.

> ⚠️ **Early stage / work in progress.** DeckPilot is in active early development. Features, scope, and APIs are all subject to change.

## The problem

Modern PCs light up like Christmas trees — but every component speaks its own language. Motherboard, GPU, RAM, fans, keyboard, mouse: each one ships with its own vendor software (Armoury Crate, iCUE, Mystic Light, Synapse, and friends). To control the whole machine you end up running three or four heavyweight apps in the background at once — each eating memory, each fighting the others for control of the same devices, and each forcing you to hop between mismatched interfaces just to change a color.

**DeckPilot centralizes all of it in one place:** a single, lightweight app to drive your RGB lighting across brands — and, over time, to keep the rest of your machine healthy too.

## Planned features

### v1 — RGB control
- **Per-component control** — set colors and effects for each device individually (motherboard, GPU, RAM, fans, peripherals…).
- **Global sync mode** — one switch to synchronize lighting across every component for a coherent, whole-machine look.

### Next — drivers & machine health
- **Driver detection & updates** — spot outdated or missing drivers and update them from one place.
- **Machine health** — surface useful signals about the state of your PC (temperatures, component status, and more).

## Tech stack

- **[Tauri](https://tauri.app/)** — lightweight, secure native shell (Rust core).
- **[Nuxt](https://nuxt.com/)** — Vue framework powering the UI.
- **[Tailwind CSS](https://tailwindcss.com/)** — utility-first styling.
- **[Nuxt UI](https://ui.nuxt.com/)** — component library.

## Target platforms

- 🪟 **Windows** — the primary target and first-class platform.
- 📱 **iPhone / iOS** — via Tauri's mobile support.

## Status

DeckPilot is at an early, pre-alpha stage. This repository currently holds the project's starting point (README + tooling config); the application itself is scaffolded next. Ideas and stars welcome. 🌟
