import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserProfile } from './useUserProfile';
import { useAuth } from '../contexts/AuthContext';
import { getUserDocument } from '../firebase/firestore';

vi.mock('../contexts/AuthContext');
vi.mock('../firebase/firestore');

describe('useUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ currentUser: { uid: 'aaron' } });
  });

  it('loads the authenticated user profile', async () => {
    getUserDocument.mockResolvedValue({ uid: 'aaron', displayName: 'Aaron' });
    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual({ uid: 'aaron', displayName: 'Aaron' });
    expect(result.current.error).toBeNull();
  });

  it('exposes profile loading failures', async () => {
    const failure = new Error('offline');
    getUserDocument.mockRejectedValue(failure);
    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(failure);
  });

  it('refreshes the profile after a save', async () => {
    getUserDocument
      .mockResolvedValueOnce({ uid: 'aaron', displayName: 'Antes' })
      .mockResolvedValueOnce({ uid: 'aaron', displayName: 'Después' });
    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.profile?.displayName).toBe('Antes'));

    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.profile?.displayName).toBe('Después'));
  });
});
