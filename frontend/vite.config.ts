import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5093',
      // SignalR negotiates over HTTP and then upgrades to a WebSocket, so the proxy needs ws: true.
      '/hubs': { target: 'http://localhost:5093', ws: true },
    },
  },
})
