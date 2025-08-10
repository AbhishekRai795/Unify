import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // FIX: This section solves the 'global is not defined' error
  // by providing a polyfill for the global object.
  define: {
    global: 'globalThis',
  },
})
