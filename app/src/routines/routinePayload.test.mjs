import test from 'node:test';
import assert from 'node:assert/strict';
import { routineExercisesFromLocationState } from './routinePayload.js';

test('converts a valid daily routine payload to editor exercises', () => {
  const result = routineExercisesFromLocationState({
    source: 'daily-routine',
    exercises: [{ name: 'Flexiones', sets: 3, reps: 10, duration: 5 }],
  });
  assert.deepEqual(result, [{
    exerciseId: 'Flexiones', name: 'Flexiones', sets: 3, reps: 10, durationMinutes: 5,
  }]);
});

test('rejects payloads from unknown sources', () => {
  assert.equal(routineExercisesFromLocationState({ source: 'other', exercises: [] }), null);
});

test('rejects empty or malformed exercise collections', () => {
  assert.equal(routineExercisesFromLocationState({ source: 'daily-routine', exercises: [] }), null);
  assert.equal(routineExercisesFromLocationState({
    source: 'daily-routine', exercises: [{ name: '', sets: 0, reps: -1, duration: 0 }],
  }), null);
});

test('rejects values outside the workout editor limits', () => {
  assert.equal(routineExercisesFromLocationState({
    source: 'daily-routine', exercises: [{ name: 'Flexiones', sets: 21, reps: 10, duration: 5 }],
  }), null);
});

test('rejects unknown and oversized exercise names', () => {
  assert.equal(routineExercisesFromLocationState({
    source: 'daily-routine', exercises: [{ name: 'Ejercicio inventado', sets: 1, reps: 1, duration: 1 }],
  }), null);
  assert.equal(routineExercisesFromLocationState({
    source: 'daily-routine', exercises: [{ name: 'x'.repeat(81), sets: 1, reps: 1, duration: 1 }],
  }), null);
});
