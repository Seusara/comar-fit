import { describe, it, expect } from 'vitest';
import {
  summarizeFeedback,
  suggestAdjustment,
  applyDelta,
  generateDaySuggestions,
  generateWeekSuggestions,
  DIFFICULTY,
} from '../src/progressionEngine.js';

// ---------------------------------------------------------------------------
// summarizeFeedback
// ---------------------------------------------------------------------------
describe('summarizeFeedback', () => {
  it('returns zero rates for empty input', () => {
    expect(summarizeFeedback([])).toEqual({ easyRate: 0, hardRate: 0, total: 0 });
    expect(summarizeFeedback(null)).toEqual({ easyRate: 0, hardRate: 0, total: 0 });
  });

  it('computes 100% easy', () => {
    const feedback = [
      { exerciseId: 'pushups', difficulty: DIFFICULTY.EASY },
      { exerciseId: 'pushups', difficulty: DIFFICULTY.EASY },
    ];
    expect(summarizeFeedback(feedback)).toEqual({ easyRate: 1, hardRate: 0, total: 2 });
  });

  it('computes mixed rates', () => {
    const feedback = [
      { exerciseId: 'squats', difficulty: DIFFICULTY.EASY },
      { exerciseId: 'squats', difficulty: DIFFICULTY.HARD },
      { exerciseId: 'squats', difficulty: DIFFICULTY.HARD },
      { exerciseId: 'squats', difficulty: DIFFICULTY.MODERATE },
    ];
    const { easyRate, hardRate, total } = summarizeFeedback(feedback);
    expect(total).toBe(4);
    expect(easyRate).toBeCloseTo(0.25);
    expect(hardRate).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// suggestAdjustment
// ---------------------------------------------------------------------------
describe('suggestAdjustment', () => {
  it('returns maintain when there are no data', () => {
    const result = suggestAdjustment({ easyRate: 0, hardRate: 0, total: 0 }, { sets: 3, reps: 10 });
    expect(result.action).toBe('maintain');
    expect(result.delta).toBe(0);
  });

  it('suggests increase when > 70% easy (reps exercise)', () => {
    const result = suggestAdjustment({ easyRate: 0.8, hardRate: 0, total: 5 }, { sets: 3, reps: 10 });
    expect(result.action).toBe('increase');
    expect(result.delta).toBeGreaterThan(0);
    expect(result.reason).toMatch(/fáciles/);
  });

  it('suggests a larger increase when reps >= 15', () => {
    const result = suggestAdjustment({ easyRate: 0.8, hardRate: 0, total: 5 }, { sets: 3, reps: 15 });
    expect(result.action).toBe('increase');
    expect(result.delta).toBe(5);
  });

  it('suggests reduce when > 50% hard', () => {
    const result = suggestAdjustment({ easyRate: 0, hardRate: 0.6, total: 5 }, { sets: 3, reps: 10 });
    expect(result.action).toBe('reduce');
    expect(result.delta).toBeLessThan(0);
    expect(result.reason).toMatch(/difíciles/);
  });

  it('maintains when easyRate <= 70% and hardRate <= 50%', () => {
    const result = suggestAdjustment({ easyRate: 0.5, hardRate: 0.3, total: 10 }, { sets: 3, reps: 12 });
    expect(result.action).toBe('maintain');
  });

  it('falls back to adding a set when there are no reps', () => {
    const result = suggestAdjustment({ easyRate: 0.8, hardRate: 0, total: 5 }, { sets: 3, durationSeconds: 30 });
    expect(result.action).toBe('increase');
    expect(result.delta).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// applyDelta
// ---------------------------------------------------------------------------
describe('applyDelta', () => {
  it('returns unchanged dosage for maintain', () => {
    const dosage = { sets: 3, reps: 10 };
    expect(applyDelta(dosage, { action: 'maintain', delta: 0 })).toEqual(dosage);
  });

  it('increases reps', () => {
    const result = applyDelta({ sets: 3, reps: 10 }, { action: 'increase', delta: 2 });
    expect(result.reps).toBe(12);
  });

  it('reduces reps but never below 1', () => {
    const result = applyDelta({ sets: 3, reps: 1 }, { action: 'reduce', delta: -2 });
    expect(result.reps).toBe(1);
  });

  it('increases sets when there are no reps', () => {
    const result = applyDelta({ sets: 2 }, { action: 'increase', delta: 1 });
    expect(result.sets).toBe(3);
  });

  it('adjusts durationSeconds when no reps but durationSeconds present', () => {
    const result = applyDelta({ sets: 3, durationSeconds: 30 }, { action: 'increase', delta: 1 });
    expect(result.durationSeconds).toBeGreaterThan(30);
  });
});

// ---------------------------------------------------------------------------
// generateDaySuggestions
// ---------------------------------------------------------------------------
describe('generateDaySuggestions', () => {
  const dayPlan = {
    type: 'workout',
    focus: 'chest_triceps',
    exercises: [
      { id: 'pushups', name: 'Flexiones', sets: 3, reps: 10 },
      { id: 'dips', name: 'Fondos', sets: 3, reps: 8 },
    ],
  };

  it('returns one suggestion per exercise', () => {
    const suggestions = generateDaySuggestions(dayPlan, []);
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].exerciseId).toBe('pushups');
    expect(suggestions[1].exerciseId).toBe('dips');
  });

  it('all maintain when no feedback', () => {
    const suggestions = generateDaySuggestions(dayPlan, []);
    expect(suggestions.every((s) => s.action === 'maintain')).toBe(true);
  });

  it('increases pushups when all feedback is easy', () => {
    const feedback = [
      { exerciseId: 'pushups', difficulty: DIFFICULTY.EASY },
      { exerciseId: 'pushups', difficulty: DIFFICULTY.EASY },
      { exerciseId: 'pushups', difficulty: DIFFICULTY.EASY },
    ];
    const suggestions = generateDaySuggestions(dayPlan, feedback);
    const pushupSuggestion = suggestions.find((s) => s.exerciseId === 'pushups');
    expect(pushupSuggestion.action).toBe('increase');
    expect(pushupSuggestion.proposed.reps).toBeGreaterThan(10);
  });

  it('reduces dips when mostly hard', () => {
    const feedback = [
      { exerciseId: 'dips', difficulty: DIFFICULTY.HARD },
      { exerciseId: 'dips', difficulty: DIFFICULTY.HARD },
      { exerciseId: 'dips', difficulty: DIFFICULTY.EASY },
    ];
    const suggestions = generateDaySuggestions(dayPlan, feedback);
    const dipSuggestion = suggestions.find((s) => s.exerciseId === 'dips');
    expect(dipSuggestion.action).toBe('reduce');
    expect(dipSuggestion.proposed.reps).toBeLessThan(8);
  });

  it('returns empty array for a non-workout day', () => {
    expect(generateDaySuggestions({ type: 'rest' }, [])).toHaveLength(0);
    expect(generateDaySuggestions(null, [])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateWeekSuggestions
// ---------------------------------------------------------------------------
describe('generateWeekSuggestions', () => {
  const weekPlan = {
    days: {
      1: { type: 'workout', exercises: [{ id: 'pushups', sets: 3, reps: 10 }] },
      2: { type: 'run', target: { distanceMeters: 3000 } },
      3: { type: 'rest' },
      4: { type: 'workout', exercises: [{ id: 'squats', sets: 4, reps: 12 }] },
      5: { type: 'rest' },
      6: { type: 'rest' },
      7: { type: 'rest' },
    },
  };

  it('only includes workout days in the result', () => {
    const result = generateWeekSuggestions(weekPlan, []);
    expect([...result.keys()]).toEqual(['1', '4']);
  });

  it('produces correct suggestions for each workout day', () => {
    const feedback = [
      { exerciseId: 'pushups', difficulty: DIFFICULTY.EASY, dayNumber: 1 },
      { exerciseId: 'pushups', difficulty: DIFFICULTY.EASY, dayNumber: 1 },
      { exerciseId: 'pushups', difficulty: DIFFICULTY.EASY, dayNumber: 1 },
      { exerciseId: 'squats', difficulty: DIFFICULTY.HARD, dayNumber: 4 },
      { exerciseId: 'squats', difficulty: DIFFICULTY.HARD, dayNumber: 4 },
    ];
    const result = generateWeekSuggestions(weekPlan, feedback);

    const day1 = result.get('1');
    expect(day1[0].action).toBe('increase');

    const day4 = result.get('4');
    expect(day4[0].action).toBe('reduce');
  });

  it('handles empty or null plan gracefully', () => {
    expect(generateWeekSuggestions(null, [])).toBeInstanceOf(Map);
    expect(generateWeekSuggestions({}, [])).toBeInstanceOf(Map);
  });
});
