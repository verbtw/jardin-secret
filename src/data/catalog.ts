import products from './products.json';
import legacyDetails from './legacy-details.json';
import type { Product } from '../types/product';

export function getProducts(): Product[] {
  return (products as Product[]).map((product) => {
    const details = (legacyDetails as Record<string, Partial<Product>>)[product.slug];
    if (!details) throw new Error(`Missing curated details for ${product.slug}`);
    const notes = [...new Set([
      ...(details.topNotes ?? []), ...(details.heartNotes ?? []),
      ...(details.baseNotes ?? []), ...(details.keyNotes ?? []),
    ])];
    return {...product, ...details, notes};
  });
}
