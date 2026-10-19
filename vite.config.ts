import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/game': {
        target: 'http://127.0.0.1:2567',
        ws: true,
        rewrite: path => path.replace(/^\/game/, ''),
      },
    },
  },
  build: { target: 'es2022', outDir: process.env.BOAT_CLIENT_OUT ?? 'dist' },
});
