import {expect, it} from 'vitest';
import {readEnrichmentEnv} from './enrichment-env.js';

it('reads server-only enrichment configuration', () => {
  expect(readEnrichmentEnv({
    SUPABASE_DB_URL: 'postgres://catalog',
    FRAGELLA_API_KEY: 'secret-key',
    ENRICHMENT_BATCH_SIZE: '50',
  })).toEqual({databaseUrl: 'postgres://catalog', apiKey: 'secret-key', batchSize: 50});
});

it('defaults to the free-plan-safe batch size', () => {
  expect(readEnrichmentEnv({SUPABASE_DB_URL: 'postgres://catalog', FRAGELLA_API_KEY: 'key'}).batchSize).toBe(20);
});

it('rejects missing secrets and invalid limits', () => {
  expect(() => readEnrichmentEnv({FRAGELLA_API_KEY: 'key'})).toThrow('SUPABASE_DB_URL');
  expect(() => readEnrichmentEnv({SUPABASE_DB_URL: 'db', FRAGELLA_API_KEY: 'key', ENRICHMENT_BATCH_SIZE: '0'})).toThrow('ENRICHMENT_BATCH_SIZE');
});
