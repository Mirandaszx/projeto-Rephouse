import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  publicDir: 'publico',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.REPHOUSE_API_URL || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
