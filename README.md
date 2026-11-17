# Vite Module Federation Demo

[`@module-federation/vite`](https://module-federation.io/integrations/build-tool/vite.html)로 만든 **Module Federation 2.0 모노레포 예제**입니다.
pnpm workspace + Vite 8 + React 19 + TypeScript를 사용합니다.

```
┌──────────────────────────── host (Consumer) :5173 ────────────────────────────┐
│                                                                               │
│   import('cart/CartSummary')              import('products/ProductList')      │
│            │                                         │                        │
└────────────┼─────────────────────────────────────────┼────────────────────────┘
             ▼ remoteEntry.js                          ▼ mf-manifest.json
   ┌──── cart (Provider) :5175 ────┐       ┌──── products (Provider) :5174 ────┐
   │ exposes ./CartSummary         │       │ exposes ./ProductList             │
   └───────────────────────────────┘       └───────────────────────────────────┘

        shared (singleton): react · react-dom · @demo/cart-store
```

## 구조

```
.
├── apps/
│   ├── host/        # Consumer: remote 두 개를 조합하는 셸 앱 (5173)
│   ├── products/    # Provider: 상품 목록 expose (5174)
│   └── cart/        # Provider: 장바구니 위젯 expose (5175)
├── packages/
│   └── cart-store/  # 모든 앱이 singleton으로 공유하는 상태 (workspace 패키지)
├── pnpm-workspace.yaml   # workspace + catalog(공통 버전 관리)
└── tsconfig.base.json
```

각 앱은 공식 문서처럼 `module-federation.config.ts`에 MF 설정을 두고, `vite.config.ts`에서 `federation(mfConfig)`로 등록합니다.

| 파일 | 역할 |
| --- | --- |
| `apps/*/module-federation.config.ts` | 앱 이름, `exposes`(공개할 모듈), `remotes`(가져올 앱), `shared`(공유할 의존성), `dts`, `dev.remoteHmr`를 설정합니다. |
| `apps/*/vite.config.ts` | `federation()` 플러그인 등록, 고정 포트, remote의 절대 URL `base`, `build.target: 'chrome89'`을 설정합니다. |
| `apps/host/src/App.tsx` | `lazy(() => import('products/ProductList'))`처럼 remote 모듈을 불러옵니다. |
| `apps/host/src/components/RemoteBoundary.tsx` | remote마다 Suspense(로딩)와 ErrorBoundary(실패)를 씌웁니다. |
| `apps/{products,cart}/src/main.tsx` | remote를 단독으로 실행할 때 쓰는 진입점입니다. host는 이 파일을 쓰지 않고 `exposes`에 적은 모듈만 가져갑니다. |
| `packages/cart-store/src/index.ts` | `useSyncExternalStore` 기반의 작은 전역 상태입니다. 모듈이 처음 평가될 때 `storeInstanceId`가 정해지므로, 화면에 보이는 값으로 같은 인스턴스를 쓰는지 확인할 수 있습니다. |

## 동작 원리

### 1. 빌드하면 remote에서 무엇이 나오나

remote(products, cart)를 빌드하면 일반 Vite 결과물 옆에 아래 파일이 함께 생깁니다.

| 파일 | 내용 |
| --- | --- |
| `remoteEntry.js` | remote의 컨테이너입니다. `init(shareScope)`와 `get('./ProductList')` 두 함수를 내보냅니다. |
| `mf-manifest.json` | remoteEntry 위치, `publicPath`, 공개한 모듈과 그 청크 목록, shared 버전, 타입 파일 위치를 담은 메타데이터입니다. |
| `@mf-types.zip`, `@mf-types.d.ts` | 공개한 모듈의 타입 선언입니다. host가 내려받습니다. |

dev 서버도 같은 경로로 이 파일들을 서빙하므로, 개발 중에도 동작 방식은 같습니다.

### 2. host가 remote 모듈을 불러오는 순서

```
index.html
  └─ mf-entry-bootstrap        ← 플러그인이 원래 진입점 앞에 끼워 넣는 스크립트
       ├─ initHost()           ← MF 런타임 생성, remotes·shared 등록, shared 버전 협상
       └─ main.tsx 실행         ← 협상이 끝난 다음에 앱이 시작됨
            └─ import('products/ProductList')
                 └─ loadRemote('products/ProductList')   ← 플러그인이 import를 런타임 호출로 바꿈
                      ├─ mf-manifest.json 조회 → remoteEntry.js 위치 확인
                      ├─ remoteEntry.js 로드 → init(shareScope)로 공유 의존성 연결
                      └─ get('./ProductList') → 모듈 반환 → React.lazy가 렌더링
```

- `import('products/ProductList')`는 실제 패키지 경로가 아닙니다. `remotes`에 등록된 이름(`products`)으로 시작하면 플러그인이 런타임의 `loadRemote()` 호출로 바꿉니다.
- products는 manifest로 등록해서 manifest를 먼저 읽습니다. cart는 `remoteEntry.js`를 직접 가리키므로 이 단계를 건너뜁니다.
- 앱 코드가 실행되기 전에 `initHost()`가 끝나야 shared 모듈을 한 벌만 쓸 수 있습니다. 이 순서는 플러그인이 HTML을 고쳐서 맞춰 줍니다(`hostInitInjectLocation: 'html'`, 기본값).

### 3. shared 의존성은 어떻게 하나만 쓰이나

- 각 앱은 `shared`에 적은 패키지(react, react-dom, `@demo/cart-store`)를 **자기 번들에도 대비용으로 포함**하고, 버전과 함께 공유 영역(share scope)에 등록합니다.
- remote 코드 안의 `import { useCart } from '@demo/cart-store'`는 빌드할 때 `loadShare('@demo/cart-store')`로 바뀝니다. 실행할 때 공유 영역에서 이미 등록된 것을 꺼내 씁니다.
- `singleton: true`면 페이지 전체에서 한 벌만 씁니다. 기본 전략(`version-first`)은 등록된 버전 가운데 조건을 만족하는 가장 높은 버전을 고릅니다.
- 그래서 products가 `addToCart()`를 호출하면 host와 cart가 구독하는 바로 그 store가 바뀝니다. remote를 단독으로 실행하면 공유해 줄 host가 없으므로 자기 번들의 복사본을 씁니다.
- React는 반드시 singleton이어야 합니다. 두 벌이 로드되면 hooks 에러가 납니다. `'react/'`, `'react-dom/'` 키는 `react/jsx-runtime`, `react-dom/client` 같은 하위 경로까지 공유하기 위한 설정입니다.

### 4. 원격 타입(dts)

1. remote는 `exposes`에 적은 파일만 `tsc`로 선언 파일을 만들어 `@mf-types.zip`으로 묶습니다.
2. host는 dev 서버를 시작할 때 실행 중인 remote에서 zip을 내려받아 `apps/host/@mf-types/`에 풉니다. manifest 방식이면 manifest에 적힌 경로를, remoteEntry 방식이면 remoteEntry 옆 경로를 씁니다.
3. host의 `tsconfig.app.json`에 있는 `"paths": { "*": ["./@mf-types/*"] }`가 `products/ProductList`를 `@mf-types/products/ProductList.d.ts`로 연결합니다.

`@mf-types`는 생성물이므로 git에 올리지 않습니다.

### 5. Remote HMR

- remote 모듈은 host 페이지 안에서 실행되지만, 파일 변경은 각 remote의 Vite dev 서버가 감지해서 알립니다. 그래서 브라우저 콘솔에 `[vite] connected`가 여러 번 찍힙니다.
- React Fast Refresh가 동작하려면 remote 컴포넌트가 **host의 React에 연결된 Refresh 런타임**에 등록돼야 합니다. `dev.remoteHmr: true`를 켜면 remote 서버의 `/@react-refresh` 요청이 host의 Refresh 런타임으로 넘어가도록 프록시됩니다.
- 이 프록시는 remote 쪽 플러그인이 설치합니다. 그래서 host와 remote 양쪽에 `remoteHmr`를 켜야 합니다.

## 실행

Node 24와 pnpm 12가 필요합니다. `mise.toml`에 버전이 고정돼 있으니 `mise install`로 설치하면 됩니다.

```bash
pnpm install
pnpm dev        # cart-store 빌드 후 host/products/cart dev 서버를 동시에 실행
```

http://localhost:5173 을 열면 됩니다. remote 앱도 단독으로 열 수 있습니다(http://localhost:5174, http://localhost:5175).

| 스크립트 | 설명 |
| --- | --- |
| `pnpm dev` | 세 앱의 개발 서버를 실행합니다. |
| `pnpm build` | 프로덕션 빌드를 만듭니다. remote는 `remoteEntry.js`, `mf-manifest.json`, `@mf-types.zip`도 함께 만듭니다. |
| `pnpm preview` | 빌드 결과물을 같은 포트로 서빙합니다. |
| `pnpm typecheck` | 전체 타입을 검사합니다. host는 remote 타입이 필요하므로 `pnpm dev`를 한 번 실행한 다음에 돌려야 합니다. |
| `pnpm clean` | 빌드 산출물과 생성된 타입을 지웁니다. |

## 데모에서 확인할 수 있는 것

| 개념 | 확인 방법 | 관련 설정 |
| --- | --- | --- |
| **Remote / Host** | host 화면의 파란 영역은 products, 초록 영역은 cart가 그립니다. | `exposes` / `remotes` |
| **두 가지 remote 등록 방식** | products는 `mf-manifest.json`, cart는 `remoteEntry.js`로 연결합니다. | `apps/host/module-federation.config.ts` |
| **Shared singleton** | products에서 담은 상품이 cart 위젯과 host 헤더에 함께 반영됩니다. 화면의 `store instance` 값도 모두 같습니다. | `shared: { '@demo/cart-store': { singleton: true } }` |
| **원격 타입 (dts)** | `pnpm dev`를 실행하면 `apps/host/@mf-types`가 생기고, `import('products/ProductList')`에 props 타입이 붙습니다. | `dts` |
| **Remote HMR** | dev 중에 `apps/products/src/components/ProductList.tsx`를 고치면 host 화면이 새로고침 없이 바뀝니다. 장바구니 상태도 유지됩니다. | host와 remote 모두 `dev.remoteHmr: true` |
| **장애 격리** | cart 서버만 내린 채 host를 열면 cart 영역에만 에러가 표시되고 상품 목록은 계속 동작합니다. | `apps/host/src/components/RemoteBoundary.tsx` |

## 새 remote 추가하기

1. `apps/products`를 복사해 이름과 포트를 바꿉니다(`package.json`의 `name`, `vite.config.ts`의 `PORT`).
2. `module-federation.config.ts`에서 `name`과 `exposes`를 바꿉니다.
3. host의 `remotes`에 `{ type: 'module', name, entry: 'http://localhost:<port>/mf-manifest.json' }`를 추가합니다.
4. host에서 `lazy(() => import('<name>/<expose 키>'))`로 가져다 씁니다.

## 배포할 때

remote의 청크는 host 페이지 안에서 로드되므로 remote의 `base`는 절대 URL이어야 합니다. 환경 변수로 주소를 바꿀 수 있습니다.

```bash
PUBLIC_URL=https://cdn.example.com/products/ pnpm --filter @demo/products build
PUBLIC_URL=https://cdn.example.com/cart/     pnpm --filter @demo/cart build
PRODUCTS_URL=https://cdn.example.com/products CART_URL=https://cdn.example.com/cart pnpm --filter @demo/host build
```

remote 서버는 host 도메인에서 요청할 수 있도록 CORS를 허용해야 합니다.

## 참고할 점

- **remote는 `type: 'module'`로 등록합니다.** 객체로 등록할 때 `type`을 빼면 `var`로 처리되고 경고가 납니다.
- **`dev.remoteHmr`는 host와 remote 양쪽에 켜야 합니다.** host에만 켜면 HMR 이벤트는 오지만 React 화면은 다시 그려지지 않습니다.
- **`build.target: 'chrome89'`가 필요합니다.** MF 런타임이 top-level await를 사용하기 때문입니다.
- **`dts.tsConfigPath`를 지정합니다.** 각 앱의 `tsconfig.json`은 app/node 설정을 references로 묶기만 하는 파일이라, 타입 생성용 설정으로 `tsconfig.app.json`을 지정해야 합니다.
- **`@demo/cart-store`는 `dist`로 빌드해서 공유합니다.** `pnpm dev`와 `pnpm build`가 먼저 빌드합니다. 이 패키지를 고친 뒤에는 `pnpm build:packages`를 다시 실행하세요.

## 참고 문서

- Module Federation 소개: https://module-federation.io/guide/start/index.html
- Vite 통합: https://module-federation.io/integrations/build-tool/vite.html
- 공식 Vite 예제 모음: https://github.com/gioboa/module-federation-vite-examples
