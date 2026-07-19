import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { getProducts } from '../data/catalog';
import { cartReducer, type CartLine } from '../domain/cart';

const STORAGE_KEY = 'jardin-secret-cart-v1';
const products = getProducts();
const validIds = new Set(products.map((product) => product.id));

interface CartContextValue {
  lines: CartLine[];
  add: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  itemCount: number;
  knownSubtotal: number;
  unknownPriceCount: number;
}

function loadCart(): CartLine[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line): line is CartLine => Boolean(line && typeof line.productId === 'string' && validIds.has(line.productId) && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 20));
  } catch {
    return [];
  }
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, [], loadCart);
  useEffect(() => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)), [lines]);
  const value = useMemo<CartContextValue>(() => {
    const resolved = lines.map((line) => ({ line, product: products.find((product) => product.id === line.productId)! }));
    return {
      lines,
      add: (productId) => dispatch({ type: 'add', productId }),
      setQuantity: (productId, quantity) => dispatch({ type: 'set', productId, quantity }),
      remove: (productId) => dispatch({ type: 'remove', productId }),
      clear: () => dispatch({ type: 'clear' }),
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      knownSubtotal: resolved.reduce((sum, { line, product }) => sum + (product.priceRub ?? 0) * line.quantity, 0),
      unknownPriceCount: resolved.filter(({ product }) => product.priceRub === null).length,
    };
  }, [lines]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
