// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }]
    }
  },
  routeRules: {
    '/workspaces': { ssr: false },

    '/:workspace/**': { ssr: false }
  },
  compatibilityDate: '2025-05-15',
  build: {
    transpile: ['emoji-mart-vue-fast']
  },
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/fonts', 'shadcn-nuxt', '@pinia/nuxt'],
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui'
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['emoji-mart-vue-fast']
    }
  },
  runtimeConfig: {
    resendApiKey: process.env.NUXT_RESEND_API_KEY,
    public: {
      baseUrl: 'http://localhost:3000',
      firebaseApiKey: process.env.NUXT_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.NUXT_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.NUXT_FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.NUXT_FIREBASE_MEASUREMENT_ID
    }
  }
})
