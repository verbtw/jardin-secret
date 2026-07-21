import {PostgresPricingRepository} from './postgres-pricing-repository.js';
import {runDailyPricing} from './run-pricing.js';

const databaseUrl = process.env.SUPABASE_DB_URL?.trim();
if (!databaseUrl) throw new Error('Missing server configuration: SUPABASE_DB_URL');

const repository = new PostgresPricingRepository(databaseUrl);

try {
  console.log(JSON.stringify(await runDailyPricing(repository)));
} finally {
  await repository.close();
}
