import { MainLayout } from '@/components/layout/MainLayout';
import { usePageMeta } from '@/hooks/usePageMeta';

const sections = [
  {
    title: 'Infrastructure',
    items: [
      'All data is encrypted at rest using AES-256 and in transit via TLS 1.3.',
      'Our backend infrastructure runs on enterprise-grade cloud providers with automatic failover and 99.9% uptime SLA.',
      'Edge functions execute in isolated environments with no shared state between tenants.',
    ],
  },
  {
    title: 'Authentication & Access Control',
    items: [
      'User passwords are hashed using bcrypt with per-user salts — we never store plaintext credentials.',
      'Row-Level Security (RLS) policies enforce data isolation at the database level, ensuring users can only access their own data.',
      'Staff access is governed by a granular permission system with scoped roles, preventing privilege escalation.',
      'Sensitive financial data (bank details, API tokens) is masked via security-invoker views — full values are never exposed to client applications.',
    ],
  },
  {
    title: 'Payment Security',
    items: [
      'All payments are processed through Stripe, a PCI DSS Level 1 certified provider.',
      'We never store card numbers, CVVs, or full bank account details on our servers.',
      'Payout processing uses service-role access with masked views for staff oversight.',
    ],
  },
  {
    title: 'Data Protection & Privacy',
    items: [
      'We comply with the UK Data Protection Act 2018 and GDPR.',
      'Users can request a full data export at any time via their account settings.',
      'Cookie consent is managed with granular opt-in controls for analytics and marketing.',
      'Financial records are retained for 6 years per HMRC guidelines, after which they are securely purged.',
    ],
  },
  {
    title: 'Application Security',
    items: [
      'Security headers (CSP, X-Content-Type-Options, X-Frame-Options, Permissions-Policy) are enforced on all routes.',
      'All user-generated content is sanitised using DOMPurify before rendering.',
      'Rate limiting is applied across all API endpoints to mitigate abuse and DDoS attacks.',
      'Storage uploads enforce path-ownership policies, preventing users from writing to other users\' directories.',
    ],
  },
  {
    title: 'Asset Protection',
    items: [
      'All digital downloads are fingerprinted with traceable identifiers for leak detection.',
      'Download links are one-time-use tokens bound to the requester\'s IP address.',
      'Sellers have access to a leak detection tool that can identify the source of leaked files.',
    ],
  },
  {
    title: 'Vulnerability Disclosure',
    items: [
      'If you discover a security vulnerability, please report it responsibly to security@eclipserblx.com.',
      'We investigate all reports within 48 hours and aim to resolve critical issues within 7 days.',
      'We do not pursue legal action against researchers who act in good faith.',
    ],
  },
];

export default function Security() {
  usePageMeta({
    title: 'Security — Eclipse',
    description: 'Learn how Eclipse protects your data, payments, and digital assets with enterprise-grade security.',
    canonicalPath: '/security',
  });

  return (
    <MainLayout>
      <div className="container max-w-4xl py-12 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security</h1>
          <p className="mt-2 text-muted-foreground">
            Protecting your data, payments, and digital assets is fundamental to how we operate. This page outlines the measures we take to keep the platform secure.
          </p>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-4 border-l-2 border-border">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="border-t border-border pt-6 text-xs text-muted-foreground">
          Last updated: April 2026
        </div>
      </div>
    </MainLayout>
  );
}
