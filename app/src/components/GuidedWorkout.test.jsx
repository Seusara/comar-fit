import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GuidedWorkout from './GuidedWorkout';

const exercises = [
  { id: 'pushups', name: 'Flexiones', sets: 2, reps: 12 },
  { id: 'squats', name: 'Sentadillas', sets: 3, reps: 15 },
];

describe('GuidedWorkout', () => {
  beforeEach(() => localStorage.clear());

  it('advances series and completes only the current exercise', async () => {
    const user = userEvent.setup();
    const onCompleteExercise = vi.fn().mockResolvedValue(undefined);
    render(<GuidedWorkout sessionId="session-1" exercises={exercises} progressById={new Map()}
      onCompleteExercise={onCompleteExercise} onFinish={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Flexiones' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Completar serie' }));
    expect(onCompleteExercise).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Saltar descanso' }));
    await user.click(screen.getByRole('button', { name: 'Completar ejercicio' }));

    expect(onCompleteExercise).toHaveBeenCalledWith('pushups');
    await user.click(screen.getByRole('button', { name: 'Saltar descanso' }));
    expect(await screen.findByRole('heading', { name: 'Sentadillas' })).toBeInTheDocument();
  });

  it('restores a paused session from local storage', () => {
    localStorage.setItem('comar-fit:guided:session-2', JSON.stringify({ index: 1, elapsedSeconds: 125, running: false, completedSets: {} }));
    render(<GuidedWorkout sessionId="session-2" exercises={exercises} progressById={new Map()}
      onCompleteExercise={vi.fn()} onFinish={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('02:05')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sentadillas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });

  it('returns the exact completed exercise ids when finishing', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<GuidedWorkout sessionId="session-3" exercises={exercises} progressById={new Map([['pushups', { completed: true }]])}
      onCompleteExercise={vi.fn()} onFinish={onFinish} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Finalizar y registrar' }));
    expect(onFinish).toHaveBeenCalledWith(0, ['pushups']);
  });
});
