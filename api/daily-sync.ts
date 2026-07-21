/// <reference types="node" />
import {readCatalogImportConfig} from '../scripts/catalog/catalog-env.js';
import {EparfumeClient} from '../scripts/catalog/eparfume-client.js';
import {runCatalogImport} from '../scripts/catalog/import-catalog.js';
import {PostgresCatalogRepository} from '../scripts/catalog/postgres-catalog-repository.js';
import {PostgresPricingRepository} from '../scripts/pricing/postgres-pricing-repository.js';
import {runDailyPricing} from '../scripts/pricing/run-pricing.js';

export const config = {maxDuration: 300};

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  status(code: number): ResponseLike;
  json(body: unknown): void;
}

type SyncEnvironment = NodeJS.ProcessEnv & Partial<Record<
  'CRON_SECRET' | 'EPARFUME_EMAIL' | 'EPARFUME_PASSWORD' | 'SUPABASE_DB_URL',
  string
>>;
type RunSync = () => Promise<Record<string, unknown>>;

export async function runProductionDailySync(environment: SyncEnvironment = process.env) {
  const importConfig = readCatalogImportConfig(environment);
  const catalogRepository = new PostgresCatalogRepository(importConfig.databaseUrl);
  const pricingRepository = new PostgresPricingRepository(importConfig.databaseUrl);

  try {
    const catalog = await runCatalogImport({
      client: new EparfumeClient({
        email: importConfig.eparfumeEmail,
        password: importConfig.eparfumePassword,
      }),
      repo: catalogRepository,
    });
    const pricing = await runDailyPricing(pricingRepository);
    return {catalog, pricing};
  } finally {
    await Promise.allSettled([catalogRepository.close(), pricingRepository.close()]);
  }
}

export function createDailySyncHandler(
  runSync: RunSync = () => runProductionDailySync(),
  environment: Pick<SyncEnvironment, 'CRON_SECRET'> = process.env,
) {
  return async (request: RequestLike, response: ResponseLike) => {
    const secret = environment.CRON_SECRET;
    if (!secret || request.headers.authorization !== `Bearer ${secret}`) {
      response.status(401).json({ok: false, error: 'Unauthorized'});
      return;
    }

    try {
      const summary = await runSync();
      response.status(200).json({ok: true, ...summary});
    } catch {
      console.error('Daily catalog sync failed');
      response.status(500).json({ok: false, error: 'Daily sync failed'});
    }
  };
}

export default createDailySyncHandler();
