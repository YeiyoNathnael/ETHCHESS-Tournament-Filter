// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-12',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  runtimeConfig: {
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL || process.env.NUXT_TURSO_DATABASE_URL || 'file:local.db',
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN || process.env.NUXT_TURSO_AUTH_TOKEN || '',
    lichessToken: process.env.LICHESS_TOKEN || process.env.NUXT_LICHESS_TOKEN || '',
  },
  css: ['~/assets/css/main.css'],
  vite: {
    server: {
      allowedHosts: true,
    },
  },
  nitro: {
    devServer: {
      host: '0.0.0.0',
    },
  },
  app: {
    head: {
      title: 'ETHCHESS — Tournament Participant Filter & Event Portal',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'ETHCHESS Club official tournament participant reviewer, player qualification filter, and live event management portal.',
        },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
        },
      ],
    },
  },
});
