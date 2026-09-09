import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RestTimer from './RestTimer';

describe('RestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('closes itself and calls onComplete once the countdown reaches zero', () => {
    const onComplete = vi.fn();
    render(<RestTimer initialSeconds={2} exerciseName="Flexiones" onComplete={onComplete} onSkip={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not auto-complete while paused', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<RestTimer initialSeconds={1} exerciseName="Flexiones" onComplete={onComplete} onSkip={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('still lets the user skip the rest immediately', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<RestTimer initialSeconds={60} exerciseName="Flexiones" onComplete={vi.fn()} onSkip={onSkip} />);

    await user.click(screen.getByRole('button', { name: 'Saltar descanso' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
