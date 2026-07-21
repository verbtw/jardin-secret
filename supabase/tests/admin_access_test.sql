begin;
select plan(17);

select has_table('private', 'admin_users', 'admin allowlist exists');
select has_function('private', 'is_admin', array[]::text[], 'private admin predicate exists');
select has_function('public', 'admin_catalog_dashboard', array[]::text[], 'admin dashboard RPC exists');
select has_function('public', 'current_user_is_admin', array[]::text[], 'admin access RPC exists');
select has_function('public', 'admin_import_review', array[]::text[], 'import review RPC exists');
select has_function('public', 'admin_create_order', array['text', 'text'], 'admin order RPC exists');
select policies_are('public', 'products', array['products_admin_read', 'products_admin_update', 'products_public_read']);
select policies_are('public', 'orders', array['orders_admin_read', 'orders_admin_update', 'orders_insert_pending_own', 'orders_select_own']);
select policies_are('public', 'reviews', array['reviews_admin_read', 'reviews_admin_update', 'reviews_insert_after_completed_order', 'reviews_select_own', 'reviews_select_published']);
select table_privs_are('private', 'admin_users', 'anon', array[]::text[], 'anon cannot read admins');
select table_privs_are('private', 'admin_users', 'authenticated', array[]::text[], 'users cannot read admins');
select function_privs_are('private', 'is_admin', array[]::text[], 'anon', array[]::text[], 'anon cannot call admin predicate');
select function_privs_are('public', 'admin_catalog_dashboard', array[]::text[], 'anon', array[]::text[], 'anon cannot call admin dashboard');
select function_privs_are('public', 'admin_catalog_dashboard', array[]::text[], 'authenticated', array['EXECUTE'], 'signed-in users can call guarded RPC');
select function_privs_are('public', 'current_user_is_admin', array[]::text[], 'anon', array[]::text[], 'anon cannot inspect admin access');
select function_privs_are('public', 'admin_import_review', array[]::text[], 'anon', array[]::text[], 'anon cannot inspect supplier review rows');
select function_privs_are('public', 'admin_create_order', array['text', 'text'], 'anon', array[]::text[], 'anon cannot create orders');

select * from finish();
rollback;
