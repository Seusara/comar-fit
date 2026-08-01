import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';
import { deleteUser } from 'firebase/auth';
import { registerUser } from '../firebase/auth';
import { createUserDocument } from '../firebase/firestore';

vi.mock('../firebase/auth');
vi.mock('../firebase/firestore');
// Register.jsx calls the SDK's deleteUser directly, so mock the SDK module
// itself. Spread the original so ../firebase/config can still call getAuth.
vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, deleteUser: vi.fn() };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a new user and navigates to /connect-partner', async () => {
    registerUser.mockResolvedValue({ user: { uid: 'uid-123' } });
    createUserDocument.mockResolvedValue();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Comar' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'comar@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText(/género/i), { target: { value: 'M' } });
    fireEvent.change(screen.getByLabelText(/edad/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText(/altura/i), { target: { value: '178' } });
    fireEvent.change(screen.getByLabelText(/nivel de experiencia/i), { target: { value: 'Intermediate' } });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith('comar@example.com', 'secret123');
      expect(createUserDocument).toHaveBeenCalledWith('uid-123', {
        email: 'comar@example.com',
        displayName: 'Comar',
        gender: 'M',
        age: 30,
        weight: 75,
        height: 178,
        experienceLevel: 'Intermediate',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/connect-partner');
    });
  });

  it('shows an error message when registration fails', async () => {
    registerUser.mockRejectedValue(new Error('email already in use'));

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Comar' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'comar@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText(/edad/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText(/altura/i), { target: { value: '178' } });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText(/no pudimos crear tu cuenta/i)).toBeInTheDocument();
    // The auth account was never created, so there is nothing to roll back.
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('normalizes the email before creating the auth account and the user document', async () => {
    registerUser.mockResolvedValue({ user: { uid: 'uid-123' } });
    createUserDocument.mockResolvedValue();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Comar' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: '  COMAR@Example.COM  ' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText(/edad/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText(/altura/i), { target: { value: '178' } });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith('comar@example.com', 'secret123');
      expect(createUserDocument).toHaveBeenCalledWith(
        'uid-123',
        expect.objectContaining({ email: 'comar@example.com' })
      );
    });
  });

  it('deletes the just-created auth account when the user document fails to save', async () => {
    registerUser.mockResolvedValue({ user: { uid: 'uid-123' } });
    createUserDocument.mockRejectedValue(new Error('permission denied'));
    deleteUser.mockResolvedValue();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Comar' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'comar@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText(/edad/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText(/altura/i), { target: { value: '178' } });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText(/no pudimos crear tu cuenta/i)).toBeInTheDocument();
    // The orphaned auth account is rolled back rather than left unusable.
    expect(deleteUser).toHaveBeenCalledWith({ uid: 'uid-123' });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
