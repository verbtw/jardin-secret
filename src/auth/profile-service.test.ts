import { expect, it } from 'vitest';
import { profileFromRow, profileToRow } from './profile-service';

it('maps database fields to checkout-compatible fields', () => {
  const row = { id: 'u1', full_name: 'Алина', phone: '+79990000000', city: 'Казань', address: 'ул. Баумана, 1', updated_at: '2026-01-01' };
  const profile = { id: 'u1', name: 'Алина', phone: '+79990000000', city: 'Казань', address: 'ул. Баумана, 1' };
  expect(profileFromRow(row)).toEqual(profile);
  expect(profileToRow(profile)).toMatchObject({ id: 'u1', full_name: 'Алина', phone: '+79990000000' });
});
