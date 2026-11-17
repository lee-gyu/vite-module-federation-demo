import { storeInstanceId, useCart } from '@demo/cart-store';
import ProductList from './components/ProductList.tsx';

export default function App() {
  const { totalQuantity } = useCart();

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1>products remote (standalone)</h1>
      <p>
        단독 실행 모드입니다. 장바구니 수량: <strong>{totalQuantity}</strong> · store instance:{' '}
        <code>{storeInstanceId}</code>
      </p>
      <ProductList />
    </main>
  );
}
