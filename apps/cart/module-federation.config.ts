import { createModuleFederationConfig } from '@module-federation/vite';

/**
 * Remote(Provider): 장바구니 요약 위젯을 공개합니다.
 */
export default createModuleFederationConfig({
  name: 'cart',
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
    './CartSummary': './src/components/CartSummary.tsx',
  },
  shared: {
    react: { singleton: true },
    'react/': { singleton: true },
    'react-dom': { singleton: true },
    'react-dom/': { singleton: true },
    '@demo/cart-store': { singleton: true },
  },
});
