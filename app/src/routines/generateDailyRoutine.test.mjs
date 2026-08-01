import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDailyRoutine, routineProgressKey } from './generateDailyRoutine.js';

const strengthProfile = {
  experienceLevel: 'Intermediate', objective: 'Ganar fuerza',
  equipment: ['Mochila'], preferredWorkoutMinutes: 30,
};

const exerciseIds = (routine) => routine.phases.flatMap((phase) => phase.exercises.map((exercise) => exercise.id));

test('keeps the routine stable for the same user and day', () => {
  const input = { profile: strengthProfile, uid: 'aaron', dayKey: '2026-08-01' };
  assert.deepEqual(generateDailyRoutine(input), generateDailyRoutine(input));
});

test('uses the user and day when choosing the daily exercise order', () => {
  const base = exerciseIds(generateDailyRoutine({ profile: strengthProfile, uid: 'aaron', dayKey: '2026-08-01' }));
  const otherUser = exerciseIds(generateDailyRoutine({ profile: strengthProfile, uid: 'alexandra', dayKey: '2026-08-01' }));
  const otherDay = exerciseIds(generateDailyRoutine({ profile: strengthProfile, uid: 'aaron', dayKey: '2026-08-02' }));
  assert.notDeepEqual(otherUser, base);
  assert.notDeepEqual(otherDay, base);
});

test('includes all phases and never requires undeclared equipment', () => {
  const routine = generateDailyRoutine({ profile: strengthProfile, uid: 'aaron', dayKey: '2026-08-01' });
  assert.deepEqual(routine.phases.map((phase) => phase.id), ['warmup', 'main', 'recovery']);
  assert.ok(routine.phases.flatMap((phase) => phase.exercises).every((exercise) => (
    exercise.equipment === 'bodyweight' || strengthProfile.equipment.includes(exercise.equipment)
  )));
});

test('uses a safe bodyweight fallback for incomplete profiles', () => {
  const routine = generateDailyRoutine({ profile: {}, uid: 'new-user', dayKey: '2026-08-01' });
  assert.equal(routine.isFallback, true);
  assert.ok(routine.phases.flatMap((phase) => phase.exercises).every((exercise) => exercise.equipment === 'bodyweight'));
});

test('keeps estimated duration near the requested duration', () => {
  const routine = generateDailyRoutine({ profile: strengthProfile, uid: 'aaron', dayKey: '2026-08-01' });
  assert.ok(routine.durationMinutes >= 20);
  assert.ok(routine.durationMinutes <= 35);
});

test('scopes saved progress by user and day', () => {
  assert.equal(routineProgressKey('aaron', '2026-08-01'), 'comar-fit:routine-progress:aaron:2026-08-01');
});
