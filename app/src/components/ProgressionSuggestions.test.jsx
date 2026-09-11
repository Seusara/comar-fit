import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ProgressionSuggestions from './ProgressionSuggestions';

const INCREASE_SUGGESTION = {
  id: 'aaron_2026-W32',
  userId: 'aaron',
  weekId: '2026-W32',
  status: 'pending',
  days: {
    1: [{ exerciseId: 'pushups', action: 'increase', delta: 2, reason: '80% de las sesiones fueron fáciles. Subimos 2 repeticiones.', proposed: { sets: 3, reps: 12 } }],
    3: [{ exerciseId: 'squats', action: 'maintain', delta: 0, reason: 'Dificultad equilibrada.', proposed: { sets: 4, reps: 12 } }],
  },
};

const REDUCE_SUGGESTION = {
  ...INCREASE_SUGGESTION,
  days: {
    1: [{ exerciseId: 'dips', action: 'reduce', delta: -2, reason: '60% de las sesiones fueron difíciles. Bajamos 2 repeticiones.', proposed: { sets: 3, reps: 6 } }],
  },
};

const ALL_MAINTAIN = {
  ...INCREASE_SUGGESTION,
  days: {
    1: [{ exerciseId: 'pushups', action: 'maintain', delta: 0, reason: 'Equilibrado.', proposed: {} }],
  },
};

describe('ProgressionSuggestions', () => {
  it('renders nothing when suggestion is null', () => {
    const { container } = render(<ProgressionSuggestions suggestion={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when all suggestions are maintain', () => {
    const { container } = render(<ProgressionSuggestions suggestion={ALL_MAINTAIN} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an improvement headline when all actions are increase', () => {
    render(<ProgressionSuggestions suggestion={INCREASE_SUGGESTION} />);
    expect(screen.getByRole('heading', { name: /progreso está mejorando/i })).toBeInTheDocument();
  });

  it('shows a reduce headline when all actions are reduce', () => {
    render(<ProgressionSuggestions suggestion={REDUCE_SUGGESTION} />);
    expect(screen.getByRole('heading', { name: /ajustemos la carga/i })).toBeInTheDocument();
  });

  it('lists only non-maintain suggestions', () => {
    render(<ProgressionSuggestions suggestion={INCREASE_SUGGESTION} />);
    // pushups is increase → visible; squats is maintain → hidden
    expect(screen.getByText(/pushups/i)).toBeInTheDocument();
    expect(screen.queryByText(/squats/i)).not.toBeInTheDocument();
  });

  it('shows the reason text for each suggestion', () => {
    render(<ProgressionSuggestions suggestion={INCREASE_SUGGESTION} />);
    expect(screen.getByText(/80%.*fáciles/i)).toBeInTheDocument();
  });

  it('calls onAccept when Aceptar is clicked', async () => {
    const onAccept = vi.fn();
    const user = userEvent.setup();
    render(<ProgressionSuggestions suggestion={INCREASE_SUGGESTION} onAccept={onAccept} onDismiss={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /aceptar/i }));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when Mantener igual is clicked', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<ProgressionSuggestions suggestion={INCREASE_SUGGESTION} onAccept={vi.fn()} onDismiss={onDismiss} />);
    await user.click(screen.getByRole('button', { name: /mantener igual/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('disables both buttons while pending', () => {
    render(<ProgressionSuggestions suggestion={INCREASE_SUGGESTION} onAccept={vi.fn()} onDismiss={vi.fn()} pending />);
    expect(screen.getByRole('button', { name: /aceptar/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /mantener igual/i })).toBeDisabled();
  });
});
