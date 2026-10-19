import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LocationSelect from '../../components/LocationSelect';

describe('LocationSelect', () => {
  it('should open and select a location correctly', () => {
    const onChange = vi.fn();
    const locations = [
      { id: '1', name: 'Location A', lastVisitAt: new Date().toISOString(), recentVisitCount: 1 }
    ];
    render(<LocationSelect locations={locations as any} value="" onChange={onChange} />);

    const btn = screen.getByText('📍 选择地点');
    fireEvent.click(btn);

    const option = screen.getByText('Location A');
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith('1');
  });
});
