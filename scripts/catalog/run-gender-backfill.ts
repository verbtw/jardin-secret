import {readEnrichmentEnv} from './enrichment-env.js';
import {runGenderBackfill} from './gender-backfill.js';
import {OpenPerfumeDatasetProvider} from './open-perfume-dataset.js';
import {PostgresEnrichmentRepository} from './postgres-enrichment-repository.js';

const config = readEnrichmentEnv(process.env);
const repo = new PostgresEnrichmentRepository(config.databaseUrl);

try {
  const summary = await runGenderBackfill({
    repo,
    provider: new OpenPerfumeDatasetProvider({imageBaseUrl: config.imageBaseUrl, archiveEntries: new Map()}),
    limit: config.batchSize,
  });
  console.log(JSON.stringify(summary));
} finally {
  await repo.close();
}
