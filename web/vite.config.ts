import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages serves this app from https://<user>.github.io/<repo>/, not
  // the domain root, so asset URLs need the repo-name prefix baked in for
  // that deployment. Local dev (`npm run dev`) and any other host are
  // unaffected since GH_PAGES is only set by the Pages deploy CI step.
  base: process.env.GH_PAGES ? '/burnout-ai/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
