import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
}));
vi.mock('../firebase/config', () => ({
  auth: {},
}));

function Consumer() {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return <p>loading</p>;
  return <p>{currentUser ? currentUser.uid : 'no-user'}</p>;
}

describe('AuthContext', () => {
  it('provides the authenticated user once Firebase reports one', async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: 'uid-123' });
      return () => {};
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('uid-123')).toBeInTheDocument();
    });
  });

  it('provides null when no user is signed in', async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return () => {};
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('no-user')).toBeInTheDocument();
    });
  });
});
