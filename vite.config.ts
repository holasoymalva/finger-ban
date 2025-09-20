import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    open: true
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['@mediapipe/hands', '@mediapipe/camera_utils', '@mediapipe/drawing_utils']
  }
});