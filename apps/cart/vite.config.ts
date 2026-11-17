import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import mfConfig from './module-federation.config.ts';

const PORT = 5175;
// 배포 시에는 실제 서비스 URL 로 바꿔 주세요. (예: PUBLIC_URL=https://cdn.example.com/cart/)
const PUBLIC_URL = process.env.PUBLIC_URL ?? `http://localhost:${PORT}/`;

export default defineConfig({
  // remote 의 청크/에셋은 host 페이지 안에서 로드되므로 절대 URL 이 필요합니다.
  base: PUBLIC_URL,
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
