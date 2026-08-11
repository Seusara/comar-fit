import { describe, expect, it, vi } from 'vitest';

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: vi.fn(() => ({ name: 'db' })) }));
vi.mock('firebase-functions/v2/firestore', () => ({
  onDocumentWritten: vi.fn((path, handler) => ({ path, handler })),
}));
vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: vi.fn((options, handler) => ({ options, handler })),
}));
vi.mock('../src/sendWorkoutReminders.js', () => ({ sendWorkoutReminders: vi.fn() }));
vi.mock('../src/recalculateDuelWeek.js', () => ({ recalculateDuelWeek: vi.fn() }));

describe('Functions entrypoint', () => {
  it('exports calculateScore for every workout write', async () => {
    const { calculateScore } = await import('../index.js');

    expect(calculateScore.path).toBe('duels/{duelId}/workouts/{workoutId}');
    expect(calculateScore.handler).toEqual(expect.any(Function));
  });

  it('exports the scheduled workout reminder', async () => {
    const { workoutReminders } = await import('../index.js');
    expect(workoutReminders.options.schedule).toBe('every 5 minutes');
    expect(workoutReminders.handler).toEqual(expect.any(Function));
  });
});
