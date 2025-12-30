import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/token': {
        target: 'https://accounts.spotify.com/api/token',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/token/, ''),
      },
      // Proxy rule for local development to match Vercel serverless function path
      '/api/search': {
        target: 'https://api.spotify.com/v1/search',
        changeOrigin: true,
        rewrite: (path) => {
          // we need to keep the query parameters but remove /api/search part if we target /v1/search directly
          // However, target is /v1/search, so we just remove /api/search from path
          return path.replace(/^\/api\/search/, '');
        },
      },
    },
  },
});
