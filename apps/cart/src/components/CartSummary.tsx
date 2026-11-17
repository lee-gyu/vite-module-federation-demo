import { clearCart, formatPrice, removeFromCart, storeInstanceId, useCart } from '@demo/cart-store';
import styles from './CartSummary.module.css';

export default function CartSummary() {
  const { items, totalQuantity, totalPrice } = useCart();

  return (
    <aside className={styles.wrapper}>
      <span className={styles.badge}>remote: cart · :5175</span>
      <h3>🛒 장바구니 ({totalQuantity})</h3>

      {items.length === 0 ? (
        <p className={styles.empty}>담긴 상품이 없습니다.</p>
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <span>
                  {item.emoji} {item.name} × {item.quantity}
                </span>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`${item.name} 삭제`}
                  onClick={() => removeFromCart(item.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.total}>
            <span>합계</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
          <button type="button" onClick={clearCart}>
            비우기
          </button>
        </>
      )}

      <p className={styles.meta}>
        store instance: <code>{storeInstanceId}</code>
      </p>
    </aside>
  );
}
