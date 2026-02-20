import { Link } from 'react-router-dom';
import { SITE_NAME } from '@/lib/constants';
import { useTranslation } from 'react-i18next';
import { EclipseLogo } from '@/components/ui/EclipseLogo';

export function Footer() {
  const { t } = useTranslation();

  const links = [
    { href: '/products', label: t('footer.allProducts') },
    { href: '/categories', label: t('footer.categories') },
    { href: '/support', label: t('footer.helpCenter') },
    { href: '/faq', label: t('footer.faq') },
    { href: '/terms', label: t('footer.termsOfService') },
    { href: '/privacy', label: t('footer.privacyPolicy') },
    { href: '/refunds', label: t('footer.refundPolicy') },
  ];

  return (
    <footer className="border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <EclipseLogo size="sm" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {SITE_NAME}
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-wrap gap-x-4 gap-y-1.5">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-[11px] text-muted-foreground shrink-0">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
