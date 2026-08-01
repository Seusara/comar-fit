import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import Dashboard from './Dashboard';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { useWorkouts } from '../hooks/useWorkouts';
import { useDuelScore } from '../hooks/useDuelScore';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../hooks/useActiveDuel');
vi.mock('../hooks/useWorkouts');
vi.mock('../hooks/useDuelScore');
vi.mock('../contexts/AuthContext');

// Wednesday of the duel week, so "Día X de 7" and the countdown are
// deterministic regardless of when the suite actually runs.
const NOW = new Date('2026-07-29T12:00:00Z');
const WEEK_START = new Date('2026-07-27T00:00:00.000Z'); // Monday, UTC
const WEEK_END = new Date('2026-08-02T23:59:59.999Z'); // Sunday, UTC

const DEFAULT_DUEL = {
  duel: {
    duelId: 'duel-1',
    userA_uid: 'aaron',
    userB_uid: 'alexandra',
    weekStartDate: WEEK_START,
    weekEndDate: WEEK_END,
  },
  loading: false,
  error: null,
};

// Mirrors the design spec's `duels/{duelId}/weeks/{weekId}` document: every
// per-participant map is keyed by uid, never by userA/userB.
const DEFAULT_SCORE = {
  weekData: {
    scores: {
      aaron: { score: 36, minuteScore: 50, exerciseScore: 12.5, repScore: 22.5, calorieScore: 60 },
      alexandra: { score: 50, minuteScore: 60, exerciseScore: 25, repScore: 40, calorieScore: 75 },
    },
    streaks: { aaron: 7, alexandra: 8 },
    lastWorkoutDay: { aaron: '2026-07-29', alexandra: '2026-07-29' },
    recentActivity: [],
    updatedAt: NOW.toISOString(),
  },
  loading: false,
  error: null,
};
const DEFAULT_WORKOUTS = {
  workouts: [
    { workoutId: 'w1', exercises: [{ name: 'Flexiones', sets: 3, reps: 15 }], totalMinutes: 30, date: '2026-07-29' },
  ],
  loading: false,
  error: null,
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    useActiveDuel.mockReturnValue(DEFAULT_DUEL);
    useDuelScore.mockReturnValue(DEFAULT_SCORE);
    useWorkouts.mockReturnValue(DEFAULT_WORKOUTS);
    useAuth.mockReturnValue({ currentUser: { uid: 'aaron' }, authLoading: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a loading indicator while any hook is still loading', () => {
    useActiveDuel.mockReturnValue({ duel: null, loading: true, error: null });

    renderDashboard();

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows an error message when a hook reports an error', () => {
    useDuelScore.mockReturnValue({ weekData: null, loading: false, error: new Error('boom') });

    renderDashboard();

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows an empty-activity message when there are no workouts', () => {
    useWorkouts.mockReturnValue({ workouts: [], loading: false, error: null });

    renderDashboard();

    expect(screen.getByText(/aún no hay actividad/i)).toBeInTheDocument();
  });

  it('renders both participants scores via distinct progress rings', () => {
    renderDashboard();

    const rings = screen.getAllByRole('progressbar');
    expect(rings).toHaveLength(2);
    expect(rings[0]).toHaveAttribute('aria-valuenow', '36');
    expect(rings[1]).toHaveAttribute('aria-valuenow', '50');
    expect(rings[0].getAttribute('aria-label')).not.toBe(rings[1].getAttribute('aria-label'));
  });

  it('renders both participants streaks', () => {
    renderDashboard();

    expect(screen.getByText(/7 días/)).toBeInTheDocument();
    expect(screen.getByText(/8 días/)).toBeInTheDocument();
  });

  it('renders zeros when the week aggregate has no entry for a participant yet', () => {
    useDuelScore.mockReturnValue({
      weekData: { scores: {}, streaks: {}, lastWorkoutDay: {}, recentActivity: [], updatedAt: NOW.toISOString() },
      loading: false,
      error: null,
    });

    renderDashboard();

    const rings = screen.getAllByRole('progressbar');
    expect(rings[0]).toHaveAttribute('aria-valuenow', '0');
    expect(rings[1]).toHaveAttribute('aria-valuenow', '0');
  });

  it('does not crash when a hook returns no keys at all (defensive defaults)', () => {
    useWorkouts.mockReturnValue({});
    useDuelScore.mockReturnValue({});

    renderDashboard();

    expect(screen.getByText(/aún no hay actividad/i)).toBeInTheDocument();
  });

  it('renders recent activity from useWorkouts', () => {
    renderDashboard();

    expect(screen.getByText(/flexiones/i)).toBeInTheDocument();
    expect(screen.getByText('2026-07-29')).toBeInTheDocument();
  });

  it('renders the activity date from a Firestore-style performedAt Timestamp', () => {
    useWorkouts.mockReturnValue({
      workouts: [
        {
          workoutId: 'w1',
          exercises: [{ name: 'Flexiones', sets: 3, reps: 15 }],
          totalMinutes: 30,
          performedAt: { toDate: () => new Date('2026-07-29T18:00:00Z') },
        },
      ],
      loading: false,
      error: null,
    });

    renderDashboard();

    expect(screen.getByText('2026-07-29')).toBeInTheDocument();
  });

  it('derives "Día X de 7" from the duel week boundaries, not the local day-of-week', () => {
    renderDashboard();

    // 2026-07-29T12:00Z is ~2.5 days into a week starting 2026-07-27T00:00Z.
    expect(screen.getByRole('heading', { name: /día 3 de 7/i })).toBeInTheDocument();
  });

  it('never renders a raw Firebase uid as a participant name', () => {
    const realUid = 'Xk9dpq2flmY7t3RbN0aZcQwEuI1s';
    useActiveDuel.mockReturnValue({
      duel: { ...DEFAULT_DUEL.duel, userA_uid: realUid, userB_uid: 'q7ZzP2LwUvB8hT4nMe0KcXdJfR3g' },
      loading: false,
      error: null,
    });

    const { container } = renderDashboard();

    expect(container.textContent).not.toContain(realUid);
    expect(screen.getByText(/jugador 1/i)).toBeInTheDocument();
    expect(screen.getByText(/jugador 2/i)).toBeInTheDocument();
  });

  it('renders the public profile names returned with the active duel', () => {
    useActiveDuel.mockReturnValue({
      duel: {
        ...DEFAULT_DUEL.duel,
        userA_uid: 'Xk9dpq2flmY7t3RbN0aZcQwEuI1s',
        userB_uid: 'q7ZzP2LwUvB8hT4nMe0KcXdJfR3g',
        participantNames: {
          Xk9dpq2flmY7t3RbN0aZcQwEuI1s: 'Aarón',
          q7ZzP2LwUvB8hT4nMe0KcXdJfR3g: 'Alexandra',
        },
      },
      loading: false,
      error: null,
    });

    renderDashboard();

    expect(screen.getByText('Aarón')).toBeInTheDocument();
    expect(screen.getByText('Alexandra')).toBeInTheDocument();
  });

  it('renders the Subir entrenamiento CTA', () => {
    renderDashboard();

    expect(screen.getByRole('button', { name: /subir entrenamiento/i })).toBeInTheDocument();
  });
});
