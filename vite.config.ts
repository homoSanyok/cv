import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: "public",
  base: "/cv/",
  build: {
    assetsDir: "assets",
    outDir: "dist"
  },
  server: {
    port: 8080,
    open: true,
  },
  plugins: [react()],
})
