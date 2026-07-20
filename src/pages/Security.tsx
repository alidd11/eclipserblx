import { MainLayout } from '@/components/layout/MainLayout';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  ShieldCheck,
  Lock,
  CreditCard,
  Database,
  Server,
  FileLock2,
  Bug,
  KeyRound,
} from 'lucide-react';

interface Pillar {
  id: string;
  icon: React.ElementType;
  title: string;
  intro: string;
  items: string[];
}

const pillars: Pillar[] = [
  {
    id: 'infrastructure',
    icon: Server,
    title: 'Infrastructure',
    intro: 'The foundation everything else sits on.',
    items: [
      'All data encrypted at rest with AES-256 and in transit via TLS 1.3.',
      'Enterprise-grade cloud with automatic failover and 99.9% uptime SLA.',
      'Edge functions execute in isolated environments with no shared tenant state.',
    ],
  },
  {
    id: 'access',
    icon: KeyRound,
    title: 'Authentication & Access Control',
    intro: 'Zero-trust by default — every row, every route.',
    items: [
      'Passwords hashed with bcrypt and per-user salts — plaintext credentials are never stored.',
      'Row-Level Security enforces data isolation at the database layer.',
      'Staff access is scoped via a granular permission system — no blanket privilege.',
      'Sensitive financial data is masked via security-invoker views, never exposed to the client.',
    ],
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Payment Security',
    intro: 'Card data never touches our servers.',
    items: [
      'Payments processed through Stripe, PCI DSS Level 1 certified.',
      'Card numbers, CVVs, and full bank details are never stored on Eclipse.',
      'Payout processing uses service-role access with masked views for staff oversight.',
    ],
  },
  {
    id: 'privacy',
    icon: Database,
    title: 'Data Protection & Privacy',
    intro: 'UK Data Protection Act 2018 and GDPR compliant.',
    items: [
      'Users can request a full data export at any time from account settings.',
      'Granular opt-in cookie controls for analytics and marketing.',
      'Financial records retained for 6 years per HMRC guidelines, then securely purged.',
    ],
  },
  {
    id: 'application',
    icon: Lock,
    title: 'Application Security',
    intro: 'Hardened at the browser boundary.',
    items: [
      'Strict security headers on every route: CSP, X-Content-Type-Options, X-Frame-Options, Permissions-Policy.',
      'User-generated content is sanitised with DOMPurify before render.',
      'Rate limiting on all API endpoints mitigates abuse and DDoS.',
      "Storage uploads enforce path-ownership — users can't write to other users' directories.",
    ],
  },
  {
    id: 'assets',
    icon: FileLock2,
    title: 'Asset Protection',
    intro: 'Every download is traceable.',
    items: [
      'Digital downloads carry traceable fingerprints for leak detection.',
      "Download links are one-time-use tokens bound to the requester's IP.",
      'Sellers can trace leaked files back to source via the leak detection tool.',
    ],
  },
];

export default function Security() {
  usePageMeta({
    title: 'Security — Eclipse',
    description: 'How Eclipse protects your data, payments, and digital assets with enterprise-grade security.',
    canonicalPath: '/security',
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10 md:py-16 max-w-5xl">
        {/* Hero */}
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-10 items-end mb-12 pb-10 border-b border-border">
          <div>
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="h-10 w-10 rounded-xl bg-foreground text-background flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Security & Trust
              </span>
            </div>
            <h1 className="font-display font-bold text-4xl md:text-5xl leading-[1.05] tracking-tight text-foreground">
              Built to be trusted, not just used.
            </h1>
            <p className="mt-5 text-muted-foreground text-base md:text-lg max-w-lg leading-relaxed">
              Protecting your data, payments, and digital assets is fundamental to how we operate.
              Six pillars. No shortcuts.
            </p>
          </div>

          {/* Certification/trust chips */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'PCI DSS', sub: 'Level 1 via Stripe' },
              { label: 'GDPR', sub: 'UK DPA 2018' },
              { label: 'TLS 1.3', sub: 'End-to-end' },
              { label: 'AES-256', sub: 'At rest' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pillars — editorial two-column with numbered markers */}
        <div className="space-y-10 md:space-y-14">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <section id={p.id} key={p.id} className="grid md:grid-cols-[220px_1fr] gap-6 md:gap-10 scroll-mt-24">
                <div className="md:sticky md:top-24 md:self-start">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                  </div>
                  <h2 className="font-display text-xl font-semibold text-foreground leading-tight">
                    {p.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {p.intro}
                  </p>
                </div>

                <ul className="space-y-3">
                  {p.items.map((item, idx) => (
                    <li
                      key={idx}
                      className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-foreground/90 leading-relaxed"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* Vulnerability disclosure — special treatment */}
        <div className="mt-16 rounded-2xl border border-border bg-muted/30 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
              <Bug className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                Found a vulnerability?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-2xl">
                Report it responsibly. We investigate every report within 48 hours and aim to resolve
                critical issues within 7 days. We do not pursue legal action against researchers acting in good faith.
              </p>
              <a
                href="mailto:security@eclipserblx.com"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
              >
                security@eclipserblx.com
              </a>
            </div>
          </div>
        </div>

        <p className="mt-10 text-xs text-muted-foreground text-center">
          Last updated: April 2026
        </p>
      </div>
    </MainLayout>
  );
}
