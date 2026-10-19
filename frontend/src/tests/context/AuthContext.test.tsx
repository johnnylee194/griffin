import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

vi.mock('../../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn().mockRejectedValue(new Error('no token')), // default unauth
    defaults: {
      headers: {
        common: {}
      }
    }
  },
  playersApi: { getAll: vi.fn().mockResolvedValue({ data: [{ id: 'p1', isMe: 1 }] }) },
  locationsApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) },
  gameTypesApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) },
  chipRatesApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) }
}));

describe('AuthContext', () => {
  it('should handle login and logout state', async () => {
    (apiClient.post as any).mockResolvedValue({ data: { token: 'test-token', user: { id: 'u1', username: 'u' } } });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
        expect(result.current).not.toBeUndefined();
    });

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login('user', 'pass');
    });

    expect(localStorage.getItem('token')).toBe('test-token');

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem('token')).toBeNull();
  });
});
