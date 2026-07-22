import {readEnrichmentEnv} from './enrichment-env.js';
import {FragellaClient} from './fragella-client.js';
import {PostgresEnrichmentRepository} from './postgres-enrichment-repository.js';
import {runProductEnrichment} from './run-enrichment.js';

const config = readEnrichmentEnv(process.env);
const repo = new PostgresEnrichmentRepository(config.databaseUrl);

try {
  const summary = await runProductEnrichment({
    repo,
    provider: new FragellaClient(config.apiKey),
    limit: config.batchSize,
  });
  console.log(JSON.stringify(summary));
} finally {
  await repo.close();
}
