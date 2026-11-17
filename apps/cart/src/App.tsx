import { addToCart, storeInstanceId } from '@demo/cart-store';
import CartSummary from './components/CartSummary.tsx';

export default function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <h1>cart remote (standalone)</h1>
      <p>
        단독 실행 모드입니다. store instance: <code>{storeInstanceId}</code>
      </p>
      <button
        type="button"
        onClick={() => addToCart({ id: 'sample', name: '테스트 상품', price: 1000, emoji: '📦' })}
      >
        테스트 상품 담기
      </button>
      <CartSummary />
    </main>
  );
}
