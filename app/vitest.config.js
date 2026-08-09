import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
    testTimeout: 10000,
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.mjs'],
  },
});
