// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

// True for the Tauri desktop build (`tauri:dev` / `tauri:build`): the app is generated
// as a static SPA embedded in the desktop shell.
const isDesktopBuild: boolean = process.env.NUXT_DESKTOP_BUILD === '1'

// Dedicated build dir for `scripts/typecheck.mjs`: the running dev server owns `.nuxt`.
const typecheckBuildDirectory: string | undefined = process.env.NUXT_TYPECHECK_BUILD_DIR

// True when building/deploying the iPhone PWA on deckpilote.dibodev.fr (API relay + mobile shell).
const isMobileDeploy: boolean = process.env.NUXT_MOBILE_DEPLOY === '1'

export default defineNuxtConfig({
  ...(typecheckBuildDirectory ? { buildDir: typecheckBuildDirectory } : {}),

  modules: ['@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt', '@pinia/nuxt'],

  // DeckPilot is a desktop-first application shell, never a server-rendered site.
  ssr: false,

  components: [
    {
      path: '~/components/ui',
      prefix: 'Ui',
    },
    {
      path: '~/components',
      pathPrefix: false,
      ignore: ['**/ui/**'],
    },
  ],

  devtools: { enabled: !isDesktopBuild },

  app: {
    head: {
      title: 'DeckPilot',
      titleTemplate: '%s · DeckPilot',
      htmlAttrs: {
        lang: 'fr',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        {
          name: 'description',
          content:
            'DeckPilot pilote le RGB de tous les composants du PC — multi-marques — et surveille la santé de la machine, depuis un seul endroit.',
        },
        { name: 'theme-color', content: '#0C0A14' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'DeckPilot' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        // App typography — Bricolage Grotesque (display), DM Sans (UI), DM Mono (data), from Google Fonts.
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap',
        },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  // DeckPilot lives in the dark — an "RGB aquarium". Dark is the committed default.
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: '',
  },

  ui: {
    // Disable @nuxt/ui's bundled font self-hosting; the app fonts are loaded from the
    // Google Fonts CDN <link> in app.head instead.
    fonts: false,
    theme: {
      colors: ['primary', 'neutral', 'success', 'info', 'warning', 'error'],
    },
  },

  runtimeConfig: {
    public: {
      // True for the Tauri desktop build.
      isDesktop: isDesktopBuild,
      githubRepo: process.env.NUXT_PUBLIC_GITHUB_REPO || 'dibodev/deckpilot',
      desktopReleaseChannel: process.env.NUXT_PUBLIC_DESKTOP_RELEASE_CHANNEL || 'latest',
    },
  },

  compatibilityDate: '2024-07-11',

  nitro: {
    preset: isMobileDeploy ? 'node-server' : 'static',
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'only-multiline',
        braceStyle: '1tbs',
      },
    },
  },
})
