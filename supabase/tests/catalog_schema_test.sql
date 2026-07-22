begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_table('public', 'products', 'public products table exists');
select has_view('public', 'public_catalog', 'restricted public catalog view exists');
select has_table('private', 'supplier_offers', 'supplier offers stay private');
select has_table('private', 'import_runs', 'import runs stay private');
select has_table('private', 'product_sources', 'enrichment sources stay private');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.products'::regclass),
  'RLS is enabled on public products'
);
select ok(
  exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'products_public_read'),
  'published-products policy exists'
);
select is(
  (select count(*)::integer from information_schema.role_table_grants where table_schema = 'private' and table_name = 'supplier_offers' and grantee in ('anon', 'authenticated')),
  0,
  'public roles have no supplier offer grants'
);
select ok(has_table_privilege('anon', 'public.public_catalog', 'select'), 'anon can read the catalog view');
select ok(has_table_privilege('authenticated', 'public.public_catalog', 'select'), 'authenticated users can read the catalog view');
select ok(not has_table_privilege('anon', 'public.products', 'insert'), 'anon cannot insert products');
select ok(not has_table_privilege('authenticated', 'public.products', 'update'), 'customers cannot update products');
select has_check('public', 'products', 'products_published_details_complete', 'published products require complete verified details');

select * from finish();
rollback;
