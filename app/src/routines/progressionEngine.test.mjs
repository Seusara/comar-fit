import test from 'node:test';
import assert from 'node:assert/strict';
import { computeProgressionAdjustments, INCREASE_MULTIPLIER, DECREASE_MULTIPLIER } from './progressionEngine.js';

const NOW = new Date('2026-08-01T12:00:00Z');

function workout({ performedAt, exercises }) {
  return { performedAt, exercises };
}

test('suggests an increase when 70%+ of an exercise ratings are easy', () => {
  const workouts = [
    workout({ performedAt: '2026-07-30T10:00:00Z', exercises: [{ name: 'Flexiones', difficulty_feedback: 'easy' }] }),
    workout({ performedAt: '2026-07-29T10:00:00Z', exercises: [{ name: 'Flexiones', difficulty_feedback: 'easy' }] }),
    workout({ performedAt: '2026-07-28T10:00:00Z', exercises: [{ name: 'Flexiones', difficulty_feedback: 'easy' }] }),
    workout({ performedAt: '2026-07-27T10:00:00Z', exercises: [{ name: 'Flexiones', difficulty_feedback: 'moderate' }] }),
  ];
  const adjustments = computeProgressionAdjustments(workouts, { now: NOW });
  assert.equal(adjustments.Flexiones.multiplier, INCREASE_MULTIPLIER);
  assert.equal(adjustments.Flexiones.reason, 'easy');
});

test('suggests a decrease when 50%+ of an exercise ratings are hard', () => {
  const workouts = [
    workout({ performedAt: '2026-07-30T10:00:00Z', exercises: [{ name: 'Burpees', difficulty_feedback: 'hard' }] }),
    workout({ performedAt: '2026-07-29T10:00:00Z', exercises: [{ name: 'Burpees', difficulty_feedback: 'hard' }] }),
  ];
  const adjustments = computeProgressionAdjustments(workouts, { now: NOW });
  assert.equal(adjustments.Burpees.multiplier, DECREASE_MULTIPLIER);
  assert.equal(adjustments.Burpees.reason, 'hard');
});

test('maintains when feedback is mixed without a clear majority', () => {
  const workouts = [
    workout({ performedAt: '2026-07-30T10:00:00Z', exercises: [{ name: 'Sentadillas', difficulty_feedback: 'easy' }] }),
    workout({ performedAt: '2026-07-29T10:00:00Z', exercises: [{ name: 'Sentadillas', difficulty_feedback: 'moderate' }] }),
    workout({ performedAt: '2026-07-28T10:00:00Z', exercises: [{ name: 'Sentadillas', difficulty_feedback: 'hard' }] }),
  ];
  const adjustments = computeProgressionAdjustments(workouts, { now: NOW });
  assert.equal(adjustments.Sentadillas.multiplier, 1);
  assert.equal(adjustments.Sentadillas.reason, 'maintain');
});

test('ignores exercises with fewer than the minimum sample count', () => {
  const workouts = [
    workout({ performedAt: '2026-07-30T10:00:00Z', exercises: [{ name: 'Plancha', difficulty_feedback: 'easy' }] }),
  ];
  const adjustments = computeProgressionAdjustments(workouts, { now: NOW });
  assert.equal(adjustments.Plancha, undefined);
});

test('ignores workouts outside the trailing window', () => {
  const workouts = [
    workout({ performedAt: '2026-07-01T10:00:00Z', exercises: [{ name: 'Flexiones', difficulty_feedback: 'easy' }] }),
    workout({ performedAt: '2026-06-30T10:00:00Z', exercises: [{ name: 'Flexiones', difficulty_feedback: 'easy' }] }),
  ];
  const adjustments = computeProgressionAdjustments(workouts, { now: NOW, windowDays: 7 });
  assert.equal(adjustments.Flexiones, undefined);
});

test('ignores exercises with no difficulty_feedback and malformed workouts', () => {
  const workouts = [
    workout({ performedAt: '2026-07-30T10:00:00Z', exercises: [{ name: 'Flexiones' }] }),
    null,
    { performedAt: '2026-07-30T10:00:00Z', exercises: null },
  ];
  const adjustments = computeProgressionAdjustments(workouts, { now: NOW });
  assert.deepEqual(adjustments, {});
});
