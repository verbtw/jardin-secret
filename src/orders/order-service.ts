import { supabase } from '../lib/supabase';
import type { CartLine } from '../domain/cart';
import type { Product } from '../types/product';

export interface OrderItem { productId: string; name: string; quantity: number; priceRub: number }
export interface CustomerOrder { id: string; publicCode: string; status: 'pending' | 'completed' | 'cancelled'; items: OrderItem[]; createdAt: string }

export function toOrderItems(lines: CartLine[], products: Product[]): OrderItem[] {
  return lines.map((line) => { const product = products.find((item) => item.id === line.productId); if (!product || product.priceRub == null) throw new Error(`Product ${line.productId} is not orderable`); return { productId: product.id, name: `${product.brand} ${product.name}`, quantity: line.quantity, priceRub: product.priceRub }; });
}
function orderCode() { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const bytes = crypto.getRandomValues(new Uint8Array(6)); return `JS-${[...bytes].map((byte) => alphabet[byte % alphabet.length]).join('')}`; }
export async function createOrder(userId: string, lines: CartLine[], products: Product[]) { if (!supabase) throw new Error('Supabase auth is not configured'); const { data, error } = await supabase.from('orders').insert({ user_id: userId, public_code: orderCode(), status: 'pending', items: toOrderItems(lines, products) }).select('id, public_code').single(); if (error) throw error; return { id: data.id as string, publicCode: data.public_code as string }; }
export async function loadOrders(userId: string): Promise<CustomerOrder[]> { if (!supabase) return []; const { data, error } = await supabase.from('orders').select('id, public_code, status, items, created_at').eq('user_id', userId).order('created_at', { ascending: false }); if (error) throw error; return (data ?? []).map((row) => ({ id: row.id, publicCode: row.public_code, status: row.status, items: row.items as unknown as OrderItem[], createdAt: row.created_at })); }
