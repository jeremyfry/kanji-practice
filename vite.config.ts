import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // In dev, proxy /api/* to the Hono server running on port 3000
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
