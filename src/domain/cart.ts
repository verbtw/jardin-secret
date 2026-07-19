export interface CartLine { productId: string; quantity: number }
export type CartAction =
  | { type: 'add'; productId: string }
  | { type: 'set'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

function safeQuantity(quantity: number) {
  return Math.min(20, Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0)));
}

export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  if (action.type === 'clear') return [];
  if (action.type === 'remove') return lines.filter((line) => line.productId !== action.productId);
  const current = lines.find((line) => line.productId === action.productId);
  const quantity = safeQuantity(action.type === 'add' ? (current?.quantity ?? 0) + 1 : action.quantity);
  if (!quantity) return lines.filter((line) => line.productId !== action.productId);
  if (current) return lines.map((line) => line.productId === action.productId ? { ...line, quantity } : line);
  return [...lines, { productId: action.productId, quantity }];
}
