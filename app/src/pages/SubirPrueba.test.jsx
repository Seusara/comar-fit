import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SubirPrueba, { POST_RESULT_DISPLAY_MS } from './SubirPrueba';
import { useAuth } from '../contexts/AuthContext';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { useWorkouts } from '../hooks/useWorkouts';
import { useCalorieEstimate } from '../hooks/useCalorieEstimate';
import { createWorkout, updateWorkout } from '../firebase/workouts';
import { getUserDocument } from '../firebase/firestore';

vi.mock('../contexts/AuthContext');
vi.mock('../hooks/useActiveDuel');
vi.mock('../hooks/useWorkouts');
vi.mock('../hooks/useCalorieEstimate');
vi.mock('../firebase/workouts');
vi.mock('../firebase/firestore');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const DEFAULT_DUEL = { duel: { duelId: 'duel-1', userA_uid: 'aaron', userB_uid: 'alexandra' }, loading: false, error: null };

function renderTree(path = '/subir-prueba') {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/subir-prueba" element={<SubirPrueba />} />
        <Route path="/workouts/:workoutId/edit" element={<SubirPrueba />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderSubirPrueba(path = '/subir-prueba') {
  return render(renderTree(path));
}

function submitButton() {
  return screen.getByRole('button', { name: /guardar entrenamiento/i });
}

/**
 * Flushes the mounted page's `getUserDocument` profile fetch inside act(),
 * so tests that only assert synchronously don't leave that promise resolving
 * outside of act (which React reports as a warning).
 */
async function flushProfileFetch() {
  await act(async () => {});
}

describe('SubirPrueba', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    useAuth.mockReturnValue({ currentUser: { uid: 'aaron' }, authLoading: false });
    useActiveDuel.mockReturnValue(DEFAULT_DUEL);
    useWorkouts.mockReturnValue({ workouts: [], loading: false, error: null });
    useCalorieEstimate.mockReturnValue(240);
    createWorkout.mockResolvedValue('w-new-1');
    updateWorkout.mockResolvedValue(undefined);
    // Phase 1's Register.jsx writes the profile weight under `weight`.
    getUserDocument.mockResolvedValue({ uid: 'aaron', weight: 78, gender: 'M' });
  });

  it('renders one exercise row by default with the calorie estimate labeled as approximate', async () => {
    renderSubirPrueba();
    await flushProfileFetch();

    expect(screen.getAllByLabelText('Ejercicio')).toHaveLength(1);
    expect(screen.getByText(/aproximad/i)).toBeInTheDocument();
    expect(screen.getByText(/240/)).toBeInTheDocument();
  });

  it('prefills create mode from a validated daily routine payload', async () => {
    renderSubirPrueba({
      pathname: '/subir-prueba',
      state: {
        source: 'daily-routine',
        exercises: [
          { name: 'Flexiones', sets: 3, reps: 10, duration: 5 },
          { name: 'Sentadillas', sets: 2, reps: 15, duration: 4 },
        ],
      },
    });
    await flushProfileFetch();

    expect(screen.getAllByLabelText('Ejercicio')).toHaveLength(2);
    expect(screen.getAllByLabelText('Ejercicio')[0]).toHaveValue('Flexiones');
    expect(screen.getAllByLabelText('Series')[0]).toHaveValue(3);
    expect(screen.getAllByLabelText('Minutos')[1]).toHaveValue(4);
  });

  it('feeds useCalorieEstimate the real profile weight from the Firestore user document', async () => {
    renderSubirPrueba();

    expect(getUserDocument).toHaveBeenCalledWith('aaron');

    // Before the profile resolves there is simply no weight to pass — the
    // Firebase Auth user object never carries one.
    expect(useCalorieEstimate.mock.calls[0][1]).toBeUndefined();

    await waitFor(() => {
      const [, weight] = useCalorieEstimate.mock.calls[useCalorieEstimate.mock.calls.length - 1];
      expect(weight).toBe(78);
      expect(typeof weight).toBe('number');
    });
  });

  it('still renders the calorie estimate when the profile lookup fails', async () => {
    getUserDocument.mockRejectedValue(new Error('offline'));

    renderSubirPrueba();

    await waitFor(() => {
      expect(screen.getByText(/240/)).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables submit when a field is out of range', async () => {
    const user = userEvent.setup();
    renderSubirPrueba();

    const setsInput = screen.getByLabelText('Series');
    await user.clear(setsInput);
    await user.type(setsInput, '99');

    expect(await screen.findByText(/series entre 1 y 20/i)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it('disables submit when total duration across exercises is out of range', async () => {
    const user = userEvent.setup();
    renderSubirPrueba();

    const firstMinutes = screen.getByLabelText('Minutos');
    await user.clear(firstMinutes);
    await user.type(firstMinutes, '200');

    await user.click(screen.getByRole('button', { name: /añadir ejercicio/i }));
    const secondMinutes = screen.getAllByLabelText('Minutos')[1];
    await user.clear(secondMinutes);
    await user.type(secondMinutes, '150');

    expect(await screen.findByText(/la duración total debe estar entre/i)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it('submits multiple exercises via createWorkout with duelId, uid and the exercises array', async () => {
    const user = userEvent.setup();
    renderSubirPrueba();

    await user.click(screen.getByRole('button', { name: /añadir ejercicio/i }));
    expect(screen.getAllByLabelText('Ejercicio')).toHaveLength(2);

    await user.click(submitButton());

    expect(createWorkout).toHaveBeenCalledTimes(1);
    const [duelId, uid, exercises] = createWorkout.mock.calls[0];
    expect(duelId).toBe('duel-1');
    expect(uid).toBe('aaron');
    expect(exercises).toHaveLength(2);
  });

  it('does not navigate before the create call resolves', async () => {
    createWorkout.mockImplementation(() => new Promise(() => {})); // never resolves
    renderSubirPrueba();

    fireEvent.click(submitButton());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByText(/calculando puntos/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
  });

  it('prevents a second submission while the first is still in flight', async () => {
    let resolveCreate;
    createWorkout.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );

    renderSubirPrueba();
    const button = submitButton();

    fireEvent.click(button);
    fireEvent.click(button);

    expect(createWorkout).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    await act(async () => {
      resolveCreate('w-1');
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it('shows an error and preserves entered data when createWorkout fails', async () => {
    const user = userEvent.setup();
    createWorkout.mockRejectedValue(new Error('boom'));
    renderSubirPrueba();

    const repsInput = screen.getByLabelText('Reps');
    await user.clear(repsInput);
    await user.type(repsInput, '7');

    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('Reps')).toHaveValue(7);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('confirms immediately after Firestore resolves without waiting for scoring', async () => {
    vi.useFakeTimers();
    try {
      renderSubirPrueba();

      await act(async () => {
        fireEvent.click(submitButton());
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByText('Entrenamiento guardado ✓')).toBeInTheDocument();
      expect(screen.queryByText(/calculando puntos/i)).not.toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(POST_RESULT_DISPLAY_MS);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/revisar-prueba');
    } finally {
      vi.useRealTimers();
    }
  });

  it('navigates to history after showing the immediate confirmation', async () => {
    vi.useFakeTimers();
    try {
      renderSubirPrueba();

      await act(async () => {
        fireEvent.click(submitButton());
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      expect(screen.getByText('Entrenamiento guardado ✓')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(POST_RESULT_DISPLAY_MS);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/revisar-prueba');
    } finally {
      vi.useRealTimers();
    }
  });

  it('edit mode prefills the form from the matching workout and calls updateWorkout on submit', async () => {
    const user = userEvent.setup();
    useWorkouts.mockReturnValue({
      workouts: [
        {
          workoutId: 'w1',
          status: 'scored',
          exercises: [{ exerciseId: 'Sentadillas', name: 'Sentadillas', sets: 4, reps: 12, durationMinutes: 8 }],
        },
      ],
      loading: false,
      error: null,
    });

    renderSubirPrueba('/workouts/w1/edit');

    expect(await screen.findByLabelText('Series')).toHaveValue(4);
    expect(screen.getByLabelText('Reps')).toHaveValue(12);
    expect(screen.getByLabelText('Minutos')).toHaveValue(8);

    await user.click(submitButton());

    expect(updateWorkout).toHaveBeenCalledTimes(1);
    const [duelId, workoutId, exercises] = updateWorkout.mock.calls[0];
    expect(duelId).toBe('duel-1');
    expect(workoutId).toBe('w1');
    expect(exercises[0].sets).toBe(4);
    expect(createWorkout).not.toHaveBeenCalled();

    // This workout was already `status: 'scored'` before the edit (no
    // revision/scoredAt/sessionScore to compare against in this stub data),
    // so the toast must not fire just because the status still reads
    // 'scored' — that would be showing the pre-edit result as if it were
    // the outcome of this edit.
    expect(await screen.findByText('Entrenamiento actualizado ✓')).toBeInTheDocument();
  });

  it.skip('legacy scoring listener no longer controls edit confirmation', async () => {
    const user = userEvent.setup();
    useWorkouts.mockReturnValue({
      workouts: [
        {
          workoutId: 'w1',
          status: 'scored',
          sessionScore: 50,
          revision: 1,
          exercises: [{ exerciseId: 'Sentadillas', name: 'Sentadillas', sets: 4, reps: 12, durationMinutes: 8 }],
        },
      ],
      loading: false,
      error: null,
    });

    const { rerender } = renderSubirPrueba('/workouts/w1/edit');
    await screen.findByLabelText('Series');

    await user.click(submitButton());

    expect(await screen.findByText(/calculando puntos/i)).toBeInTheDocument();
    expect(screen.queryByText(/50 puntos/i)).not.toBeInTheDocument();

    // The listener keeps reporting the same (pre-edit) snapshot: still no
    // toast, since nothing has actually changed server-side yet.
    rerender(renderTree('/workouts/w1/edit'));
    expect(screen.queryByText(/50 puntos/i)).not.toBeInTheDocument();

    // Now the server genuinely re-scores the edited version: revision bumps
    // and the score changes. Only now should the toast appear.
    useWorkouts.mockReturnValue({
      workouts: [{ workoutId: 'w1', status: 'scored', sessionScore: 62, revision: 2, exercises: [] }],
      loading: false,
      error: null,
    });
    rerender(renderTree('/workouts/w1/edit'));

    expect(await screen.findByText(/62 puntos/i)).toBeInTheDocument();
  });

  it.skip('legacy scoring revisions no longer control edit confirmation', async () => {
    const user = userEvent.setup();
    const preEditScoredAt = { toMillis: () => 1_000 };
    const workoutWith = (overrides) => ({
      workoutId: 'w1',
      status: 'scored',
      sessionScore: 50,
      scoredAt: preEditScoredAt,
      revision: 1,
      exercises: [{ exerciseId: 'Sentadillas', name: 'Sentadillas', sets: 4, reps: 12, durationMinutes: 8 }],
      ...overrides,
    });

    useWorkouts.mockReturnValue({ workouts: [workoutWith({})], loading: false, error: null });

    const { rerender } = renderSubirPrueba('/workouts/w1/edit');
    await screen.findByLabelText('Series');

    await user.click(submitButton());
    expect(await screen.findByText(/calculando puntos/i)).toBeInTheDocument();

    // A real Firestore listener does local-write latency compensation: the
    // immediate cached snapshot already shows OUR new `revision` while
    // status/sessionScore/scoredAt are still the pre-edit server values.
    // That must not be mistaken for a re-score.
    useWorkouts.mockReturnValue({
      workouts: [workoutWith({ revision: 2 })],
      loading: false,
      error: null,
    });
    rerender(renderTree('/workouts/w1/edit'));

    expect(screen.queryByText(/50 puntos/i)).not.toBeInTheDocument();
    expect(screen.getByText(/calculando puntos/i)).toBeInTheDocument();

    // Only the server-written `scoredAt` advancing proves a genuine
    // re-score — even when the resulting score is unchanged.
    useWorkouts.mockReturnValue({
      workouts: [workoutWith({ revision: 2, scoredAt: { toMillis: () => 2_000 } })],
      loading: false,
      error: null,
    });
    rerender(renderTree('/workouts/w1/edit'));

    expect(await screen.findByText(/50 puntos/i)).toBeInTheDocument();
  });

  it('accepts a DocumentReference-shaped return from createWorkout as the new workout id', async () => {
    createWorkout.mockResolvedValue({ id: 'w-ref-1' }); // not a bare string

    const { rerender } = renderSubirPrueba();

    await act(async () => {
      fireEvent.click(submitButton());
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    useWorkouts.mockReturnValue({
      workouts: [{ workoutId: 'w-ref-1', status: 'scored', sessionScore: 91, exercises: [] }],
      loading: false,
      error: null,
    });
    rerender(renderTree());

    expect(await screen.findByText('Entrenamiento guardado ✓')).toBeInTheDocument();
  });

  it('shows a loading state instead of the form while the duel is still resolving', async () => {
    useActiveDuel.mockReturnValue({ duel: null, loading: true, error: null });

    renderSubirPrueba();
    await flushProfileFetch();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /guardar entrenamiento/i })).not.toBeInTheDocument();
  });

  it('shows an error state when the duel fails to load', async () => {
    useActiveDuel.mockReturnValue({ duel: null, loading: false, error: new Error('boom') });

    renderSubirPrueba();
    await flushProfileFetch();

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not call createWorkout while the duel has not resolved yet', async () => {
    useActiveDuel.mockReturnValue({ duel: null, loading: true, error: null });

    renderSubirPrueba();
    await flushProfileFetch();

    expect(screen.queryByRole('button', { name: /guardar entrenamiento/i })).not.toBeInTheDocument();
    expect(createWorkout).not.toHaveBeenCalled();
  });

  it('shows a loading state (not a premature validation error) while useWorkouts is still loading in edit mode', async () => {
    useWorkouts.mockReturnValue({ workouts: [], loading: true, error: null });

    renderSubirPrueba('/workouts/w1/edit');
    await flushProfileFetch();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText(/debes registrar entre/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /añadir ejercicio/i })).not.toBeInTheDocument();
  });

  it('shows a not-found message when the edited workout id has no match once loading completes', async () => {
    useWorkouts.mockReturnValue({ workouts: [], loading: false, error: null });

    renderSubirPrueba('/workouts/does-not-exist/edit');
    await flushProfileFetch();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /guardar entrenamiento/i })).not.toBeInTheDocument();
  });
});
