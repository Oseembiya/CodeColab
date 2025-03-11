import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'fabric': 'fabric-pure-browser',
    },
  },
  optimizeDeps: {
    include: ['fabric-pure-browser'],
  },
  build: {
    commonjsOptions: {
      include: [/fabric-pure-browser/, /node_modules/],
    },
  },
}); 