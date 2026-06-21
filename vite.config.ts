import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function shutdownPlugin() {
  return {
    name: 'shutdown',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/__shutdown', (_req: unknown, res: import('http').ServerResponse) => {
        res.end('ok');
        server.close().then(() => process.exit(0));
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/sudoku/',
  plugins: [
    react(),
    shutdownPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '数独',
        short_name: '数独',
        description: 'ブラウザで動く数独パズルゲーム',
        theme_color: '#2563eb',
        background_color: '#f0f4f8',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: { open: true },
}));
