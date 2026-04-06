import { Link } from 'react-router-dom';
import { SITE_NAME } from '@/lib/constants';
import { useTranslation } from 'react-i18next';
import { useStoreDomain } from '@/hooks/useStoreDomain';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { Shield, Lock } from 'lucide-react';

export function Footer() {
  const { t } = useTranslation();
  const { discordUrl } = useDiscordUrl();
  const { isCustomStoreDomain, storeDomainData } = useStoreDomain();

  // Minimal footer for custom store domains — no Eclipse marketplace links
  if (isCustomStoreDomain) {
    const storeName = storeDomainData?.stores?.name || 'Store';
    return (
      <footer className="border-t border-border mt-auto" role="contentinfo" aria-label="Site footer">
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto flex flex-col gap-1">
          <p className="text-sm text-foreground/70">
            © {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
          <p className="text-sm text-foreground/70">
            Powered by{' '}
            <a
              href="https://eclipserblx.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Eclipse
            </a>
          </p>
        </div>
      </footer>
    );
  }

  const columns = [
    {
      heading: 'Shop',
      links: [
        { href: '/products', label: t('footer.allProducts') },
        { href: '/categories', label: t('footer.categories') },
        { href: '/featured', label: t('nav.featured') },
        { href: '/stores', label: 'Browse Stores' },
      ],
    },
    {
      heading: 'Popular Categories',
      links: [
        { href: '/products?category=civilian-vehicles', label: 'Civilian Vehicles' },
        { href: '/products?category=police-vehicles', label: 'Police Vehicles' },
        { href: '/products?category=marked-police-vehicles', label: 'Marked Police' },
        { href: '/products?category=unmarked-police-vehicles', label: 'Unmarked Police' },
        { href: '/products?category=scripts', label: 'Scripts' },
        { href: '/products?category=maps', label: 'Maps' },
      ],
    },
    {
      heading: 'Support',
      links: [
        { href: '/support', label: t('footer.helpCenter') },
        { href: '/contact', label: 'Contact Us' },
        { href: '/faq', label: t('footer.faq') },
        { href: '/status', label: 'System Status' },
        { href: '/jobs', label: 'Careers' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { href: '/terms', label: t('footer.termsOfService') },
        { href: '/refunds', label: t('footer.refundPolicy') },
        { href: '/privacy', label: t('footer.privacyPolicy') },
        { href: '/dmca', label: 'DMCA / IP Policy' },
      ],
    },
  ];

  return (
    <footer className="border-t border-border/40 mt-auto" role="contentinfo" aria-label="Site footer">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

        {/* Mobile: compact inline flow */}
        <div className="sm:hidden flex flex-col gap-2.5 mb-4">
          {columns.map((col) => (
            <div key={col.heading}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-foreground/45 mb-0.5">
                {col.heading}
              </p>
              <nav className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                {col.links.map((link, i) => (
                  <span key={link.href} className="flex items-center">
                    <Link
                      to={link.href}
                      className="text-[11px] text-foreground/55 hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                    {i < col.links.length - 1 && (
                      <span className="text-foreground/25 mx-0.5 text-[11px]">·</span>
                    )}
                  </span>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Desktop: 4-column vertical grid */}
        <div className="hidden sm:grid grid-cols-4 gap-8 mb-6">
          {columns.map((col) => (
            <div key={col.heading} className="flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/50 mb-1" id={`footer-${col.heading.toLowerCase()}`}>
                {col.heading}
              </p>
              <nav className="flex flex-col gap-1" aria-labelledby={`footer-${col.heading.toLowerCase()}`}>
                {col.links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-[12px] text-foreground/55 hover:text-foreground transition-colors leading-relaxed"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border/30 mb-3 sm:mb-4" />

        {/* Bottom bar — copyright + trust signals */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <p className="text-[11px] sm:text-[12px] text-foreground/50">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Social links */}
            <a href={discordUrl} target="_blank" rel="noopener noreferrer" aria-label="Discord" className="text-foreground/50 hover:text-foreground transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
            <a href="https://x.com/EclipseRblx" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="text-foreground/50 hover:text-foreground transition-colors">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <span className="h-3 w-px bg-border/40" />
            <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-foreground/50">
              <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              256-bit SSL
            </span>
            <span className="h-3 w-px bg-border/40" />
            <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-foreground/50">
              <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Payments by Stripe
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
