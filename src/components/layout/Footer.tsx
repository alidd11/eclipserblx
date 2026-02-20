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
    <footer className="border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-10">
        {/* 3-column link grid */}
        <div className="grid grid-cols-3 gap-8 mb-10">
          {columns.map((col) => (
            <div key={col.heading} className="flex flex-col gap-4">
              <p className="text-sm font-bold text-foreground">{col.heading}</p>
              <nav className="flex flex-col gap-3">
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
        <div className="flex flex-col items-center gap-1 text-center">
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
