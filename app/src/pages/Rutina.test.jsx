import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Rutina from './Rutina';
import { useAuth } from '../contexts/AuthContext';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { generatePlanIfMissing, getPlan } from '../firebase/plans';
import {
  getOrCreateWorkoutProgress, makeProgressId, subscribeToWorkoutProgress, toggleExerciseCompletion,
} from '../firebase/workoutProgress';
import { getOrCreateRunSession, makeRunId, startRunSession } from '../firebase/runSessions';

vi.mock('../contexts/AuthContext');
vi.mock('../hooks/useActiveDuel');
vi.mock('../firebase/plans');
vi.mock('../firebase/workoutProgress');
vi.mock('../firebase/runSessions');
vi.mock('../utils/dates', () => ({
  DUEL_TIME_ZONE: 'America/Mexico_City',
  getDuelWeekContext: () => ({ weekId: '2026-W32', isoWeekday: 1 }),
}));

const workoutDay = {
  type: 'workout', focus: 'legs', exercises: [
    { id: 'squat', name: 'Sentadillas', sets: 3, reps: 10, restSeconds: 45 },
    { id: 'lunge', name: 'Zancadas', sets: 3, reps: 8 },
  ],
};
const pendingProgress = {
  exercises: [
    { id: 'squat', name: 'Sentadillas', completed: false },
    { id: 'lunge', name: 'Zancadas', completed: false },
  ], completedCount: 0, totalCount: 2, completionRate: 0, status: 'pending',
};

function Destination() {
  const location = useLocation();
  return <pre data-testid="navigation-state">{JSON.stringify(location.state)}</pre>;
}

function renderRoutine() {
  return render(
    <MemoryRouter initialEntries={['/rutina']}>
      <Routes>
        <Route path="/rutina" element={<Rutina />} />
        <Route path="/subir-prueba" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Rutina semanal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useAuth.mockReturnValue({ currentUser: { uid: 'aaron' } });
    useActiveDuel.mockReturnValue({ duel: { duelId: 'duel-1', timezone: 'America/Mexico_City' }, loading: false, error: null });
    generatePlanIfMissing.mockResolvedValue({ days: { 1: workoutDay } });
    getPlan.mockResolvedValue({ days: { 1: workoutDay } });
    getOrCreateWorkoutProgress.mockResolvedValue(pendingProgress);
    makeProgressId.mockImplementation((uid, week, day) => `${uid}_${week}_d${day}`);
    makeRunId.mockImplementation((uid, week, day) => `${uid}_${week}_d${day}`);
    subscribeToWorkoutProgress.mockImplementation((_duelId, _progressId, onData) => {
      onData(pendingProgress);
      return vi.fn();
    });
  });

  it('muestra exactamente los ejercicios del plan y no crea progreso local', async () => {
    renderRoutine();
    expect(await screen.findByRole('checkbox', { name: 'Sentadillas' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Zancadas' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getByText('3 series × 10 reps')).toBeInTheDocument();
    expect(Object.keys(localStorage)).toHaveLength(0);
    expect(getOrCreateWorkoutProgress).toHaveBeenCalledWith('duel-1', 'aaron', '2026-W32', 1, workoutDay);
  });

  it('escribe en workoutProgress y registra solo los ejercicios completados', async () => {
    const user = userEvent.setup();
    toggleExerciseCompletion.mockResolvedValue({
      ...pendingProgress, exercises: [{ ...pendingProgress.exercises[0], completed: true }, pendingProgress.exercises[1]],
      completedCount: 1, completionRate: 50, status: 'partial',
    });
    renderRoutine();
    await user.click(await screen.findByRole('checkbox', { name: 'Sentadillas' }));
    expect(toggleExerciseCompletion).toHaveBeenCalledWith('duel-1', 'aaron_2026-W32_d1', 'squat', true);
    await user.click(screen.getByRole('button', { name: 'Registrar como entrenamiento' }));
    const state = JSON.parse(screen.getByTestId('navigation-state').textContent);
    expect(state).toMatchObject({ source: 'weekly-plan', exercises: [{ name: 'Sentadillas', sets: 3, reps: 10 }] });
    expect(Object.keys(localStorage)).toHaveLength(0);
  });

  it('recibe cambios externos mediante la suscripción compartida', async () => {
    let publish;
    subscribeToWorkoutProgress.mockImplementation((_duelId, _progressId, onData) => { publish = onData; return vi.fn(); });
    renderRoutine();
    await screen.findByRole('checkbox', { name: 'Sentadillas' });
    publish({ ...pendingProgress, exercises: [{ ...pendingProgress.exercises[0], completed: true }, pendingProgress.exercises[1]], completedCount: 1, completionRate: 50 });
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Sentadillas' })).toBeChecked());
  });

  it('muestra descanso sin ejercicios ni rutina opcional', async () => {
    getPlan.mockResolvedValue({ days: { 1: { type: 'rest' } } });
    renderRoutine();
    expect(await screen.findByRole('heading', { name: 'Descanso' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(getOrCreateWorkoutProgress).not.toHaveBeenCalled();
  });

  it('muestra e inicia la carrera compartida sin GPS', async () => {
    const user = userEvent.setup();
    const runDay = { type: 'run', target: { distanceMeters: 2000, durationSeconds: 1200 } };
    getPlan.mockResolvedValue({ days: { 1: runDay } });
    getOrCreateRunSession.mockResolvedValue({ status: 'pending' });
    startRunSession.mockResolvedValue({ status: 'active' });
    renderRoutine();
    expect(await screen.findByText('Meta: 2 km o 20 min')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Iniciar carrera' }));
    expect(startRunSession).toHaveBeenCalledWith('duel-1', 'aaron_2026-W32_d1');
    expect(await screen.findByText('Carrera en curso')).toBeInTheDocument();
    expect(screen.getByText(/GPS todavía no está disponible/i)).toBeInTheDocument();
  });
});
