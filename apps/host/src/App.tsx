import { addToCart, storeInstanceId, useCart } from '@demo/cart-store';
import { lazy } from 'react';
import { RemoteBoundary } from './components/RemoteBoundary.tsx';

// `<remote 이름>/<expose 키>` 로 remote 모듈을 동적 import 합니다.
const ProductList = lazy(() => import('products/ProductList'));
const CartSummary = lazy(() => import('cart/CartSummary'));

export default function App() {
  const { totalQuantity } = useCart();

  return (
    <div className="layout">
      <header className="header">
        <div>
          <span className="badge">host · :5173</span>
          <h1>Vite Module Federation Demo</h1>
          <p>
            host 가 보는 장바구니 수량: <strong>{totalQuantity}</strong>
            <br />
            store instance: <code>{storeInstanceId}</code> — remote 들과 같은 값이면 singleton 공유 성공
          </p>
          <button
            type="button"
            onClick={() => addToCart({ id: 'gift', name: 'host 가 담은 사은품', price: 0, emoji: '🎁' })}
          >
            host 에서 사은품 담기
          </button>
        </div>

        <RemoteBoundary name="cart">
          <CartSummary />
        </RemoteBoundary>
      </header>

      <main>
        <RemoteBoundary name="products">
          <ProductList title="오늘의 추천 상품" />
        </RemoteBoundary>
      </main>
    </div>
  );
}
