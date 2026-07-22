import {supabase} from '../lib/supabase';

export interface AdminProduct {
  id: string;
  slug: string;
  brand: string;
  name: string;
  flanker: string | null;
  concentration: string | null;
  volume_ml: number;
  availability: 'in_stock' | 'out_of_stock' | 'review';
  published: boolean;
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
  details_status: 'missing' | 'partial' | 'verified' | 'review';
  auto_price_rub: number | null;
  manual_price_rub: number | null;
  price_mode: 'auto' | 'manual';
  price_status: 'pending' | 'published' | 'request' | 'review';
  cost_rub: number | null;
  competitor_rub: number | null;
  calculated_profit_rub: number | null;
  pricing_rule: string | null;
  pricing_flagged: boolean | null;
  updated_at: string;
}

export interface AdminProductPatch {
  brand?: string;
  name?: string;
  flanker?: string | null;
  concentration?: string | null;
  volume_ml?: number;
  description?: string;
  fragrance_family?: string | null;
  top_notes?: string[];
  heart_notes?: string[];
  base_notes?: string[];
  key_notes?: string[];
  key_accords?: string[];
  perfumers?: string[];
  launch_year?: number | null;
  image_url?: string | null;
  details_source_url?: string | null;
  details_status?: AdminProduct['details_status'];
  availability?: AdminProduct['availability'];
  published?: boolean;
  manual_price_rub?: number | null;
  price_mode?: AdminProduct['price_mode'];
  price_status?: AdminProduct['price_status'];
}

export interface AdminOrder {
  id: string;
  public_code: string;
  status: 'pending' | 'completed' | 'cancelled';
  items: Array<{name?: string; quantity?: number}>;
  created_at: string;
  completed_at: string | null;
}

export interface AdminReview {
  id: string;
  rating: number;
  body: string;
  status: 'pending' | 'published' | 'rejected';
  created_at: string;
}

export interface AdminImportReviewRow {
  id: string;
  supplier_code: string;
  source_row: string;
  cost_rub: number;
  parse_reason: string;
  observed_at: string;
}

interface RpcClient {
  rpc(name: string): PromiseLike<{data: AdminProduct[] | null; error: {message: string} | null}>;
}

interface UpdateClient {
  from(table: string): {
    update(patch: AdminProductPatch): {
      eq(column: string, value: string): PromiseLike<{error: {message: string} | null}>;
    };
  };
}

function configuredClient() {
  if (!supabase) throw new Error('Админ-панель не подключена к базе данных');
  return supabase;
}

export async function loadAdminCatalog(client: RpcClient = configuredClient()) {
  const {data, error} = await client.rpc('admin_catalog_dashboard');
  if (error) throw new Error('Нет доступа к админ-панели');
  return data ?? [];
}

export async function saveAdminProduct(client: UpdateClient, productId: string, patch: AdminProductPatch): Promise<void>;
export async function saveAdminProduct(productId: string, patch: AdminProductPatch): Promise<void>;
export async function saveAdminProduct(
  clientOrId: UpdateClient | string,
  idOrPatch: string | AdminProductPatch,
  maybePatch?: AdminProductPatch,
) {
  const client = typeof clientOrId === 'string' ? configuredClient() : clientOrId;
  const productId = typeof clientOrId === 'string' ? clientOrId : idOrPatch as string;
  const patch = (typeof clientOrId === 'string' ? idOrPatch : maybePatch) as AdminProductPatch;
  const {error} = await client.from('products').update(patch).eq('id', productId);
  if (error) throw new Error('Не удалось сохранить аромат');
}

export async function loadAdminOrders(): Promise<AdminOrder[]> {
  const {data, error} = await configuredClient().from('orders')
    .select('id,public_code,status,items,created_at,completed_at')
    .order('created_at', {ascending: false});
  if (error) throw new Error('Не удалось загрузить заказы');
  return (data ?? []) as AdminOrder[];
}

export async function createAdminOrder(userEmail: string, itemName: string): Promise<string> {
  const {data, error} = await configuredClient().rpc('admin_create_order', {
    p_user_email: userEmail.trim(), p_item_name: itemName.trim(),
  });
  if (error) throw new Error('Покупатель не найден. Сначала ему нужно зарегистрироваться.');
  return data as string;
}

export async function setAdminOrderStatus(id: string, status: AdminOrder['status']) {
  const completedAt = status === 'completed' ? new Date().toISOString() : null;
  const {error} = await configuredClient().from('orders').update({status, completed_at: completedAt}).eq('id', id);
  if (error) throw new Error('Не удалось обновить заказ');
}

export async function loadAdminReviews(): Promise<AdminReview[]> {
  const {data, error} = await configuredClient().from('reviews')
    .select('id,rating,body,status,created_at')
    .order('created_at', {ascending: false});
  if (error) throw new Error('Не удалось загрузить отзывы');
  return (data ?? []) as AdminReview[];
}

export async function setAdminReviewStatus(id: string, status: AdminReview['status']) {
  const {error} = await configuredClient().from('reviews').update({status}).eq('id', id);
  if (error) throw new Error('Не удалось обновить отзыв');
}

export async function loadAdminImportReview(): Promise<AdminImportReviewRow[]> {
  const {data, error} = await configuredClient().rpc('admin_import_review');
  if (error) throw new Error('Не удалось загрузить строки на проверку');
  return (data ?? []) as AdminImportReviewRow[];
}
