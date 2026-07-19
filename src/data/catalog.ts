import products from './products.json';
import type { Product } from '../types/product';

export function getProducts(): Product[] {
  return products as Product[];
}
