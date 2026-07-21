import { describe, expect, it } from 'vitest';
import { parseSourceRow } from './parse-source-row';

describe('parseSourceRow', () => {
  it('parses a full-size EDP fragrance variant', () => {
    expect(parseSourceRow('Tom Ford Oud Wood edp 50ml')).toEqual({
      kind: 'fragrance',
      sourceRow: 'Tom Ford Oud Wood edp 50ml',
      brand: 'Tom Ford',
      name: 'Oud Wood',
      flanker: null,
      concentration: 'EDP',
      volumeMl: 50,
    });
  });

  it('understands Russian concentration and decimal volume', () => {
    expect(parseSourceRow('Kilian Angels Share парфюмерная вода 7,5 мл')).toMatchObject({
      kind: 'fragrance',
      brand: 'Kilian',
      name: 'Angels Share',
      concentration: 'EDP',
      volumeMl: 7.5,
    });
  });

  it.each([
    'Dr. Vranjes диффузор 250ml',
    'Tom Ford Oud Wood гель для душа 250 мл',
    'Byredo Bibliotheque свеча 240 г',
  ])('rejects non-perfume goods: %s', (sourceRow) => {
    expect(parseSourceRow(sourceRow)).toMatchObject({kind: 'rejected', reason: 'non_fragrance'});
  });

  it.each([
    ['Kilian Angels Share tester edp 50ml', 'tester'],
    ['Tom Ford Oud Wood набор edp 50ml + 10ml', 'set'],
    ['Tom Ford Oud Wood пробник edp 2ml', 'sample'],
    ['Tom Ford Oud Wood refill edp 100ml', 'refill'],
  ] as const)('sends unsupported packaging to review: %s', (sourceRow, reason) => {
    expect(parseSourceRow(sourceRow)).toMatchObject({kind: 'review', reason});
  });

  it('reviews perfume rows without a volume', () => {
    expect(parseSourceRow('Tom Ford Oud Wood eau de parfum')).toMatchObject({kind: 'review', reason: 'missing_volume'});
  });

  it('reviews rows without an explicit concentration', () => {
    expect(parseSourceRow('Tom Ford Oud Wood 50ml')).toMatchObject({kind: 'review', reason: 'missing_concentration'});
  });

  it('reviews rows whose brand cannot be identified safely', () => {
    expect(parseSourceRow('Unknown House Velvet Night edp 50ml')).toMatchObject({kind: 'review', reason: 'unknown_brand'});
  });
});
