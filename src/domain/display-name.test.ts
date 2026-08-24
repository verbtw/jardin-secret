import {expect, it} from 'vitest';
import {formatDisplayName} from './display-name';

it('turns supplier uppercase fragrance names into readable title case', () => {
  expect(formatDisplayName('GUIDANCE')).toBe('Guidance');
  expect(formatDisplayName('BLACK LACQUER')).toBe('Black Lacquer');
  expect(formatDisplayName('EAU D’OMBRE LEATHER')).toBe('Eau D’Ombre Leather');
});

it('keeps roman-numeral fragrance names intact', () => {
  expect(formatDisplayName('XXI ART DECO AMBERWOOD')).toBe('XXI Art Deco Amberwood');
});
