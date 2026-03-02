import { Link } from 'react-router-dom';
import { SITE_NAME } from '@/lib/constants';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

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
    <footer className="border-t border-border mt-auto min-h-[280px]" role="contentinfo" aria-label="Site footer">
      <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-3xl mx-auto">
        {/* 3-column link grid */}
        <div className="grid grid-cols-3 gap-12 mb-10">
          {columns.map((col) => (
            <div key={col.heading} className="flex flex-col gap-4">
              <p className="text-sm font-bold text-foreground" id={`footer-${col.heading.toLowerCase()}`}>{col.heading}</p>
              <nav className="flex flex-col gap-3" aria-labelledby={`footer-${col.heading.toLowerCase()}`}>
                {col.links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">Made with care for the Roblox community</p>
          <p className="text-sm text-muted-foreground">Secure payments powered by Stripe</p>
        </div>
      </div>
    </footer>
  );
}
