create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique,
  slug text not null unique,
  brand text not null check (char_length(btrim(brand)) > 0),
  name text not null check (char_length(btrim(name)) > 0),
  flanker text,
  concentration text,
  volume_ml numeric(6,2) not null check (volume_ml > 0),
  retail_price_rub integer check (retail_price_rub > 0),
  availability text not null default 'review'
    check (availability in ('in_stock', 'out_of_stock', 'review')),
  description text not null default '',
  fragrance_family text,
  top_notes text[] not null default '{}',
  heart_notes text[] not null default '{}',
  base_notes text[] not null default '{}',
  key_notes text[] not null default '{}',
  key_accords text[] not null default '{}',
  perfumers text[] not null default '{}',
  launch_year smallint check (launch_year between 1700 and 2200),
  image_url text,
  details_source_url text,
  details_status text not null default 'missing'
    check (details_status in ('missing', 'partial', 'verified', 'review')),
  published boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.import_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  exchange_rate numeric(10,4),
  supplier_count integer not null default 0 check (supplier_count >= 0),
  source_row_count integer not null default 0 check (source_row_count >= 0),
  matched_count integer not null default 0 check (matched_count >= 0),
  review_count integer not null default 0 check (review_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table private.supplier_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  import_run_id uuid not null references private.import_runs(id) on delete cascade,
  supplier_code text not null,
  source_row text not null,
  source_price_usd numeric(12,2) not null check (source_price_usd >= 0),
  cost_rub integer not null check (cost_rub >= 0),
  parse_status text not null check (parse_status in ('matched', 'review', 'rejected')),
  parse_reason text,
  in_stock boolean not null default true,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_code, source_row)
);

create table private.product_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source_type text not null
    check (source_type in ('official_brand', 'official_distributor', 'major_catalog', 'image_fallback')),
  source_url text not null check (source_url ~ '^https://'),
  fields text[] not null default '{}',
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  observed_at timestamptz not null default now(),
  unique (product_id, source_url)
);

create index products_public_brand_name_idx
  on public.products (brand, name) where published;
create index products_public_available_idx
  on public.products (availability, updated_at desc) where published;
create index supplier_offers_product_cost_idx
  on private.supplier_offers (product_id, cost_rub) where in_stock and parse_status = 'matched';
create index supplier_offers_import_run_idx
  on private.supplier_offers (import_run_id);
create index product_sources_product_idx
  on private.product_sources (product_id, confidence desc);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create trigger supplier_offers_set_updated_at
before update on private.supplier_offers
for each row execute function private.set_updated_at();

alter table public.products enable row level security;
alter table private.import_runs enable row level security;
alter table private.supplier_offers enable row level security;
alter table private.product_sources enable row level security;

revoke all on public.products from anon, authenticated;
revoke all on private.import_runs from anon, authenticated;
revoke all on private.supplier_offers from anon, authenticated;
revoke all on private.product_sources from anon, authenticated;

create policy products_public_read
on public.products for select
to anon, authenticated
using (published);

grant select (
  id, slug, brand, name, flanker, concentration, volume_ml,
  retail_price_rub, availability, description, fragrance_family,
  top_notes, heart_notes, base_notes, key_notes, key_accords,
  perfumers, launch_year, image_url, details_source_url,
  details_status, published, updated_at
) on public.products to anon, authenticated;

create view public.public_catalog
with (security_invoker = true)
as
select
  id, slug, brand, name, flanker, concentration, volume_ml,
  retail_price_rub, availability, description, fragrance_family,
  top_notes, heart_notes, base_notes, key_notes, key_accords,
  perfumers, launch_year, image_url, details_source_url,
  details_status, updated_at
from public.products
where published;

revoke all on public.public_catalog from public, anon, authenticated;
grant select on public.public_catalog to anon, authenticated;

grant usage on schema private to service_role;
grant all on public.products to service_role;
grant all on private.import_runs to service_role;
grant all on private.supplier_offers to service_role;
grant all on private.product_sources to service_role;

revoke all on function private.set_updated_at() from public, anon, authenticated;
