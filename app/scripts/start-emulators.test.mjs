import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEmulatorArgs } from './start-emulators.mjs';

test('starts all required emulators and exports data on first run', () => {
  assert.deepEqual(buildEmulatorArgs(false), [
    'emulators:start',
    '--only',
    'auth,firestore,functions',
    '--export-on-exit=.firebase-data',
  ]);
});

test('imports the prior export on later runs', () => {
  assert.deepEqual(buildEmulatorArgs(true), [
    'emulators:start',
    '--only',
    'auth,firestore,functions',
    '--export-on-exit=.firebase-data',
    '--import=.firebase-data',
  ]);
});
