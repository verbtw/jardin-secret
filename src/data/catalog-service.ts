import type {Product} from '../types/product';

export interface PublicCatalogRow {
  id: string;
  slug: string;
  brand: string;
  name: string;
  flanker: string | null;
  concentration: string | null;
  volume_ml: number;
  retail_price_rub: number | null;
  price_status: 'pending' | 'published' | 'request' | 'review';
  availability: 'in_stock' | 'out_of_stock' | 'review';
  description: string;
  fragrance_family: string | null;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  key_notes: string[];
  key_accords: string[];
  perfumers: string[];
  launch_year: number | null;
  image_url: string | null;
  details_source_url: string | null;
  details_status: string;
  updated_at: string;
}

interface CatalogClient {
  from(table: string): {
    select(columns: string): {
      order(column: string, options: {ascending: boolean}): PromiseLike<{
        data: PublicCatalogRow[] | null;
        error: {message: string} | null;
      }>;
    };
  };
}

const catalogColumns = [
  'id', 'slug', 'brand', 'name', 'flanker', 'concentration', 'volume_ml',
  'retail_price_rub', 'price_status', 'availability', 'description',
  'fragrance_family', 'top_notes', 'heart_notes', 'base_notes', 'key_notes',
  'key_accords', 'perfumers', 'launch_year', 'image_url', 'details_source_url',
  'details_status', 'updated_at',
].join(',');

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function mapCatalogRow(row: PublicCatalogRow): Product {
  const notes = unique([...row.top_notes, ...row.heart_notes, ...row.base_notes, ...row.key_notes]);
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    name: [row.name, row.flanker].filter(Boolean).join(' '),
    concentration: row.concentration,
    volumeMl: Number(row.volume_ml),
    priceRub: row.price_status === 'published' ? row.retail_price_rub : null,
    gender: 'unknown',
    availability: row.availability === 'in_stock' ? 'in-stock' : 'ask-manager',
    description: row.description,
    notes,
    fragranceFamily: row.fragrance_family,
    topNotes: row.top_notes,
    heartNotes: row.heart_notes,
    baseNotes: row.base_notes,
    accords: row.key_accords,
    perfumers: row.perfumers,
    launchYear: row.launch_year,
    imageUrl: row.image_url || '/products/placeholder.svg',
    sourceUrl: row.details_source_url || '',
    sourcePostId: 0,
    publishedAt: row.updated_at,
  };
}

export async function loadPublicCatalog(client: CatalogClient): Promise<Product[]> {
  const {data, error} = await client.from('public_catalog').select(catalogColumns).order('updated_at', {ascending: false});
  if (error) throw new Error('Не удалось загрузить каталог');
  return (data ?? []).map(mapCatalogRow);
}
