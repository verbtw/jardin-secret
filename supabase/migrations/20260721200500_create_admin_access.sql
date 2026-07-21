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

create function public.admin_import_review()
returns table (
  id uuid,
  supplier_code text,
  source_row text,
  cost_rub integer,
  parse_reason text,
  observed_at timestamptz
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
  select o.id, o.supplier_code, o.source_row, o.cost_rub, o.parse_reason, o.observed_at
  from private.supplier_offers o
  where o.parse_status = 'review'
  order by o.observed_at desc
  limit 1000;
end;
$$;

revoke all on function public.admin_import_review() from public, anon, authenticated;
grant execute on function public.admin_import_review() to authenticated;

create function public.admin_create_order(p_user_email text, p_item_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  generated_code text;
begin
  if not private.is_admin() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  select id into target_user_id from auth.users where lower(email) = lower(btrim(p_user_email));
  if target_user_id is null then
    raise exception 'customer_not_found' using errcode = 'P0002';
  end if;
  generated_code := 'JS-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.orders (user_id, public_code, status, items)
  values (
    target_user_id,
    generated_code,
    'pending',
    jsonb_build_array(jsonb_build_object(
      'productId', '', 'name', btrim(p_item_name), 'quantity', 1, 'priceRub', 0
    ))
  );
  return generated_code;
end;
$$;

revoke all on function public.admin_create_order(text, text) from public, anon, authenticated;
grant execute on function public.admin_create_order(text, text) to authenticated;
