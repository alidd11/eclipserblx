import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'

interface TicketReplyProps {
  ticketNumber?: string
  subject?: string
  staffMessage?: string
  ticketUrl?: string
}

function TicketReplyEmail({
  ticketNumber = 'TKT-000001',
  subject = 'Your support request',
  staffMessage = 'We have an update on your ticket.',
  ticketUrl = 'https://roleplay-hub-shop.lovable.app/support',
}: TicketReplyProps) {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#ffffff', padding: '40px 20px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center' as const, marginBottom: '32px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111', margin: 0 }}>Eclipse</h1>
        </div>

        {/* Body */}
        <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 8px' }}>
            Hi there,
          </p>
          <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }}>
            A member of our support team has replied to your ticket <strong>{ticketNumber}</strong> regarding &ldquo;{subject}&rdquo;.
          </p>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#111', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' as const }}>
              {staffMessage}
            </p>
          </div>

          <div style={{ textAlign: 'center' as const }}>
            <a
              href={ticketUrl}
              style={{
                display: 'inline-block',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
              }}
            >
              View Ticket
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center' as const, fontSize: '11px', color: '#9ca3af', lineHeight: '1.5' }}>
          <p style={{ margin: '0 0 4px' }}>This email was sent by Eclipse Support.</p>
          <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} Eclipse. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export const template: TemplateEntry<TicketReplyProps> = {
  component: TicketReplyEmail,
  subject: (props) => `Re: ${props.subject || 'Your support ticket'} [${props.ticketNumber || ''}]`,
  displayName: 'Ticket Reply Notification',
  previewData: {
    ticketNumber: 'TKT-000042',
    subject: 'Cannot download my product',
    staffMessage: 'Hi! I\'ve checked your order and the download link has been refreshed. Please try again from your orders page. Let me know if it works!',
    ticketUrl: 'https://roleplay-hub-shop.lovable.app/support/tickets/example',
  },
}
