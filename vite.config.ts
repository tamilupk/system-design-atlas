import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  build: {
    target: 'es2022',
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'systemdesign.tamilarasu.dev',
      '.tamilarasu.dev',
      'localhost',
    ],
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: [
      'systemdesign.tamilarasu.dev',
      '.tamilarasu.dev',
      'localhost',
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
