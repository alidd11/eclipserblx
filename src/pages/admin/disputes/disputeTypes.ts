export interface DisputeProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  customer_id: string | null;
}

export interface DisputeStore {
  id: string;
  name: string;
  store_id: string;
}

export interface EscrowInfo {
  order_id: string;
  escrow_hold_until: string | null;
  escrow_released_at: string | null;
  escrow_frozen: boolean;
}

export interface DisputeTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  category: string;
}

export interface RefundRequest {
  id: string;
  customer_id: string;
  store_id: string | null;
  order_id: string | null;
  status: string;
  created_at: string;
  reason: string | null;
  admin_response: string | null;
  seller_responded_at: string | null;
  escalated_at: string | null;
  admin_resolved_at: string | null;
  admin_resolved_by: string | null;
  amount: number | null;
  updated_at: string;
  dispute_number?: string;
  details?: string;
  seller_response?: string;
  escalation_reason?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evidence?: any[] | null;
}

export interface EnrichedDispute extends RefundRequest {
  customer: DisputeProfile | null;
  store: DisputeStore | null;
  escrow: EscrowInfo | null;
  linkedTicket: DisputeTicket | null;
}
