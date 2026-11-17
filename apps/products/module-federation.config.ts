import { createModuleFederationConfig } from '@module-federation/vite';

/**
 * Remote(Provider): 다른 앱이 가져다 쓸 모듈을 `exposes` 로 공개합니다.
 * 빌드 결과물에 remoteEntry.js 와 mf-manifest.json 이 함께 생성됩니다.
 */
export default createModuleFederationConfig({
  name: 'products',
  filename: 'remoteEntry.js',
  manifest: true,
  // 공개(expose)한 모듈의 타입(@mf-types.zip)을 생성해 host 가 내려받을 수 있게 합니다.
  dts: {
    tsConfigPath: './tsconfig.app.json',
  },
  dev: {
    // host 의 dev.remoteHmr 와 짝을 이룹니다. remote 쪽에도 켜야 React Fast Refresh 가 host 화면까지 전달됩니다.
    remoteHmr: true,
  },
  exposes: {
    './ProductList': './src/components/ProductList.tsx',
  },
  shared: {
    react: { singleton: true },
    'react/': { singleton: true },
    'react-dom': { singleton: true },
    'react-dom/': { singleton: true },
    '@demo/cart-store': { singleton: true },
  },
});
