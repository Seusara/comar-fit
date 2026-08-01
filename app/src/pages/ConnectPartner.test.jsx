import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ConnectPartner from './ConnectPartner';
import { findUserByEmail, createDuel } from '../firebase/firestore';

vi.mock('../firebase/firestore');
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'comar-uid', email: 'comar@example.com' } }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('ConnectPartner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a duel and navigates to /dashboard when the partner exists', async () => {
    findUserByEmail.mockResolvedValue({ uid: 'alex-uid', email: 'alex@example.com' });
    createDuel.mockResolvedValue('duel-123');

    render(
      <MemoryRouter>
        <ConnectPartner />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email de tu pareja/i), { target: { value: 'alex@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /conectar/i }));

    await waitFor(() => {
      expect(createDuel).toHaveBeenCalledWith('comar-uid', 'alex-uid');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows an error when the partner email is not registered', async () => {
    findUserByEmail.mockResolvedValue(null);

    render(
      <MemoryRouter>
        <ConnectPartner />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email de tu pareja/i), { target: { value: 'nadie@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /conectar/i }));

    expect(await screen.findByText(/no encontramos ese email/i)).toBeInTheDocument();
    expect(createDuel).not.toHaveBeenCalled();
  });

  it('rejects connecting to your own email', async () => {
    render(
      <MemoryRouter>
        <ConnectPartner />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email de tu pareja/i), { target: { value: 'comar@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /conectar/i }));

    expect(await screen.findByText(/no puedes conectarte contigo mismo/i)).toBeInTheDocument();
    expect(findUserByEmail).not.toHaveBeenCalled();
  });
});
