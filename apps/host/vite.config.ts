import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import mfConfig from './module-federation.config.ts';

const PORT = 5173;

export default defineConfig({
  server: {
    port: PORT,
    strictPort: true,
    origin: `http://localhost:${PORT}`,
  },
  preview: {
    port: PORT,
    strictPort: true,
  },
  plugins: [react(), federation(mfConfig)],
  build: {
    // Module Federation 런타임이 top-level await 를 사용하므로 chrome89 이상이 필요합니다.
    target: 'chrome89',
  },
});
