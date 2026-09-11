import { describe, it, expect, vi, beforeEach } from 'vitest';

// firebase-admin is not available in the Vite/jsdom test environment.
// Mock it before importing the module under test.
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => '__SERVER_TIMESTAMP__' },
}));
vi.mock('luxon', async (importOriginal) => {
  const actual = await importOriginal();
  return actual;
});

import { generateProgressionSuggestions } from '../src/generateProgressionSuggestions.js';

// ---------------------------------------------------------------------------
// Minimal Firestore stub
// ---------------------------------------------------------------------------
function makeDoc(id, data) {
  return { id, exists: true, data: () => data };
}

function makeCollection(docs) {
  return {
    where: () => makeCollection(docs),
    get: vi.fn().mockResolvedValue({ docs }),
  };
}

function makeDbStub({ duels = [], progressDocs = [], planData = null } = {}) {
  const setMock = vi.fn().mockResolvedValue(undefined);

  const docMocks = {};

  const db = {
    collection: vi.fn((path) => {
      if (path === 'duels') return makeCollection(duels);
      if (path.includes('workoutProgress')) return makeCollection(progressDocs);
      return makeCollection([]);
    }),
    doc: vi.fn((path) => {
      if (!docMocks[path]) {
        docMocks[path] = {
          get: vi.fn().mockResolvedValue({
            exists: planData !== null,
            data: () => planData,
          }),
          set: setMock,
        };
      }
      return docMocks[path];
    }),
    _setMock: setMock,
  };

  return db;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
// Sunday 23:45 MX — we pass an explicit weekId string to the function
// to avoid depending on luxon inside the test itself.
const WEEK_ID = '2026-W32';

const ACTIVE_DUEL = makeDoc('duel-1', {
  userA_uid: 'aaron',
  userB_uid: 'alexandra',
  status: 'active',
});

const WORKOUT_PLAN = {
  days: {
    1: { type: 'workout', focus: 'chest_triceps', exercises: [{ id: 'pushups', sets: 3, reps: 10 }] },
    2: { type: 'rest' },
    3: { type: 'workout', focus: 'legs', exercises: [{ id: 'squats', sets: 4, reps: 12 }] },
    4: { type: 'rest' },
    5: { type: 'run', target: {} },
    6: { type: 'rest' },
    7: { type: 'rest' },
  },
};

const EASY_FEEDBACK_DOCS = [
  makeDoc('prog-1', {
    userId: 'aaron',
    weekId: '2026-W32',
    dayNumber: 1,
    exercises: [
      { id: 'pushups', difficulty: 'easy', completed: true },
      { id: 'pushups', difficulty: 'easy', completed: true },
      { id: 'pushups', difficulty: 'easy', completed: true },
    ],
  }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('generateProgressionSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes a pending suggestion doc when plan and feedback exist', async () => {
    const db = makeDbStub({ duels: [ACTIVE_DUEL], progressDocs: EASY_FEEDBACK_DOCS, planData: WORKOUT_PLAN });

    const processed = await generateProgressionSuggestions({ db, weekId: WEEK_ID, serverTimestamp: () => "__TS__" });

    expect(processed).toBeGreaterThan(0);
    expect(db._setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'aaron',
        weekId: WEEK_ID,
        status: 'pending',
        days: expect.objectContaining({ '1': expect.any(Array) }),
      }),
      { merge: true },
    );
  });

  it('skips a user who has no plan this week', async () => {
    const db = makeDbStub({ duels: [ACTIVE_DUEL], progressDocs: [], planData: null });

    const processed = await generateProgressionSuggestions({ db, weekId: WEEK_ID, serverTimestamp: () => "__TS__" });

    expect(processed).toBe(0);
    expect(db._setMock).not.toHaveBeenCalled();
  });

  it('skips a plan with only rest/run days (no workout days)', async () => {
    const restPlan = {
      days: {
        1: { type: 'rest' },
        2: { type: 'rest' },
        3: { type: 'run', target: {} },
        4: { type: 'rest' },
        5: { type: 'rest' },
        6: { type: 'rest' },
        7: { type: 'rest' },
      },
    };
    const db = makeDbStub({ duels: [ACTIVE_DUEL], progressDocs: [], planData: restPlan });

    const processed = await generateProgressionSuggestions({ db, weekId: WEEK_ID, serverTimestamp: () => "__TS__" });

    expect(processed).toBe(0);
    expect(db._setMock).not.toHaveBeenCalled();
  });

  it('handles no active duels gracefully', async () => {
    const db = makeDbStub({ duels: [] });

    const processed = await generateProgressionSuggestions({ db, weekId: WEEK_ID, serverTimestamp: () => "__TS__" });

    expect(processed).toBe(0);
  });

  it('continues processing other participants when one throws', async () => {
    const db = makeDbStub({ duels: [ACTIVE_DUEL], progressDocs: [], planData: WORKOUT_PLAN });

    // Make fetchPlan throw only for 'aaron', succeed for 'alexandra'
    let callCount = 0;
    db.doc.mockImplementation((path) => {
      callCount += 1;
      if (path.includes('aaron') && callCount <= 1) {
        return { get: vi.fn().mockRejectedValue(new Error('network')), set: vi.fn() };
      }
      return {
        get: vi.fn().mockResolvedValue({ exists: true, data: () => WORKOUT_PLAN }),
        set: db._setMock,
      };
    });

    // Should not throw, just log and continue
    await expect(generateProgressionSuggestions({ db, weekId: WEEK_ID, serverTimestamp: () => "__TS__" })).resolves.toBeDefined();
  });

  it('uses merge:true so re-running the same week is idempotent', async () => {
    const db = makeDbStub({ duels: [ACTIVE_DUEL], progressDocs: EASY_FEEDBACK_DOCS, planData: WORKOUT_PLAN });

    await generateProgressionSuggestions({ db, weekId: WEEK_ID, serverTimestamp: () => "__TS__" });
    await generateProgressionSuggestions({ db, weekId: WEEK_ID, serverTimestamp: () => "__TS__" });

    // Every call to set uses merge:true
    for (const call of db._setMock.mock.calls) {
      expect(call[1]).toEqual({ merge: true });
    }
  });
});
