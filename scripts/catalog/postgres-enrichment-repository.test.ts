import {expect, it, vi} from 'vitest';
import type {Sql} from 'postgres';
import {PostgresEnrichmentRepository} from './postgres-enrichment-repository.js';

function fakeSql() {
  const queries: string[] = [];
  const tag = vi.fn((strings: TemplateStringsArray) => {
    const query = strings.join('?');
    queries.push(query);
    if (query.includes('select distinct on')) return Promise.resolve([
      {brand: 'Tom Ford', name: 'Oud Wood', concentration: 'EDP'},
    ]);
    if (query.includes('returning id::text')) return Promise.resolve([{id: 'one'}, {id: 'two'}]);
    return Promise.resolve([]);
  }) as unknown as Sql;
  (tag as unknown as {begin: (callback: (sql: Sql) => Promise<unknown>) => Promise<unknown>}).begin = (callback) => callback(tag);
  (tag as unknown as {end: () => Promise<void>}).end = vi.fn().mockResolvedValue(undefined);
  return {tag, queries};
}

it('lists one missing profile regardless of its volumes', async () => {
  const {tag, queries} = fakeSql();
  const repo = new PostgresEnrichmentRepository('', tag);
  await expect(repo.listMissingProfiles(20)).resolves.toEqual([
    {brand: 'Tom Ford', name: 'Oud Wood', concentration: 'EDP'},
  ]);
  expect(queries[0]).toContain('select distinct on');
  expect(queries[0]).toContain("details_status in ('missing', 'partial')");
});

it('updates every non-verified variant and records its source', async () => {
  const {tag, queries} = fakeSql();
  const repo = new PostgresEnrichmentRepository('', tag);
  const count = await repo.saveVerifiedProfile(
    {brand: 'Tom Ford', name: 'Oud Wood', concentration: 'EDP'},
    {
      description: 'Описание', fragranceFamily: 'Древесные', topNotes: ['Бергамот'],
      heartNotes: ['Уд'], baseNotes: ['Амбра'], keyNotes: [], perfumers: [], launchYear: 2007,
      imageUrl: 'https://cdn.example/oud.jpg', sourceUrl: 'https://catalog.example/oud',
      sourceType: 'major_catalog',
    },
  );
  expect(count).toBe(2);
  expect(queries.some((query) => query.includes("details_status = 'verified'"))).toBe(true);
  expect(queries.filter((query) => query.includes('insert into private.product_sources'))).toHaveLength(2);
});
