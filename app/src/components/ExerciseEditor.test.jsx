import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import ExerciseEditor, {
  EXERCISE_CATALOG,
  MAX_EXERCISES,
  MIN_EXERCISES,
  createEmptyExercise,
  validateExercises,
} from './ExerciseEditor';

// Thin controlled-component harness so tests exercise the same add/remove/
// edit flow a real parent (SubirPrueba) would drive via `exercises`/`onChange`.
function Harness({ initial, onValidityChange }) {
  const [exercises, setExercises] = useState(initial);
  return <ExerciseEditor exercises={exercises} onChange={setExercises} onValidityChange={onValidityChange} />;
}

describe('validateExercises (pure)', () => {
  it('is valid for a single in-range exercise', () => {
    const result = validateExercises([{ name: 'Flexiones', sets: 3, reps: 15, durationMinutes: 10 }]);
    expect(result.isValid).toBe(true);
    expect(result.totalMinutes).toBe(10);
  });

  it('flags sets/reps outside the 1-20 / 1-500 range', () => {
    const result = validateExercises([{ name: 'Flexiones', sets: 21, reps: 501, durationMinutes: 10 }]);
    expect(result.isValid).toBe(false);
    expect(result.rowErrors[0].sets).toBeTruthy();
    expect(result.rowErrors[0].reps).toBeTruthy();
  });

  it('flags total duration outside 1-300 minutes across exercises', () => {
    const result = validateExercises([
      { name: 'Flexiones', sets: 1, reps: 1, durationMinutes: 200 },
      { name: 'Sentadillas', sets: 1, reps: 1, durationMinutes: 150 },
    ]);
    expect(result.isValid).toBe(false);
    expect(result.totalError).toBeTruthy();
    expect(result.totalMinutes).toBe(350);
  });

  it('flags a count outside 1-20 exercises', () => {
    expect(validateExercises([]).countError).toBeTruthy();
    const tooMany = Array.from({ length: 21 }, () => createEmptyExercise());
    expect(validateExercises(tooMany).countError).toBeTruthy();
  });
});

describe('ExerciseEditor (controlled)', () => {
  it('offers exercises that can arrive from the daily routine', () => {
    render(<Harness initial={[{ ...createEmptyExercise(), exerciseId: 'Marcha activa', name: 'Marcha activa' }]} />);
    expect(screen.getByLabelText('Ejercicio')).toHaveValue('Marcha activa');
    expect(screen.getByRole('option', { name: 'Estiramiento general' })).toBeInTheDocument();
  });

  it('renders one row per exercise from props, not internal state', () => {
    render(<Harness initial={[createEmptyExercise(), createEmptyExercise()]} />);
    expect(screen.getAllByLabelText('Ejercicio')).toHaveLength(2);
  });

  it('adding a row appends via onChange and is capped at MAX_EXERCISES', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[createEmptyExercise()]} />);

    await user.click(screen.getByRole('button', { name: /añadir ejercicio/i }));
    expect(screen.getAllByLabelText('Ejercicio')).toHaveLength(2);

    // Fill up to the cap and confirm the add button disables at the limit.
    for (let i = 2; i < MAX_EXERCISES; i += 1) {
      await user.click(screen.getByRole('button', { name: /añadir ejercicio/i }));
    }
    expect(screen.getAllByLabelText('Ejercicio')).toHaveLength(MAX_EXERCISES);
    expect(screen.getByRole('button', { name: /añadir ejercicio/i })).toBeDisabled();
  });

  it('removing a row never goes below MIN_EXERCISES', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[createEmptyExercise()]} />);

    const removeButton = screen.getByRole('button', { name: /eliminar ejercicio 1/i });
    expect(removeButton).toBeDisabled();
    await user.click(removeButton);
    expect(screen.getAllByLabelText('Ejercicio')).toHaveLength(MIN_EXERCISES);
  });

  it('surfaces inline errors for out-of-range fields', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[createEmptyExercise()]} />);

    const setsInput = screen.getByLabelText('Series');
    await user.clear(setsInput);
    await user.type(setsInput, '99');

    expect(await screen.findByText(/series entre 1 y 20/i)).toBeInTheDocument();
  });

  it('calls onValidityChange with the current validity', async () => {
    const onValidityChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={[createEmptyExercise()]} onValidityChange={onValidityChange} />);

    expect(onValidityChange).toHaveBeenCalledWith(true);

    const repsInput = screen.getByLabelText('Reps');
    await user.clear(repsInput);
    await user.type(repsInput, '999');

    expect(onValidityChange).toHaveBeenCalledWith(false);
  });
});
