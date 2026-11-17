import { createModuleFederationConfig } from '@module-federation/vite';

// 배포 환경에서는 환경 변수로 remote 주소를 바꿀 수 있습니다.
const PRODUCTS_URL = process.env.PRODUCTS_URL ?? 'http://localhost:5174';
const CART_URL = process.env.CART_URL ?? 'http://localhost:5175';

/**
 * Host(Consumer): `remotes` 에 등록한 앱의 모듈을
 * `import('<remote 이름>/<expose 키>')` 형태로 가져다 씁니다.
 */
export default createModuleFederationConfig({
  name: 'host',
  remotes: {
    // 1) manifest(mf-manifest.json) 방식 — MF 2.0 권장. 타입/프리로드 정보까지 포함됩니다.
    products: {
      type: 'module',
      name: 'products',
      entry: `${PRODUCTS_URL}/mf-manifest.json`,
    },
    // 2) remoteEntry.js 직접 지정 방식
    cart: {
      type: 'module',
      name: 'cart',
      entry: `${CART_URL}/remoteEntry.js`,
    },
  },
  // remote 의 타입(@mf-types)을 자동으로 내려받아 `import('products/ProductList')` 에 타입을 붙여 줍니다.
  dts: {
    tsConfigPath: './tsconfig.app.json',
  },
  dev: {
    // remote 코드를 수정하면 host 화면에도 HMR 로 반영됩니다.
    remoteHmr: true,
  },
  // host 와 remote 가 같은 인스턴스를 쓰도록 singleton 으로 공유합니다.
  shared: {
    react: { singleton: true },
    'react/': { singleton: true },
    'react-dom': { singleton: true },
    'react-dom/': { singleton: true },
    '@demo/cart-store': { singleton: true },
  },
});
