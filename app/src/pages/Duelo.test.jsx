import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Duelo from './Duelo';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { useDuelWorkouts } from '../hooks/useDuelWorkouts';

vi.mock('../hooks/useActiveDuel');
vi.mock('../hooks/useDuelWorkouts');

const DUEL = {
  duelId: 'duel-1',
  userA_uid: 'aaron',
  userB_uid: 'alexandra',
  createdAt: new Date('2026-07-20T18:00:00Z'),
  participantNames: { aaron: 'Aaron', alexandra: 'Alexandra' },
};

const WORKOUTS = [
  { workoutId: 'a-1', userId: 'aaron', performedAt: new Date('2026-07-27T18:00:00Z') },
  { workoutId: 'a-2', userId: 'aaron', performedAt: new Date('2026-07-28T18:00:00Z') },
  { workoutId: 'b-1', userId: 'alexandra', performedAt: new Date('2026-07-27T19:00:00Z') },
];

function renderDuelo() {
  return render(<MemoryRouter><Duelo /></MemoryRouter>);
}

describe('Duelo', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-03T18:00:00Z'));
    useActiveDuel.mockReturnValue({ duel: DUEL, loading: false, error: null });
    useDuelWorkouts.mockReturnValue({ workouts: WORKOUTS, loading: false, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders current totals and completed weeks newest first', () => {
    renderDuelo();

    expect(screen.getByRole('heading', { name: /duelo semanal/i })).toBeInTheDocument();
    expect(screen.getAllByText('Aaron').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alexandra').length).toBeGreaterThan(0);
    expect(screen.getByText(/ganó Aaron/i)).toBeInTheDocument();
    expect(screen.getByText(/^empate$/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('week-row').map((row) => row.dataset.weekId))
      .toEqual(['2026-07-27', '2026-07-20']);
  });

  it('renders a no-completed-week state', () => {
    useActiveDuel.mockReturnValue({
      duel: { ...DUEL, createdAt: new Date('2026-08-03T12:00:00Z') },
      loading: false,
      error: null,
    });
    useDuelWorkouts.mockReturnValue({ workouts: [], loading: false, error: null });

    renderDuelo();

    expect(screen.getByText(/aún no hay semanas finalizadas/i)).toBeInTheDocument();
  });

  it('renders loading and error states', () => {
    useActiveDuel.mockReturnValue({ duel: null, loading: true, error: null });
    const { rerender } = renderDuelo();
    expect(screen.getByRole('status')).toHaveTextContent(/cargando duelo/i);

    useActiveDuel.mockReturnValue({ duel: DUEL, loading: false, error: null });
    useDuelWorkouts.mockReturnValue({ workouts: [], loading: false, error: new Error('offline') });
    rerender(<MemoryRouter><Duelo /></MemoryRouter>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
