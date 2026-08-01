import test from 'node:test';
import assert from 'node:assert/strict';
import { canUpdatePhysicalProfile, nextPhysicalProfileUpdateAt } from './profilePolicy.js';

test('allows a physical update when no prior physical update exists', () => {
  assert.equal(canUpdatePhysicalProfile({}, new Date('2026-07-31T12:00:00Z')), true);
});

test('blocks a physical update before 30 full days have elapsed', () => {
  const profile = { physicalProfileUpdatedAt: new Date('2026-07-10T12:00:00Z') };
  assert.equal(canUpdatePhysicalProfile(profile, new Date('2026-08-08T12:00:00Z')), false);
});

test('allows a physical update at the exact 30-day boundary', () => {
  const profile = {
    physicalProfileUpdatedAt: { toDate: () => new Date('2026-07-10T12:00:00Z') },
  };
  assert.equal(canUpdatePhysicalProfile(profile, new Date('2026-08-09T12:00:00Z')), true);
  assert.equal(nextPhysicalProfileUpdateAt(profile).toISOString(), '2026-08-09T12:00:00.000Z');
});
