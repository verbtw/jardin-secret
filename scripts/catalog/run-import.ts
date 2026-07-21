import { readCatalogImportConfig } from './catalog-env';
import { EparfumeClient } from './eparfume-client';
import { runCatalogImport } from './import-catalog';
import { PostgresCatalogRepository } from './postgres-catalog-repository';

const config = readCatalogImportConfig(process.env);
const repository = new PostgresCatalogRepository(config.databaseUrl);

try {
  const summary = await runCatalogImport({
    client: new EparfumeClient({email: config.eparfumeEmail, password: config.eparfumePassword}),
    repo: repository,
  });
  console.log(JSON.stringify(summary));
} finally {
  await repository.close();
}

