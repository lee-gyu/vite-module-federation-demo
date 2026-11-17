# Q&A

이 예제를 만들면서 나온 질문과 답변을 정리했습니다. 전체 구조와 동작 원리는 [README.md](README.md)를 참고하세요.

- [Q1. 빌드한 뒤 순수한 HTML/JS/CSS만 서빙하는 구조에서도 동작하나요?](#q1-빌드한-뒤-순수한-htmljscss만-서빙하는-구조에서도-동작하나요)
- [Q2. host 설정의 `remotes`, `dts`, `shared`는 각각 무엇인가요?](#q2-host-설정의-remotes-dts-shared는-각각-무엇인가요)

---

## Q1. 빌드한 뒤 순수한 HTML/JS/CSS만 서빙하는 구조에서도 동작하나요?

**네, 동작합니다.** 빌드 결과물(`apps/*/dist`)은 정적 파일뿐이라 실행할 때 Node나 Vite가 필요 없습니다. 다만 remote를 어디에 두느냐에 따라 **CORS** 설정이 필요할 수 있습니다.

### 검증 결과

Vite가 아닌 최소 정적 파일 서버로 각 `dist`를 서빙하고, Chrome으로 확인했습니다.

| 배치 방식 | 결과 |
| --- | --- |
| 앱마다 다른 포트(출처)에 두고, CORS 헤더 없음 | ❌ host가 `remoteEntry.js`를 불러오지 못합니다(CORS 차단). |
| 앱마다 다른 포트에 두고, `Access-Control-Allow-Origin` 헤더 추가 | ✅ remote 로드, 상태 공유(singleton), remote CSS 모두 정상 |
| 한 서버(같은 출처)에 `/`, `/products/`, `/cart/` 경로로 배치 | ✅ CORS 설정 없이 정상. remote 단독 페이지도 정상 |

`pnpm preview`에서 CORS 문제가 없었던 것은 Vite preview 서버가 이 헤더를 처리해 주기 때문입니다. 일반 정적 서버(nginx, S3, CDN 등)에서는 직접 설정해야 합니다.

### 배치 방식별 빌드 방법

**A. 앱마다 다른 도메인에 두는 경우**: remote 서버에 CORS 헤더가 필요합니다.

```bash
PUBLIC_URL=https://products.example.com/ pnpm --filter @demo/products build
PUBLIC_URL=https://cart.example.com/     pnpm --filter @demo/cart build
PRODUCTS_URL=https://products.example.com CART_URL=https://cart.example.com pnpm --filter @demo/host build
```

**B. 한 도메인에 경로로 나눠 두는 경우**: CORS가 필요 없습니다.

```bash
PUBLIC_URL=/products/ pnpm --filter @demo/products build
PUBLIC_URL=/cart/     pnpm --filter @demo/cart build
PRODUCTS_URL=/products CART_URL=/cart pnpm --filter @demo/host build
```

```
배포 루트/
├── index.html, assets/ ...   ← apps/host/dist
├── products/                 ← apps/products/dist
└── cart/                     ← apps/cart/dist
```

### 정적으로 서빙할 때 지켜야 할 것

- **CORS**: remote를 host와 다른 출처에 두면, remote 서버가 `remoteEntry.js`, `mf-manifest.json`, `assets/*`에 `Access-Control-Allow-Origin` 헤더를 보내야 합니다. host는 이 파일들을 `<script type="module">`과 `import()`로 불러오는데, 다른 출처의 모듈 스크립트에는 CORS가 필요하기 때문입니다.
- **주소는 빌드할 때 고정됩니다**: remote의 `base`(청크를 받을 주소)와 host의 remote `entry` 주소가 결과물에 들어갑니다. 배포할 주소가 바뀌면 다시 빌드해야 합니다. 기본 빌드는 `http://localhost:5174`처럼 로컬 주소로 고정돼 있습니다.
- **캐시**: `remoteEntry.js`와 `mf-manifest.json`은 파일 이름에 해시가 붙지 않습니다. 오래 캐시하면 remote를 다시 배포해도 host가 이전 버전을 계속 씁니다. 이 두 파일은 `Cache-Control: no-cache`로 두고, 해시가 붙는 `assets/*`만 길게 캐시하세요.
- **HTTP 서버가 필요합니다**: `file://`로 직접 열면 ES 모듈 로딩이 막혀 동작하지 않습니다.
- **브라우저**: MF 런타임이 top-level await를 쓰므로 Chrome 89 이상 수준의 브라우저가 필요합니다(`build.target: 'chrome89'`).

---

## Q2. host 설정의 `remotes`, `dts`, `shared`는 각각 무엇인가요?

대상 파일: [apps/host/module-federation.config.ts](apps/host/module-federation.config.ts)

| 설정 | 한 줄 요약 | 영향 범위 |
| --- | --- | --- |
| `remotes` | 어떤 앱에서 모듈을 가져올지 | 실행 시 동작 |
| `dts` | 가져온 모듈의 TypeScript 타입 | 개발 중 타입 지원만 |
| `shared` | 함께 쓰는 라이브러리를 몇 벌 로드할지 | 실행 시 동작 |

### `remotes`: 어떤 앱에서 모듈을 가져올지

host가 불러올 remote 앱의 목록입니다.

```ts
remotes: {
  products: {
    type: 'module',
    name: 'products',
    entry: `${PRODUCTS_URL}/mf-manifest.json`,
  },
  cart: {
    type: 'module',
    name: 'cart',
    entry: `${CART_URL}/remoteEntry.js`,
  },
},
```

- **키 (`products`)**: 코드에서 `import('products/ProductList')`처럼 쓰는 이름입니다. 이 이름으로 시작하는 import는 플러그인이 런타임의 `loadRemote()` 호출로 바꿉니다.
- **`name`**: remote 쪽 설정의 `name`과 같아야 합니다. 런타임이 컨테이너를 구별하는 ID입니다.
- **`entry`**: remote를 찾을 주소입니다.
  - `mf-manifest.json` (products): 메타데이터를 먼저 읽고, 거기서 remoteEntry 위치, 타입 파일, 미리 받을 청크 정보를 얻습니다. MF 2.0에서 권장하는 방식입니다.
  - `remoteEntry.js` (cart): 컨테이너 파일을 바로 불러옵니다. 더 단순하지만 메타데이터는 없습니다.
- **`type: 'module'`**: remoteEntry가 ES 모듈이라는 뜻입니다. Vite로 빌드한 remote는 이 값이어야 합니다. 생략하면 `var`(전역 변수 방식)로 처리되고 경고가 납니다. `var`는 Webpack/Rspack remote처럼 전역 변수 형식을 쓰는 remote에만 사용합니다.

### `dts`: remote 모듈의 TypeScript 타입

`products/ProductList`는 host 프로젝트 안에 없는 모듈이라, 그대로 두면 TypeScript가 타입을 알 수 없습니다.

```ts
dts: {
  tsConfigPath: './tsconfig.app.json',
},
```

1. remote는 `exposes`에 적은 파일의 타입 선언을 만들어 `@mf-types.zip`으로 묶습니다.
2. host는 dev 서버가 시작될 때 각 remote에서 이 zip을 내려받아 `apps/host/@mf-types/`에 풉니다.
3. [apps/host/tsconfig.app.json](apps/host/tsconfig.app.json)의 `"paths": { "*": ["./@mf-types/*"] }`가 `products/ProductList`를 내려받은 `.d.ts`에 연결합니다.

그래서 `<ProductList title={123} />`처럼 잘못 쓰면 타입 에러가 납니다.

- **`tsConfigPath`**: 타입 처리에 쓸 tsconfig를 지정합니다. 이 프로젝트의 `tsconfig.json`은 app/node 설정을 references로 묶기만 하는 파일이라, 지정하지 않으면 타입 생성이 `TYPE-001` 에러로 실패합니다.
- dts는 **실행 동작에는 영향이 없습니다.** 개발할 때의 타입 지원만 담당합니다.
- host의 `pnpm typecheck`는 remote 타입이 필요하므로, `pnpm dev`를 한 번 실행해 타입을 받아온 다음에 돌려야 합니다.

### `shared`: host와 remote가 같이 쓸 의존성

여러 앱이 같은 라이브러리를 쓸 때, 페이지에서 그 라이브러리를 몇 벌 로드할지 정합니다.

```ts
shared: {
  react: { singleton: true },
  'react/': { singleton: true },
  'react-dom': { singleton: true },
  'react-dom/': { singleton: true },
  '@demo/cart-store': { singleton: true },
},
```

- **공유하지 않으면**: host와 remote가 각자 자기 번들의 React를 로드합니다. 용량이 늘고, React가 두 벌이 되면 hooks 에러가 납니다.
- **공유하면**: 각 앱은 자기 복사본을 버전과 함께 공유 영역(share scope)에 등록해 둡니다. 실행할 때는 등록된 것 중 하나를 골라 모두가 같이 씁니다. 기본 전략(`version-first`)은 조건을 만족하는 가장 높은 버전을 고릅니다.
- **`singleton: true`**: 페이지 전체에서 딱 한 벌만 쓰도록 강제합니다. React처럼 두 벌이면 안 되는 라이브러리나 전역 상태에 필요합니다.
- **`'react/'`, `'react-dom/'`**: 끝의 `/`는 하위 경로까지 공유한다는 뜻입니다(`react/jsx-runtime`, `react-dom/client` 등).
- **`@demo/cart-store`**: singleton이라 products에서 `addToCart()`를 호출하면 host와 cart가 보는 store가 바로 바뀝니다. 화면의 `store instance` 값이 세 곳 모두 같은 이유입니다.

shared는 **host와 remote 양쪽 설정에 모두 있어야** 공유가 성립합니다. 한쪽에만 있으면 다른 쪽은 자기 복사본을 따로 씁니다. remote를 단독으로 실행할 때는 공유해 줄 host가 없으므로 자기 복사본을 씁니다.
