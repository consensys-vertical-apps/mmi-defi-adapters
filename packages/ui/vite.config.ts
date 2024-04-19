import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env,
  },
  resolve: {
    alias: {
      '@metamask-institutional/defi-adapters': path.resolve(
        __dirname,
        '../lib',
      ),
    },
  },
})
