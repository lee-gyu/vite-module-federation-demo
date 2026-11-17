import { addToCart, formatPrice } from '@demo/cart-store';
import { products } from '../products.ts';
import styles from './ProductList.module.css';

export interface ProductListProps {
  /** 목록 상단에 표시할 제목 */
  title?: string;
}

export default function ProductList({ title = '상품 목록' }: ProductListProps) {
  return (
    <section className={styles.wrapper}>
      <span className={styles.badge}>remote: products · :5174</span>
      <h2>{title}</h2>
      <div className={styles.grid}>
        {products.map((product) => (
          <article key={product.id} className={styles.card}>
            <span className={styles.emoji}>{product.emoji}</span>
            <strong>{product.name}</strong>
            <span className={styles.price}>{formatPrice(product.price)}</span>
            <button type="button" className={styles.button} onClick={() => addToCart(product)}>
              장바구니 담기
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
