import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

export default defineConfig({
  plugins: [react(), shutdownPlugin()],
  server: { open: true },
})
