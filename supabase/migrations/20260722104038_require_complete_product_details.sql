alter table public.products
  add constraint products_published_details_complete
  check (
    not published or (
      details_status = 'verified'
      and char_length(btrim(description)) > 0
      and coalesce(char_length(btrim(fragrance_family)), 0) > 0
      and cardinality(top_notes || heart_notes || base_notes || key_notes) > 0
      and coalesce(image_url ~ '^https://', false)
      and coalesce(details_source_url ~ '^https://', false)
    )
  );

grant select, insert, update on private.product_sources to catalog_sync;

create policy product_sources_catalog_sync_all
on private.product_sources for all
to catalog_sync
using (true)
with check (true);

drop function public.admin_catalog_dashboard();

create function public.admin_catalog_dashboard()
returns table (
  id uuid, slug text, brand text, name text, flanker text, concentration text,
  volume_ml numeric, availability text, published boolean, description text,
  fragrance_family text, top_notes text[], heart_notes text[], base_notes text[],
  key_notes text[], key_accords text[], perfumers text[], launch_year smallint,
  image_url text, details_source_url text, details_status text,
  auto_price_rub integer, manual_price_rub integer, price_mode text, price_status text,
  cost_rub integer, competitor_rub integer, calculated_profit_rub integer,
  pricing_rule text, pricing_flagged boolean, updated_at timestamptz
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
    p.key_notes, p.key_accords, p.perfumers, p.launch_year,
    p.image_url, p.details_source_url, p.details_status,
    p.auto_price_rub, p.manual_price_rub, p.price_mode, p.price_status,
    supplier.cost_rub, decision.lowest_competitor_rub, decision.profit_rub,
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
