begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select has_table('private', 'competitor_offers', 'competitor observations stay private');
select has_table('private', 'pricing_decisions', 'pricing decisions stay private');
select has_column('public', 'products', 'auto_price_rub', 'products store the latest automatic price');
select has_column('public', 'products', 'manual_price_rub', 'products can store a manager override');
select has_column('public', 'products', 'price_mode', 'products record automatic or manual mode');
select is(
  (select count(*)::integer from information_schema.role_table_grants where table_schema = 'private' and table_name in ('competitor_offers', 'pricing_decisions') and grantee in ('anon', 'authenticated')),
  0,
  'public roles have no competitor or pricing grants'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.competitor_offers'::regclass),
  'competitor offers use RLS defense in depth'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.pricing_decisions'::regclass),
  'pricing decisions use RLS defense in depth'
);

select * from finish();
rollback;
