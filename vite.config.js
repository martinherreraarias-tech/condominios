import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'favicon-16.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Administración de Condominios',
        short_name: 'Condominios',
        description: 'Gestión de condominios: cobranza, accesos y comunicación. Por FortalezasConsultoria · Soluciones Digitales.',
        theme_color: '#0E5A47',
        background_color: '#0B4639',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
