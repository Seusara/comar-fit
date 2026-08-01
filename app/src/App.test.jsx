import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { useAuth } from './contexts/AuthContext';
import { findActiveDuelForUser } from './firebase/firestore';

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: vi.fn(),
}));
vi.mock('./firebase/firestore');

function setRoute(path) {
  window.history.pushState({}, '', path);
}

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to /login from a protected route', async () => {
    useAuth.mockReturnValue({ currentUser: null, authLoading: false });
    setRoute('/dashboard');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    });
  });

  it('sends an authenticated user with no duel to /connect-partner', async () => {
    useAuth.mockReturnValue({ currentUser: { uid: 'uid-1' }, authLoading: false });
    findActiveDuelForUser.mockResolvedValue(null);
    setRoute('/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /conecta con tu pareja/i })).toBeInTheDocument();
    });
  });

  it('sends the user to /connect-partner when the duel lookup fails', async () => {
    useAuth.mockReturnValue({ currentUser: { uid: 'uid-1' }, authLoading: false });
    findActiveDuelForUser.mockRejectedValue(new Error('offline'));
    setRoute('/');

    render(<App />);

    // Never left stuck on "Cargando..." forever.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /conecta con tu pareja/i })).toBeInTheDocument();
    });
  });

  it('redirects an unknown path to /', async () => {
    useAuth.mockReturnValue({ currentUser: { uid: 'uid-1' }, authLoading: false });
    findActiveDuelForUser.mockResolvedValue(null);
    setRoute('/no-such-page');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /conecta con tu pareja/i })).toBeInTheDocument();
    });
  });

  it('reaches the workout history through the bottom nav "Pruebas" item', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({ currentUser: { uid: 'aaron' }, authLoading: false });
    findActiveDuelForUser.mockResolvedValue({ duelId: 'duel-1' });
    setRoute('/dashboard');

    render(<App />);

    await user.click(await screen.findByRole('link', { name: /pruebas/i }));

    expect(await screen.findByRole('heading', { name: /tu historial/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/revisar-prueba');
  });

  it('sends an authenticated user with an active duel to /dashboard', async () => {
    useAuth.mockReturnValue({ currentUser: { uid: 'uid-1' }, authLoading: false });
    findActiveDuelForUser.mockResolvedValue({ duelId: 'duel-1' });
    setRoute('/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /subir entrenamiento/i })).toBeInTheDocument();
    });
  });
});
