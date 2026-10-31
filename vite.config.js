import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5174,
    // Dev: the browser talks to /api on this origin; Vite forwards it to foodstorage-api.
    // Same origin means the HttpOnly refresh cookie just works, with no CORS.
    proxy: { '/api': { target: process.env.VITE_DEV_API_TARGET ?? 'http://localhost:3001' } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
});
