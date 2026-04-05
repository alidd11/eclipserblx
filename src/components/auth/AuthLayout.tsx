import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthLayout = forwardRef<HTMLDivElement, AuthLayoutProps>(function AuthLayout({ title, description, children, footer }, ref) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 sm:py-10 relative">
        <div className="w-full max-w-[420px] space-y-4">
          <Link
            to="/"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            {t('common.backToStore')}
          </Link>

          <div className="text-center space-y-1.5">
            <div className="inline-flex h-10 w-10 rounded-xl bg-primary/10 items-center justify-center mb-2">
              <span className="text-primary font-display font-bold text-sm">E</span>
            </div>
            <h1 className="font-display text-xl font-bold">{title}</h1>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>

          {children}

          {footer}
        </div>
      </div>
    </div>
  );
});
