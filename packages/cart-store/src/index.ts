import { useSyncExternalStore } from 'react';

export interface Product {
  id: string;
  name: string;
  price: number;
  emoji: string;
}

export interface CartItem extends Product {
  quantity: number;
}

type Listener = () => void;

/**
 * 이 모듈이 평가될 때마다 새로 만들어지는 값입니다.
 * host / products / cart 화면에 같은 값이 보이면
 * Module Federation `shared` 의 singleton 공유가 동작하고 있다는 뜻입니다.
 */
export const storeInstanceId = Math.random().toString(36).slice(2, 8);

let items: CartItem[] = [];
const listeners = new Set<Listener>();

function emit(next: CartItem[]) {
  items = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return items;
}

export function addToCart(product: Product) {
  const existing = items.find((item) => item.id === product.id);
  emit(
    existing
      ? items.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      : [...items, { ...product, quantity: 1 }],
  );
}

export function removeFromCart(id: string) {
  emit(items.filter((item) => item.id !== id));
}

export function clearCart() {
  emit([]);
}

export function useCart() {
  const cartItems = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { items: cartItems, totalQuantity, totalPrice };
}

export function formatPrice(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}
