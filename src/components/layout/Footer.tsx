import { Link } from 'react-router-dom';
import { SITE_NAME } from '@/lib/constants';
import { useTranslation } from 'react-i18next';
import { EclipseLogo } from '@/components/ui/EclipseLogo';

export function Footer() {
  const { t } = useTranslation();

  const columns = [
    {
      heading: 'Shop',
      links: [
        { href: '/products', label: t('footer.allProducts') },
        { href: '/categories', label: t('footer.categories') },
        { href: '/featured', label: t('nav.featured') },
        { href: '/eclipse-plus', label: t('nav.eclipsePlus') },
      ],
    },
    {
      heading: 'Company',
      links: [
        { href: '/jobs', label: t('nav.jobs') },
        { href: '/affiliate', label: 'Affiliates' },
        { href: '/support', label: t('footer.helpCenter') },
        { href: '/faq', label: t('footer.faq') },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { href: '/terms', label: t('footer.termsOfService') },
        { href: '/privacy', label: t('footer.privacyPolicy') },
        { href: '/refunds', label: t('footer.refundPolicy') },
        { href: '/status', label: t('nav.systemStatus') },
      ],
    },
  ];

  return (
    <footer className="border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Brand col */}
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <EclipseLogo size="sm" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {SITE_NAME}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px]">
              The home for Roblox roleplay assets, bots, and more.
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-auto">
              © {new Date().getFullYear()} {SITE_NAME}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                {col.heading}
              </p>
              <nav className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
