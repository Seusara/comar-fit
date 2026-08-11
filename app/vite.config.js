import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase-vendor';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-router')) return 'react-vendor';
          return undefined;
        },
      },
    },
  },
});
