import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import WorkoutCard from './WorkoutCard';

const baseWorkout = {
  workoutId: 'w1',
  performedAt: new Date('2026-07-31T12:00:00Z'),
  status: 'pending',
  exercises: [{ exerciseId: 'Flexiones', name: 'Flexiones', sets: 3, reps: 15, durationMinutes: 10 }],
};

describe('WorkoutCard', () => {
  it('lists exercises with sets x reps and duration', () => {
    render(<WorkoutCard workout={baseWorkout} />);
    expect(screen.getByText('Flexiones')).toBeInTheDocument();
    expect(screen.getByText(/3×15/)).toBeInTheDocument();
    expect(screen.getByText(/10 min/)).toBeInTheDocument();
  });

  it('shows pending legacy documents as completed', () => {
    render(<WorkoutCard workout={{ ...baseWorkout, status: 'pending' }} />);
    expect(screen.getByText('Entrenamiento completado')).toBeInTheDocument();
  });

  it('ignores legacy session scores', () => {
    render(<WorkoutCard workout={{ ...baseWorkout, status: 'scored', sessionScore: 72 }} />);
    expect(screen.getByText('Entrenamiento completado')).toBeInTheDocument();
    expect(screen.queryByText(/72 pts/)).not.toBeInTheDocument();
  });

  it('ignores legacy scoring errors', () => {
    render(<WorkoutCard workout={{ ...baseWorkout, status: 'error' }} />);
    expect(screen.getByText('Entrenamiento completado')).toBeInTheDocument();
  });

  it('shows edit/delete actions when within the edit window', () => {
    const future = new Date(Date.now() + 5 * 60 * 1000);
    render(<WorkoutCard workout={baseWorkout} editableUntil={future} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  it('hides edit/delete actions once the edit window has closed', () => {
    const past = new Date(Date.now() - 5 * 60 * 1000);
    render(<WorkoutCard workout={baseWorkout} editableUntil={past} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });

  it('calls onEdit with the workout when Editar is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const future = new Date(Date.now() + 5 * 60 * 1000);
    render(<WorkoutCard workout={baseWorkout} editableUntil={future} onEdit={onEdit} onDelete={() => {}} />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(onEdit).toHaveBeenCalledWith(baseWorkout);
  });

  it('requires a confirmation step before calling onDelete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const future = new Date(Date.now() + 5 * 60 * 1000);
    render(<WorkoutCard workout={baseWorkout} editableUntil={future} onEdit={() => {}} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(/¿eliminar este entrenamiento\?/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onDelete).toHaveBeenCalledWith(baseWorkout);
  });

  it('cancels the delete confirmation without calling onDelete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const future = new Date(Date.now() + 5 * 60 * 1000);
    render(<WorkoutCard workout={baseWorkout} editableUntil={future} onEdit={() => {}} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^eliminar$/i })).toBeInTheDocument();
  });
});
