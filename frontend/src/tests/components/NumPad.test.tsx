import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NumPad from '../../components/NumPad';

describe('NumPad', () => {
  it('should render correctly and respond to clicks', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<NumPad onSubmit={onSubmit} onClose={onClose} />);

    const btn1 = screen.getByText('1');
    fireEvent.click(btn1);

    const confirmBtn = screen.getByText('确定');
    fireEvent.click(confirmBtn);

    expect(onSubmit).toHaveBeenCalledWith(1);
  });
});
