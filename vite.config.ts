import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/auth':      { target: 'https://auth-service-production-622a.up.railway.app',     changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/auth/, '') },
      '/api/incidents': { target: 'https://incident-service-production-9dd1.up.railway.app',  changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/incidents/, '') },
      '/api/dispatch':  { target: 'https://dispatch-service-production-bd20.up.railway.app',  changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/dispatch/, '') },
      '/api/analytics': { target: 'https://analytics-service-production-7584.up.railway.app', changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/analytics/, '') },
    },
  },
})
