import {describe, expect, it} from 'vitest';
import {normalizeProductGender} from './gender.js';

describe('normalizeProductGender', () => {
  it.each([
    ['Female', 'women'], ['Woman', 'women'], ['Male', 'men'], ['Man', 'men'],
    ['Unisex', 'unisex'], ['для женщин', 'women'], ['мужской', 'men'], ['', 'unknown'],
    ['United States of America', 'unknown'],
  ])('maps %s to %s', (input, expected) => {
    expect(normalizeProductGender(input)).toBe(expected);
  });
});
