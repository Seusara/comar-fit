import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import WeeklyPlanCard from './WeeklyPlanCard';

const WORKOUT_PLAN = {
  days: {
    '1': {
      type: 'workout',
      focus: 'chest_triceps',
      exercises: [
        { id: 'bench', name: 'Press de banca', type: 'reps', sets: 3, reps: 8 },
        { id: 'pushup', name: 'Flexiones', type: 'duration', sets: 4, durationSeconds: 45 },
        { id: 'dip', name: 'Fondos' },
        { id: 'extension', name: 'Extensión de tríceps' },
      ],
    },
    '2': { type: 'workout', focus: 'back_biceps', exercises: [] },
    '3': { type: 'rest' },
    '4': { type: 'workout', focus: 'legs', exercises: [] },
    '5': { type: 'workout', focus: 'fullbody_core', exercises: [] },
    '6': { type: 'run', target: { distanceMeters: 2000, durationSeconds: 1200 } },
    '7': { type: 'rest' },
  },
};

const PARTIAL_PROGRESS = {
  status: 'partial',
  completedCount: 2,
  totalCount: 4,
  completionRate: 50,
  exercises: [
    { id: 'bench', name: 'Press de banca', completed: true },
    { id: 'pushup', name: 'Flexiones', completed: true },
    { id: 'dip', name: 'Fondos', completed: false },
    { id: 'extension', name: 'Extensión de tríceps', completed: false },
  ],
};

const COMPLETED_AT_THRESHOLD = {
  status: 'partial',
  completedCount: 4,
  totalCount: 5,
  completionRate: 80,
  exercises: [
    { id: 'bench', name: 'Press de banca', completed: true },
    { id: 'pushup', name: 'Flexiones', completed: true },
    { id: 'dip', name: 'Fondos', completed: true },
    { id: 'extension', name: 'Extensión de tríceps', completed: true },
    { id: 'fly', name: 'Aperturas', completed: false },
  ],
};

const THRESHOLD_PLAN = {
  days: {
    ...WORKOUT_PLAN.days,
    '1': {
      ...WORKOUT_PLAN.days['1'],
      exercises: [
        ...WORKOUT_PLAN.days['1'].exercises,
        { id: 'fly', name: 'Aperturas', type: 'reps', sets: 3, reps: 10 },
      ],
    },
  },
};

const RUN_PLAN = {
  days: {
    '1': { type: 'rest' },
    '2': { type: 'rest' },
    '3': { type: 'rest' },
    '4': { type: 'rest' },
    '5': { type: 'rest' },
    '6': { type: 'run', target: { distanceMeters: 2000, durationSeconds: 1200 } },
    '7': { type: 'rest' },
  },
};

const REST_PLAN = {
  days: {
    '1': { type: 'rest' },
    '2': { type: 'rest' },
    '3': { type: 'rest' },
    '4': { type: 'rest' },
    '5': { type: 'rest' },
    '6': { type: 'rest' },
    '7': { type: 'rest' },
  },
};

describe('WeeklyPlanCard', () => {
  it('renders seven days and expands the current workout', () => {
    render(<WeeklyPlanCard plan={WORKOUT_PLAN} currentDay={1} progress={PARTIAL_PROGRESS} />);

    expect(screen.getAllByTestId('week-day')).toHaveLength(7);
    expect(screen.getByText(/pecho \+ tríceps/i)).toBeInTheDocument();
    expect(screen.getByText('50% completado')).toBeInTheDocument();
  });

  it('renders sets and repetitions for a repetition exercise', () => {
    render(<WeeklyPlanCard plan={WORKOUT_PLAN} currentDay={1} progress={PARTIAL_PROGRESS} />);

    expect(screen.getByText('3 series × 8 repeticiones')).toBeInTheDocument();
  });

  it('renders sets and seconds for a duration exercise', () => {
    render(<WeeklyPlanCard plan={WORKOUT_PLAN} currentDay={1} progress={PARTIAL_PROGRESS} />);

    expect(screen.getByText('4 series × 45 segundos')).toBeInTheDocument();
  });

  it('renders the completed state at the 80 percent threshold', () => {
    render(
      <WeeklyPlanCard
        plan={THRESHOLD_PLAN}
        currentDay={1}
        progress={COMPLETED_AT_THRESHOLD}
      />,
    );

    const currentRow = screen.getAllByTestId('week-day').find(
      (row) => row.getAttribute('data-current') === 'true',
    );
    expect(within(currentRow).getByText('Completado')).toBeInTheDocument();
    expect(within(currentRow).getByText('80% completado')).toBeInTheDocument();
  });

  it('shows a visible status icon with status text on every row', () => {
    render(<WeeklyPlanCard plan={WORKOUT_PLAN} currentDay={1} progress={PARTIAL_PROGRESS} />);

    for (const row of screen.getAllByTestId('week-day')) {
      expect(within(row).getByTestId('day-status-icon')).toBeVisible();
      expect(within(row).getByTestId('day-status-icon')).toHaveAttribute('aria-hidden', 'true');
      expect(within(row).getByTestId('day-status')).not.toHaveTextContent(/^\s*$/);
    }
  });

  it('renders the current run target and starts it', async () => {
    const onStartRun = vi.fn();
    render(
      <WeeklyPlanCard
        plan={RUN_PLAN}
        currentDay={6}
        runSession={{ status: 'pending' }}
        onStartRun={onStartRun}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /iniciar carrera/i }));
    expect(onStartRun).toHaveBeenCalledOnce();
  });

  it('renders rest without an action', () => {
    render(<WeeklyPlanCard plan={REST_PLAN} currentDay={7} />);

    expect(screen.getByText(/recuperación/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /iniciar/i })).not.toBeInTheDocument();
  });

  it('renders loading and recoverable errors inside the card', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<WeeklyPlanCard loading />);

    expect(screen.getByText('Preparando tu semana…')).toBeInTheDocument();

    rerender(<WeeklyPlanCard error={new Error('offline')} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tu semana.');
    await user.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows an active run and disables a pending start action', () => {
    const { rerender } = render(
      <WeeklyPlanCard
        plan={RUN_PLAN}
        currentDay={6}
        runSession={{ status: 'pending' }}
        actionPending
      />,
    );

    expect(screen.getByRole('button', { name: /iniciar carrera/i })).toBeDisabled();

    rerender(
      <WeeklyPlanCard
        plan={RUN_PLAN}
        currentDay={6}
        runSession={{ status: 'active' }}
      />,
    );
    expect(screen.getByText('Carrera en curso')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /iniciar carrera/i })).not.toBeInTheDocument();
    expect(screen.getByText(/2 km o 20 min/i)).toBeInTheDocument();
  });

  it('forwards exercise checkbox changes and announces progress', async () => {
    const onToggleExercise = vi.fn();
    const user = userEvent.setup();
    render(
      <WeeklyPlanCard
        plan={WORKOUT_PLAN}
        currentDay={1}
        progress={PARTIAL_PROGRESS}
        onToggleExercise={onToggleExercise}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Fondos' }));
    expect(onToggleExercise).toHaveBeenCalledWith('dip', true);
    expect(screen.getByText(/2 de 4 ejercicios, 50% completado/i)).toBeInTheDocument();
  });
});
