export type ProductGender = 'women' | 'men' | 'unisex' | 'unknown';
export type ProductAvailability = 'in-stock' | 'ask-manager';

export interface Product {
  id: string;
  slug: string;
  brand: string;
  name: string;
  concentration?: string | null;
  volumeMl: number | null;
  priceRub: number | null;
  gender: ProductGender;
  availability: ProductAvailability;
  description: string;
  notes: string[];
  fragranceFamily?: string | null;
  topNotes?: string[];
  heartNotes?: string[];
  baseNotes?: string[];
  accords?: string[];
  perfumers?: string[];
  launchYear?: number | null;
  imageUrl: string;
  sourceUrl: string;
  sourcePostId: number;
  publishedAt: string | null;
}
