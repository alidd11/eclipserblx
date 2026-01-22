import { Link } from 'react-router-dom';
import { SITE_NAME } from '@/lib/constants';

const footerLinks = {
  shop: [
    { href: '/products', label: 'All Products' },
    { href: '/categories', label: 'Categories' },
    { href: '/products?featured=true', label: 'Featured' },
  ],
  support: [
    { href: '/support', label: 'Help Center' },
    { href: '/contact', label: 'Contact Us' },
    { href: '/faq', label: 'FAQ' },
    { href: '/jobs', label: 'Jobs' },
  ],
  legal: [
    { href: '/terms', label: 'Terms of Service' },
    { href: '/refunds', label: 'Refund Policy' },
    { href: '/privacy', label: 'Privacy Policy' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="grid grid-cols-3 md:grid-cols-3 gap-4 md:gap-8">

          {/* Shop Links */}
          <div>
            <h3 className="font-display text-sm font-semibold mb-2">Shop</h3>
            <ul className="space-y-1">
              {footerLinks.shop.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-display text-sm font-semibold mb-2">Support</h3>
            <ul className="space-y-1">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-display text-sm font-semibold mb-2">Legal</h3>
            <ul className="space-y-1">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
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
              © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
            </p>
            <span className="hidden sm:inline text-muted-foreground">·</span>
            <p className="text-sm text-muted-foreground">Made with care for the Roblox community</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Secure payments powered by Stripe
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
