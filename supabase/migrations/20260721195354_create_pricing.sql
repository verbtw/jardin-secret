alter table public.products
  add column auto_price_rub integer check (auto_price_rub > 0),
  add column manual_price_rub integer check (manual_price_rub > 0),
  add column price_mode text not null default 'auto'
    check (price_mode in ('auto', 'manual')),
  add column price_status text not null default 'pending'
    check (price_status in ('pending', 'published', 'request', 'review')),
  add column price_updated_at timestamptz,
  add constraint products_manual_price_required
    check (price_mode <> 'manual' or manual_price_rub is not null);

create table private.competitor_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source text not null check (source in ('randewoo', 'goldapple')),
  source_product_name text not null,
  source_url text not null check (source_url ~ '^https://'),
  concentration text,
  volume_ml numeric(6,2) check (volume_ml > 0),
  price_rub integer not null check (price_rub > 0),
  price_kind text not null default 'public'
    check (price_kind in ('public', 'promo', 'member')),
  exact_match boolean not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (product_id, source, source_url, observed_at)
);

create table private.pricing_decisions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  import_run_id uuid references private.import_runs(id) on delete set null,
  cost_rub integer not null check (cost_rub > 0),
  lowest_competitor_rub integer check (lowest_competitor_rub > 0),
  calculated_price_rub integer check (calculated_price_rub > 0),
  profit_rub integer check (profit_rub >= 0),
  rule text not null
    check (rule in ('competitor_discount', 'default_margin', 'margin_below_floor')),
  inputs jsonb not null default '{}',
  flagged boolean not null default false,
  flag_reason text,
  created_at timestamptz not null default now()
);

create index competitor_offers_product_observed_idx
  on private.competitor_offers (product_id, observed_at desc);
create index competitor_offers_exact_price_idx
  on private.competitor_offers (product_id, price_rub)
  where exact_match;
create index pricing_decisions_product_created_idx
  on private.pricing_decisions (product_id, created_at desc);
create index pricing_decisions_flagged_idx
  on private.pricing_decisions (created_at desc)
  where flagged;

alter table private.competitor_offers enable row level security;
alter table private.pricing_decisions enable row level security;

revoke all on private.competitor_offers from public, anon, authenticated;
revoke all on private.pricing_decisions from public, anon, authenticated;
grant all on private.competitor_offers to service_role;
grant all on private.pricing_decisions to service_role;
