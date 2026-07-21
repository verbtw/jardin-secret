import { expect, it } from 'vitest';
import { readCatalogImportConfig } from './catalog-env';

it('reads server-only catalog import configuration', () => {
  expect(readCatalogImportConfig({
    EPARFUME_EMAIL: 'supplier@example.test',
    EPARFUME_PASSWORD: 'supplier-password',
    SUPABASE_DB_URL: 'postgresql://postgres:password@db.example.test:5432/postgres',
  })).toEqual({
    eparfumeEmail: 'supplier@example.test',
    eparfumePassword: 'supplier-password',
    databaseUrl: 'postgresql://postgres:password@db.example.test:5432/postgres',
  });
});

it('fails without naming or leaking the missing secret value', () => {
  expect(() => readCatalogImportConfig({EPARFUME_EMAIL: 'supplier@example.test'})).toThrow('Missing server configuration: EPARFUME_PASSWORD, SUPABASE_DB_URL');
});
