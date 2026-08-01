import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDuelWorkouts } from './useDuelWorkouts';
import { subscribeToDuelWorkouts } from '../firebase/workouts';

vi.mock('../firebase/workouts');

describe('useDuelWorkouts', () => {
  const unsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    subscribeToDuelWorkouts.mockReturnValue(unsubscribe);
  });

  it('subscribes once and exposes both participants workouts', () => {
    let onData;
    subscribeToDuelWorkouts.mockImplementation((_duelId, next) => {
      onData = next;
      return unsubscribe;
    });

    const { result, unmount } = renderHook(() => useDuelWorkouts('duel-1'));
    expect(subscribeToDuelWorkouts).toHaveBeenCalledOnce();

    act(() => onData([
      { workoutId: 'a1', userId: 'a' },
      { workoutId: 'b1', userId: 'b' },
    ]));

    expect(result.current).toMatchObject({ loading: false, error: null });
    expect(result.current.workouts).toHaveLength(2);
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('does not subscribe without a duel id', () => {
    const { result } = renderHook(() => useDuelWorkouts(null));
    expect(subscribeToDuelWorkouts).not.toHaveBeenCalled();
    expect(result.current).toEqual({ workouts: [], loading: false, error: null });
  });

  it('exposes listener failures', () => {
    let onError;
    subscribeToDuelWorkouts.mockImplementation((_duelId, _next, fail) => {
      onError = fail;
      return unsubscribe;
    });
    const failure = new Error('offline');
    const { result } = renderHook(() => useDuelWorkouts('duel-1'));

    act(() => onError(failure));

    expect(result.current).toMatchObject({ loading: false, error: failure });
  });
});
