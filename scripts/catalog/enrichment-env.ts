interface EnrichmentEnvironment {
  SUPABASE_DB_URL?: string;
  FRAGELLA_API_KEY?: string;
  ENRICHMENT_BATCH_SIZE?: string;
}

function required(value: string | undefined, name: string) {
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

export function readEnrichmentEnv(env: EnrichmentEnvironment) {
  const batchSize = env.ENRICHMENT_BATCH_SIZE === undefined ? 20 : Number(env.ENRICHMENT_BATCH_SIZE);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error('ENRICHMENT_BATCH_SIZE must be an integer between 1 and 500');
  }
  return {
    databaseUrl: required(env.SUPABASE_DB_URL, 'SUPABASE_DB_URL'),
    apiKey: required(env.FRAGELLA_API_KEY, 'FRAGELLA_API_KEY'),
    batchSize,
  };
}
