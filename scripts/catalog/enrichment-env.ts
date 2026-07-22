interface EnrichmentEnvironment {
  SUPABASE_DB_URL?: string;
  FRAGELLA_API_KEY?: string;
  ENRICHMENT_BATCH_SIZE?: string;
  ENRICHMENT_IMAGE_BASE_URL?: string;
}

function required(value: string | undefined, name: string) {
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

export function readEnrichmentEnv(env: EnrichmentEnvironment) {
  const batchSize = env.ENRICHMENT_BATCH_SIZE === undefined ? 30_000 : Number(env.ENRICHMENT_BATCH_SIZE);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 30_000) {
    throw new Error('ENRICHMENT_BATCH_SIZE must be an integer between 1 and 30000');
  }
  return {
    databaseUrl: required(env.SUPABASE_DB_URL, 'SUPABASE_DB_URL'),
    apiKey: env.FRAGELLA_API_KEY?.trim() || null,
    batchSize,
    imageBaseUrl: env.ENRICHMENT_IMAGE_BASE_URL?.trim()
      || 'https://jardin-secret-phi.vercel.app/api/perfume-image',
  };
}
