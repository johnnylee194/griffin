import { describe, it, expect } from 'vitest';
import { getLocalTimestamp, getLocalDateString } from '../../utils/time';

describe('Time Utils', () => {
  it('should get correct local timestamp string in China timezone', () => {
    const ts = getLocalTimestamp();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  it('should format date to local string correctly', () => {
    const ds = getLocalDateString('2024-01-01T00:00:00Z');
    expect(ds).toBe('2024-01-01');
  });
});
