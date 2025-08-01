import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  server: {
    port: 3000,
    host: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})