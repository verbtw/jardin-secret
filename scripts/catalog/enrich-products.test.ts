import {describe, expect, it} from 'vitest';
import {
  choosePreferredDetails,
  validateDetails,
  type FragranceDetails,
} from './enrich-products.js';

const completeDetails: FragranceDetails = {
  description: 'Древесный аромат с прохладным цитрусовым вступлением, мягким сердцем и стойкой тёплой базой.',
  fragranceFamily: 'Древесные',
  topNotes: ['Бергамот'],
  heartNotes: ['Кедр'],
  baseNotes: ['Амбра'],
  keyNotes: [],
  perfumers: [],
  launchYear: null,
  imageUrl: 'https://brand.example/images/fragrance.jpg',
  sourceUrl: 'https://brand.example/fragrance',
  sourceType: 'official_brand',
};

describe('validateDetails', () => {
  it('accepts a complete sourced fragrance profile', () => {
    expect(validateDetails(completeDetails)).toEqual({valid: true});
  });

  const incompleteCases: Array<[FragranceDetails, string]> = [
    [{...completeDetails, description: ''}, 'missing_description'],
    [{...completeDetails, fragranceFamily: ''}, 'missing_family'],
    [{...completeDetails, topNotes: [], heartNotes: [], baseNotes: [], keyNotes: []}, 'missing_notes'],
    [{...completeDetails, imageUrl: ''}, 'missing_image'],
    [{...completeDetails, imageUrl: 'http://brand.example/image.jpg'}, 'invalid_image'],
    [{...completeDetails, sourceUrl: 'https://t.me/jardinnsecret/100'}, 'invalid_source'],
  ];

  it.each(incompleteCases)('rejects incomplete details with %s', (details, reason) => {
    expect(validateDetails(details)).toEqual({valid: false, reason});
  });

  it('allows confirmed key notes when a full pyramid is unavailable', () => {
    expect(validateDetails({
      ...completeDetails,
      topNotes: [],
      heartNotes: [],
      baseNotes: [],
      keyNotes: ['Уд', 'Сандал'],
    })).toEqual({valid: true});
  });

  it('does not verify placeholder-level images or token descriptions', () => {
    expect(validateDetails({...completeDetails, sourceType: 'image_fallback'})).toEqual({valid: false, reason: 'invalid_source'});
    expect(validateDetails({...completeDetails, description: 'Короткое описание'})).toEqual({valid: false, reason: 'missing_description'});
  });
});

describe('choosePreferredDetails', () => {
  it('prefers an official brand source over a catalog source', () => {
    const catalog = {...completeDetails, sourceType: 'major_catalog' as const, sourceUrl: 'https://catalog.example/item'};
    expect(choosePreferredDetails([catalog, completeDetails])).toBe(completeDetails);
  });

  it('ignores invalid candidates', () => {
    const invalid = {...completeDetails, imageUrl: ''};
    expect(choosePreferredDetails([invalid, completeDetails])).toBe(completeDetails);
  });
});
