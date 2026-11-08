import { describe, it, expect } from 'vitest';
import {
  getLocalTimestamp,
  getLocalDateString,
  getLogicalDateString,
  getTimeSlot,
  getLogicalTimestampRange
} from '../../utils/time';

describe('Time Utils', () => {
  it('should get correct local timestamp string in China timezone', () => {
    const ts = getLocalTimestamp();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  it('should format date to local string correctly', () => {
    const ds = getLocalDateString('2024-01-01T00:00:00Z');
    expect(ds).toBe('2024-01-01');
  });

  describe('Logical Date and TimeSlot with 08:00:00 cutoff', () => {
    it('handles late night boundaries: <= 08:00:00 belongs to previous day', () => {
      expect(getLogicalDateString('2026-05-01T07:59:59')).toBe('2026-04-30');
      expect(getTimeSlot('2026-05-01T07:59:59')).toBe('lateNight');

      expect(getLogicalDateString('2026-05-01T08:00:00')).toBe('2026-04-30');
      expect(getTimeSlot('2026-05-01T08:00:00')).toBe('lateNight');

      expect(getLogicalDateString('2026-05-01T00:30:00')).toBe('2026-04-30');
      expect(getTimeSlot('2026-05-01T00:30:00')).toBe('lateNight');
    });

    it('handles morning boundaries: > 08:00:00 to <= 12:00:00 belongs to same day', () => {
      expect(getLogicalDateString('2026-05-01T08:00:01')).toBe('2026-05-01');
      expect(getTimeSlot('2026-05-01T08:00:01')).toBe('morning');

      expect(getLogicalDateString('2026-05-01T12:00:00')).toBe('2026-05-01');
      expect(getTimeSlot('2026-05-01T12:00:00')).toBe('morning');
    });

    it('handles afternoon boundaries: > 12:00:00 to <= 18:00:00', () => {
      expect(getLogicalDateString('2026-05-01T12:00:01')).toBe('2026-05-01');
      expect(getTimeSlot('2026-05-01T12:00:01')).toBe('afternoon');

      expect(getLogicalDateString('2026-05-01T18:00:00')).toBe('2026-05-01');
      expect(getTimeSlot('2026-05-01T18:00:00')).toBe('afternoon');
    });

    it('handles evening boundaries: > 18:00:00 to 23:59:59', () => {
      expect(getLogicalDateString('2026-05-01T18:00:01')).toBe('2026-05-01');
      expect(getTimeSlot('2026-05-01T18:00:01')).toBe('evening');

      expect(getLogicalDateString('2026-05-01T23:59:59')).toBe('2026-05-01');
      expect(getTimeSlot('2026-05-01T23:59:59')).toBe('evening');
    });

    it('computes correct timestamp range for logical date', () => {
      const range = getLogicalTimestampRange('2026-05-01', '2026-05-01');
      expect(range.startTimestamp).toBe('2026-05-01T08:00:01');
      expect(range.endTimestamp).toBe('2026-05-02T08:00:00');
    });
  });
});
