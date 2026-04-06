import type { ComponentType } from 'npm:react@18.3.1'

export interface TemplateEntry<P = Record<string, unknown>> {
  component: ComponentType<P>
  subject: string | ((props: P) => string)
  displayName?: string
  previewData?: P
  to?: string | ((props: P) => string)
}

// deno-lint-ignore no-explicit-any
export const TEMPLATES: Record<string, TemplateEntry<any>> = {}

// ── Register templates ────────────────────────────────────────────
import { template as ticketReply } from './ticket-reply.tsx'
TEMPLATES['ticket-reply'] = ticketReply
