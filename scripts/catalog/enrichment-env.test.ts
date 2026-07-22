import {expect, it} from 'vitest';
import {readEnrichmentEnv} from './enrichment-env.js';

it('reads server-only enrichment configuration', () => {
  expect(readEnrichmentEnv({
    SUPABASE_DB_URL: 'postgres://catalog',
    FRAGELLA_API_KEY: 'secret-key',
    ENRICHMENT_BATCH_SIZE: '50',
  })).toEqual({
    databaseUrl: 'postgres://catalog', apiKey: 'secret-key', batchSize: 50,
    imageBaseUrl: 'https://jardin-secret-phi.vercel.app/api/perfume-image',
  });
});

it('defaults to the free-plan-safe batch size', () => {
  expect(readEnrichmentEnv({SUPABASE_DB_URL: 'postgres://catalog'})).toMatchObject({
    apiKey: null,
    batchSize: 30_000,
    imageBaseUrl: 'https://jardin-secret-phi.vercel.app/api/perfume-image',
  });
});

it('rejects missing secrets and invalid limits', () => {
  expect(() => readEnrichmentEnv({})).toThrow('SUPABASE_DB_URL');
  expect(() => readEnrichmentEnv({SUPABASE_DB_URL: 'db', FRAGELLA_API_KEY: 'key', ENRICHMENT_BATCH_SIZE: '0'})).toThrow('ENRICHMENT_BATCH_SIZE');
});
