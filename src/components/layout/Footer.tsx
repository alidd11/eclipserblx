import { Link } from 'react-router-dom';
import { SITE_NAME } from '@/lib/constants';
import { useTranslation } from 'react-i18next';
import { useStoreDomain } from '@/hooks/useStoreDomain';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { Shield, Lock } from 'lucide-react';

export function Footer() {
  const { t } = useTranslation();
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
