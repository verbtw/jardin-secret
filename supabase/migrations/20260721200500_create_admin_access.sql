create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table private.admin_users enable row level security;
revoke all on private.admin_users from public, anon, authenticated;
grant all on private.admin_users to service_role;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_admin(); $$;

revoke all on function public.current_user_is_admin() from public, anon, authenticated;
grant execute on function public.current_user_is_admin() to authenticated;

create policy products_admin_read
on public.products for select
to authenticated
using ((select private.is_admin()));

create policy products_admin_update
on public.products for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

grant select (
  canonical_key, auto_price_rub, manual_price_rub, price_mode,
  price_status, price_updated_at, created_at, last_seen_at
) on public.products to authenticated;

grant update (
  brand, name, flanker, concentration, volume_ml, availability,
  description, fragrance_family, top_notes, heart_notes, base_notes,
  key_notes, key_accords, perfumers, launch_year, image_url,
  details_source_url, details_status, published, manual_price_rub,
  price_mode, price_status
) on public.products to authenticated;

create policy orders_admin_read
on public.orders for select
to authenticated
using ((select private.is_admin()));

create policy orders_admin_update
on public.orders for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy reviews_admin_read
on public.reviews for select
to authenticated
using ((select private.is_admin()));

create policy reviews_admin_update
on public.reviews for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

grant update (status, completed_at) on public.orders to authenticated;
grant update (status) on public.reviews to authenticated;

drop view public.public_catalog;
create view public.public_catalog
with (security_invoker = true)
as
select
  id, slug, brand, name, flanker, concentration, volume_ml,
  case
    when price_mode = 'manual' then manual_price_rub
    else auto_price_rub
  end as retail_price_rub,
  price_status, availability, description, fragrance_family,
  top_notes, heart_notes, base_notes, key_notes, key_accords,
  perfumers, launch_year, image_url, details_source_url,
  details_status, updated_at
from public.products
where published;

revoke all on public.public_catalog from public, anon, authenticated;
grant select on public.public_catalog to anon, authenticated;

create function public.admin_catalog_dashboard()
returns table (
  id uuid,
  slug text,
  brand text,
  name text,
  flanker text,
  concentration text,
  volume_ml numeric,
  availability text,
  published boolean,
  description text,
  fragrance_family text,
  top_notes text[],
  heart_notes text[],
  base_notes text[],
  image_url text,
  details_status text,
  auto_price_rub integer,
  manual_price_rub integer,
  price_mode text,
  price_status text,
  cost_rub integer,
  competitor_rub integer,
  calculated_profit_rub integer,
  pricing_rule text,
  pricing_flagged boolean,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
  select
    p.id, p.slug, p.brand, p.name, p.flanker, p.concentration,
    p.volume_ml, p.availability, p.published, p.description,
    p.fragrance_family, p.top_notes, p.heart_notes, p.base_notes,
    p.image_url, p.details_status, p.auto_price_rub, p.manual_price_rub,
    p.price_mode, p.price_status, supplier.cost_rub,
    decision.lowest_competitor_rub, decision.profit_rub,
    decision.rule, decision.flagged, p.updated_at
  from public.products p
  left join lateral (
    select min(so.cost_rub)::integer as cost_rub
    from private.supplier_offers so
    where so.product_id = p.id and so.in_stock and so.parse_status = 'matched'
  ) supplier on true
  left join lateral (
    select d.lowest_competitor_rub, d.profit_rub, d.rule, d.flagged
    from private.pricing_decisions d
    where d.product_id = p.id
    order by d.created_at desc
    limit 1
  ) decision on true
  order by p.updated_at desc;
end;
$$;

revoke all on function public.admin_catalog_dashboard() from public, anon, authenticated;
grant execute on function public.admin_catalog_dashboard() to authenticated;
