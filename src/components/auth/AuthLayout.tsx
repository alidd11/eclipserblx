import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EclipseLogo } from '@/components/ui/EclipseLogo';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthLayout = forwardRef<HTMLDivElement, AuthLayoutProps>(function AuthLayout({ title, description, children, footer }, ref) {
  const { t } = useTranslation();

  return (
    <div ref={ref} className="min-h-screen bg-background overflow-y-auto relative">
      {/* Subtle background depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.04)_0%,transparent_60%)]" />

      {/* Back link — fixed top-left */}
      <div className="relative z-10 px-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link
          to="/"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          {t('common.backToStore')}
        </Link>
      </div>

      <div className="relative z-10 min-h-[calc(100vh-2.5rem)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px] space-y-6">
          {/* Brand lockup */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center mb-1">
              <EclipseLogo size="xl" className="rounded-xl" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-[320px] mx-auto">{description}</p>
          </div>

          {children}

          {footer && (
            <div className="pb-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
