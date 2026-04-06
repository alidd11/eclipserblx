import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/shared/dashboard/StatCard';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
}));

describe('StatCard (shared)', () => {
  it('renders via re-exported AdminStatCard', () => {
    render(<StatCard label="Total" value={100} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
