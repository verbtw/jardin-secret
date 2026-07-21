export interface CatalogImportConfig {
  eparfumeEmail: string;
  eparfumePassword: string;
  databaseUrl: string;
}

type Environment = Partial<Record<'EPARFUME_EMAIL' | 'EPARFUME_PASSWORD' | 'SUPABASE_DB_URL', string>>;

export function readCatalogImportConfig(environment: Environment): CatalogImportConfig {
  const required = ['EPARFUME_EMAIL', 'EPARFUME_PASSWORD', 'SUPABASE_DB_URL'] as const;
  const missing = required.filter((name) => !environment[name]?.trim());
  if (missing.length) throw new Error(`Missing server configuration: ${missing.join(', ')}`);
  return {
    eparfumeEmail: environment.EPARFUME_EMAIL!.trim(),
    eparfumePassword: environment.EPARFUME_PASSWORD!,
    databaseUrl: environment.SUPABASE_DB_URL!.trim(),
  };
}

