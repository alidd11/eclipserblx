import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminStatCard } from '@/components/admin/AdminStatCard';

vi.mock('@/components/ui/card', () => ({
 Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
}));

describe('AdminStatCard', () => {
 it('renders label and value', () => {
 render(<AdminStatCard label="Total Orders" value={42} />);
 expect(screen.getByText('Total Orders')).toBeInTheDocument();
 expect(screen.getByText('42')).toBeInTheDocument();
 });

 it('renders subtitle when provided', () => {
 render(<AdminStatCard label="Revenue" value="£1,200" subtitle="Last 30 days" />);
 expect(screen.getByText('Last 30 days')).toBeInTheDocument();
 });

 it('does not render subtitle when not provided', () => {
 render(<AdminStatCard label="Users" value={100} />);
 expect(screen.queryByText('Last 30 days')).not.toBeInTheDocument();
 });

 it('applies value color class', () => {
 render(<AdminStatCard label="Active" value={5} valueColor="green" />);
 const valueEl = screen.getByText('5');
 expect(valueEl.className).toContain('text-green-500');
 });

 it('applies default color when no valueColor specified', () => {
 render(<AdminStatCard label="Count" value={10} />);
 const valueEl = screen.getByText('10');
 expect(valueEl.className).toContain('text-foreground');
 });
});
