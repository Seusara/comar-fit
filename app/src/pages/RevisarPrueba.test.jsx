import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import RevisarPrueba from './RevisarPrueba';
import { useAuth } from '../contexts/AuthContext';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { useWorkouts } from '../hooks/useWorkouts';
import { deleteWorkout } from '../firebase/workouts';

vi.mock('../contexts/AuthContext');
vi.mock('../hooks/useActiveDuel');
vi.mock('../hooks/useWorkouts');
vi.mock('../firebase/workouts');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Wednesday, mid-week: without a frozen clock the `now - 1h`/`now - 2h`
// fixtures below fall into the *previous* duel week whenever the suite
// happens to run between Monday 00:00 and 02:00, which made the week-filter
// and sort tests flaky.
const NOW = new Date('2026-07-29T12:00:00');
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

function exercise(name, overrides = {}) {
  return { exerciseId: name, name, sets: 3, reps: 10, durationMinutes: 10, ...overrides };
}

function renderRevisarPrueba() {
  return render(
    <MemoryRouter>
      <RevisarPrueba />
    </MemoryRouter>
  );
}

describe('RevisarPrueba', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // `shouldAdvanceTime` keeps userEvent's internal delays working while the
    // wall clock stays pinned to NOW.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    useAuth.mockReturnValue({ currentUser: { uid: 'aaron' }, authLoading: false });
    useActiveDuel.mockReturnValue(DEFAULT_DUEL);
    useWorkouts.mockReturnValue({ workouts: [], loading: false, error: null });
    deleteWorkout.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a loading indicator while workouts are loading', () => {
    useWorkouts.mockReturnValue({ workouts: [], loading: true, error: null });
    renderRevisarPrueba();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an error message when the workouts listener errors', () => {
    useWorkouts.mockReturnValue({ workouts: [], loading: false, error: new Error('boom') });
    renderRevisarPrueba();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows a loading indicator while the duel is still resolving, even if workouts already loaded', () => {
    useActiveDuel.mockReturnValue({ duel: null, loading: true, error: null });
    renderRevisarPrueba();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText(/primer entrenamiento/i)).not.toBeInTheDocument();
  });

  it('shows an error message when the duel fails to load, even if workouts already loaded', () => {
    useActiveDuel.mockReturnValue({ duel: null, loading: false, error: new Error('boom') });
    renderRevisarPrueba();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('invites the user to register their first workout when history is empty', () => {
    renderRevisarPrueba();
    expect(screen.getByText(/primer entrenamiento/i)).toBeInTheDocument();
  });

  it('treats every saved workout as completed, including legacy status values', () => {
    const now = new Date();
    useWorkouts.mockReturnValue({
      workouts: [
        { workoutId: 'p1', performedAt: now, status: 'pending', exercises: [exercise('Flexiones')] },
        { workoutId: 's1', performedAt: now, status: 'scored', sessionScore: 55, exercises: [exercise('Sentadillas')] },
        { workoutId: 'e1', performedAt: now, status: 'error', exercises: [exercise('Burpees')] },
      ],
      loading: false,
      error: null,
    });

    renderRevisarPrueba();

    expect(screen.getAllByText(/entrenamiento completado/i)).toHaveLength(3);
    expect(screen.queryByText(/puntos|pts/i)).not.toBeInTheDocument();
  });

  it('sorts workouts in descending order by performed date', () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 60 * 60 * 1000);
    const later = new Date(now.getTime() - 5 * 60 * 1000);

    useWorkouts.mockReturnValue({
      workouts: [
        { workoutId: 'first', performedAt: earlier, status: 'pending', exercises: [exercise('Flexiones')] },
        { workoutId: 'second', performedAt: later, status: 'pending', exercises: [exercise('Sentadillas')] },
      ],
      loading: false,
      error: null,
    });

    renderRevisarPrueba();

    // Asserted over the rendered list items rather than raw text offsets: an
    // indexOf comparison passes vacuously when an item is missing entirely
    // (indexOf returns -1, which sorts first). Filtered to direct children so
    // WorkoutCard's own per-exercise <li>s don't join the comparison.
    const list = screen.getByRole('list', { name: /historial de entrenamientos/i });
    const items = within(list)
      .getAllByRole('listitem')
      .filter((item) => item.parentElement === list);
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Sentadillas');
    expect(items[1]).toHaveTextContent('Flexiones');
  });

  it('filters to "Esta semana" by default and shows all workouts under "Todas"', async () => {
    const user = userEvent.setup();
    const now = new Date();
    const withinWeek = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const threeWeeksAgo = new Date(now);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

    useWorkouts.mockReturnValue({
      workouts: [
        { workoutId: 'recent', performedAt: withinWeek, status: 'pending', exercises: [exercise('Flexiones')] },
        { workoutId: 'old', performedAt: threeWeeksAgo, status: 'pending', exercises: [exercise('Sentadillas')] },
      ],
      loading: false,
      error: null,
    });

    renderRevisarPrueba();

    expect(screen.getByText('Flexiones')).toBeInTheDocument();
    expect(screen.queryByText('Sentadillas')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^todas$/i }));

    expect(screen.getByText('Flexiones')).toBeInTheDocument();
    expect(screen.getByText('Sentadillas')).toBeInTheDocument();
  });

  it('passes workout.editableUntil through so WorkoutCard shows actions only within the window', () => {
    const now = new Date();
    const future = new Date(Date.now() + 5 * 60 * 1000);

    useWorkouts.mockReturnValue({
      workouts: [
        { workoutId: 'w1', performedAt: now, status: 'pending', editableUntil: future, exercises: [exercise('Flexiones')] },
      ],
      loading: false,
      error: null,
    });

    renderRevisarPrueba();

    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();
  });

  it('hides edit/delete once workout.editableUntil is in the past', () => {
    const now = new Date();
    const past = new Date(Date.now() - 5 * 60 * 1000);

    useWorkouts.mockReturnValue({
      workouts: [
        { workoutId: 'w1', performedAt: now, status: 'scored', sessionScore: 10, editableUntil: past, exercises: [exercise('Flexiones')] },
      ],
      loading: false,
      error: null,
    });

    renderRevisarPrueba();

    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
  });

  it('navigates to the edit route when Editar is clicked', async () => {
    const user = userEvent.setup();
    const now = new Date();
    const future = new Date(Date.now() + 5 * 60 * 1000);

    useWorkouts.mockReturnValue({
      workouts: [
        { workoutId: 'w1', performedAt: now, status: 'pending', editableUntil: future, exercises: [exercise('Flexiones')] },
      ],
      loading: false,
      error: null,
    });

    renderRevisarPrueba();
    await user.click(screen.getByRole('button', { name: /editar/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/workouts/w1/edit');
  });

  it('calls deleteWorkout only after the WorkoutCard delete confirmation step', async () => {
    const user = userEvent.setup();
    const now = new Date();
    const future = new Date(Date.now() + 5 * 60 * 1000);

    useWorkouts.mockReturnValue({
      workouts: [
        { workoutId: 'w1', performedAt: now, status: 'pending', editableUntil: future, exercises: [exercise('Flexiones')] },
      ],
      loading: false,
      error: null,
    });

    renderRevisarPrueba();

    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));
    expect(deleteWorkout).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(deleteWorkout).toHaveBeenCalledWith('duel-1', 'w1');
  });
});
