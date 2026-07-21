do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'catalog_sync') then
    create role catalog_sync
      nologin
      nosuperuser
      nocreatedb
      nocreaterole
      noinherit
      noreplication
      nobypassrls;
  end if;
end
$$;

grant connect on database postgres to catalog_sync;
grant usage on schema public, private to catalog_sync;

grant select, insert, update on public.products to catalog_sync;
grant select, insert, update on private.import_runs to catalog_sync;
grant select, insert, update on private.supplier_offers to catalog_sync;
grant select, insert, update on private.competitor_offers to catalog_sync;
grant select, insert on private.pricing_decisions to catalog_sync;

create policy products_catalog_sync_all
on public.products for all
to catalog_sync
using (true)
with check (true);

create policy import_runs_catalog_sync_all
on private.import_runs for all
to catalog_sync
using (true)
with check (true);

create policy supplier_offers_catalog_sync_all
on private.supplier_offers for all
to catalog_sync
using (true)
with check (true);

create policy competitor_offers_catalog_sync_all
on private.competitor_offers for all
to catalog_sync
using (true)
with check (true);

create policy pricing_decisions_catalog_sync_all
on private.pricing_decisions for all
to catalog_sync
using (true)
with check (true);
