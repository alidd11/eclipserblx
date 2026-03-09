import { Link } from 'react-router-dom';
import { SITE_NAME } from '@/lib/constants';
import { useTranslation } from 'react-i18next';
import { useStoreDomain } from '@/hooks/useStoreDomain';

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
      ],
    },
    {
      heading: 'Support',
      links: [
        { href: '/support', label: t('footer.helpCenter') },
        { href: '/contact', label: 'Contact Us' },
        { href: '/faq', label: t('footer.faq') },
        { href: '/jobs', label: t('nav.jobs') },
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
    <footer className="border-t border-border mt-auto min-h-[366px]" role="contentinfo" aria-label="Site footer">
      <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-3xl mx-auto">
        {/* 3-column link grid */}
        <div className="grid grid-cols-2 xs:grid-cols-3 gap-6 xs:gap-12 mb-10">
          {columns.map((col) => (
            <div key={col.heading} className="flex flex-col gap-4">
              <p className="text-sm font-bold text-foreground" id={`footer-${col.heading.toLowerCase()}`}>{col.heading}</p>
              <nav className="flex flex-col gap-3" aria-labelledby={`footer-${col.heading.toLowerCase()}`}>
                {col.links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-sm text-foreground/70 hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border mb-6" />

        {/* Bottom copyright */}
        <div className="flex flex-col gap-1">
          <p className="text-sm text-foreground/70">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p className="text-sm text-foreground/70">Made with care for the Roblox community</p>
          <p className="text-sm text-foreground/70">Secure payments powered by Stripe</p>
        </div>
      </div>
    </footer>
  );
}
