import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveWorkoutMetrics } from '../src/scoring.js';

const routineExerciseNames = [
  'Marcha activa', 'Círculos de brazos', 'Movilidad de cadera', 'Saltos de tijera',
  'Flexiones', 'Sentadillas', 'Puente de glúteo', 'Plancha', 'Escaladores', 'Burpees',
  'Remo con mochila', 'Peso muerto con mochila', 'Remo con banda', 'Press con mancuernas',
  'Estiramiento general', 'Respiración controlada', 'Estiramiento de piernas',
];

test('every daily-routine exercise has a positive calorie estimate', () => {
  for (const name of routineExerciseNames) {
    const metrics = deriveWorkoutMetrics([{ name, sets: 1, reps: 1, durationMinutes: 10 }], 70);
    assert.ok(metrics.calories > 0, `${name} must have a MET value`);
  }
});
