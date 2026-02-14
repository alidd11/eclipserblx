import { Link } from 'react-router-dom';
import { SITE_NAME } from '@/lib/constants';
import { useTranslation } from 'react-i18next';


export function Footer() {
  const { t } = useTranslation();

  const footerLinks = {
    shop: [
      { href: '/products', label: t('footer.allProducts') },
      { href: '/categories', label: t('footer.categories') },
      { href: '/featured', label: t('footer.featured') },
    ],
    support: [
      { href: '/support', label: t('footer.helpCenter') },
      { href: '/contact', label: t('footer.contactUs') },
      { href: '/faq', label: t('footer.faq') },
      { href: '/jobs', label: t('footer.jobs') },
    ],
    legal: [
      { href: '/terms', label: t('footer.termsOfService') },
      { href: '/refunds', label: t('footer.refundPolicy') },
      { href: '/privacy', label: t('footer.privacyPolicy') },
      { href: '/dmca', label: t('footer.dmcaPolicy') },
    ],
  };

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="grid grid-cols-3 md:grid-cols-3 gap-4 md:gap-8">
          <div>
            <h3 className="font-display text-sm font-semibold mb-2">{t('footer.shop')}</h3>
            <ul className="space-y-1">
              {footerLinks.shop.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold mb-2">{t('footer.support')}</h3>
            <ul className="space-y-1">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold mb-2">{t('footer.legal')}</h3>
            <ul className="space-y-1">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {SITE_NAME}. {t('common.allRightsReserved')}
            </p>
            <span className="hidden sm:inline text-muted-foreground">·</span>
            <p className="text-sm text-muted-foreground">{t('common.madeWithCare')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{t('common.securePayments')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
