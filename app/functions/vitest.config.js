import { defineConfig } from 'vitest/config';

// Vitest config for Cloud Functions tests.
// Runs in a real Node environment so firebase-admin and luxon are available.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.js'],
    server: {
      deps: {
        // Let Node resolve these from functions/node_modules directly
        inline: [],
        external: [/firebase-admin/, /luxon/, /firebase-functions/],
      },
    },
  },
});
