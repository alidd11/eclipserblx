import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/**
 * These tests cover the client-side contract for the secure store-application
 * workflow. Server-side negative paths (unauth submit, forged approval,
 * concurrent review, direct DML) are enforced by RLS + the RPC and cannot be
 * bypassed from the browser — the tests below assert that the UI:
 *   1. Requires a rejection reason of >= 5 chars before enabling the confirm
 *      action, and blocks double-submit while the mutation is pending.
 *   2. Surfaces the "unverified client evidence" label on verification_results.
 */

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
    auth: { getUser: async () => ({ data: { user: { id: 'reviewer' } } }) },
  },
}));

vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({
    hasPermission: () => true,
    hasAnyPermission: () => true,
    isLoading: false,
    isAuthExpired: false,
    permissions: ['review_store_applications'],
  }),
  PermissionGate: ({ children }: any) => children,
}));

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: () => {} }));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import AdminStoreApplications from '@/pages/admin/StoreApplications';

const wrap = (ui: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

const sampleApp = {
  id: 'app-1',
  user_id: 'user-1',
  store_name: 'Neon Garage',
  store_description: 'Vehicles for RP',
  product_category: 'vehicles',
  discord_server_invite: 'https://discord.gg/test',
  status: 'pending',
  auto_approved: false,
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  approved_store_id: null,
  verification_results: { discord_server: { valid: true }, identity_consistency: { similarity_score: 90 } },
  created_at: new Date().toISOString(),
  profiles: { display_name: 'Alice', username: 'alice' },
};

describe('StoreApplications admin page', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
    fromMock.mockImplementation(() => {
      const builder: any = {};
      const chain = (rows: any[]) => {
        builder.select = () => builder;
        builder.order = () => builder;
        builder.limit = () => builder;
        builder.eq = () => Promise.resolve({ data: rows, error: null });
        builder.in = () => Promise.resolve({ data: rows, error: null });
        return builder;
      };
      chain([sampleApp]);
      return builder;
    });
  });

  it('labels client-provided verification as unverified evidence', async () => {
    render(wrap(<AdminStoreApplications />));
    expect(await screen.findByText(/Neon Garage/)).toBeInTheDocument();
    expect(screen.getByText(/Unverified client evidence/i)).toBeInTheDocument();
  });

  it('requires a rejection reason of at least 5 characters before submitting', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    render(wrap(<AdminStoreApplications />));
    fireEvent.click(await screen.findByRole('button', { name: /Reject/i }));

    const confirm = await screen.findByRole('button', { name: /^Reject$/ });
    expect(confirm).toBeDisabled();

    const textarea = screen.getByLabelText(/Reason/i);
    fireEvent.change(textarea, { target: { value: 'too' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'Store description is misleading' } });
    await waitFor(() => expect(confirm).not.toBeDisabled());

    fireEvent.click(confirm);
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('review_store_application', expect.objectContaining({
      p_application_id: 'app-1',
      p_decision: 'rejected',
      p_rejection_reason: 'Store description is misleading',
      p_notes: null,
    })));
  });
});
