import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SectionError from '@/components/common/SectionError';

describe('SectionError', () => {
  it('shows the given message and calls onRetry when clicked', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(<SectionError message="Couldn't load packages right now." onRetry={onRetry} />);

    expect(screen.getByText("Couldn't load packages right now.")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders without a retry button when onRetry is not given', () => {
    render(<SectionError message="Nothing to retry here." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
