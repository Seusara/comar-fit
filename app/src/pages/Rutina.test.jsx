import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Rutina from './Rutina';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useActiveDuel } from '../hooks/useActiveDuel';

vi.mock('../contexts/AuthContext');
vi.mock('../hooks/useUserProfile');
vi.mock('../hooks/useActiveDuel');

const profile = {
  experienceLevel: 'Intermediate', objective: 'Ganar fuerza',
  equipment: ['Mochila'], preferredWorkoutMinutes: 30,
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
    </MemoryRouter>
  );
}

describe('Rutina', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuth.mockReturnValue({ currentUser: { uid: 'aaron' } });
    useUserProfile.mockReturnValue({ profile, loading: false, error: null });
    useActiveDuel.mockReturnValue({ duel: { timezone: 'America/Mexico_City' }, loading: false, error: null });
  });

  it('renders all phases and starts with registration disabled', () => {
    renderRoutine();
    expect(screen.getByRole('heading', { name: 'Calentamiento' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bloque principal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recuperación' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progreso de rutina' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('button', { name: 'Registrar como entrenamiento' })).toBeDisabled();
  });

  it('persists progress and transfers only completed exercises', async () => {
    const user = userEvent.setup();
    renderRoutine();
    const exercises = screen.getAllByRole('checkbox');
    await user.click(exercises[0]);
    expect(screen.getByRole('progressbar', { name: 'Progreso de rutina' })).not.toHaveAttribute('aria-valuenow', '0');
    expect(Object.keys(localStorage).some((key) => key.includes('routine-progress:aaron:'))).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Registrar como entrenamiento' }));
    const state = JSON.parse(screen.getByTestId('navigation-state').textContent);
    expect(state.source).toBe('daily-routine');
    expect(state.exercises).toHaveLength(1);
    expect(state.exercises[0].name).toBeTruthy();
  });

  it('shows a safe fallback notice for incomplete profiles', () => {
    useUserProfile.mockReturnValue({ profile: {}, loading: false, error: null });
    renderRoutine();
    expect(screen.getByText(/rutina segura de inicio/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /completar perfil/i })).toHaveAttribute('href', '/perfil');
  });

  it('shows recoverable loading and profile error states', () => {
    useUserProfile.mockReturnValue({ profile: null, loading: true, error: null });
    const { rerender } = renderRoutine();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando rutina');
    useUserProfile.mockReturnValue({ profile: null, loading: false, error: new Error('offline') });
    rerender(<MemoryRouter><Rutina /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /ir a perfil/i })).toHaveAttribute('href', '/perfil');
  });
});
