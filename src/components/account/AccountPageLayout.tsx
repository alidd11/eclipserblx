import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';

interface AccountPageLayoutProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  children: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
}

export function AccountPageLayout({
  title,
  description,
  icon: Icon,
  children,
  actions,
  backTo = '/account',
  backLabel = 'Account',
}: AccountPageLayoutProps) {
  return (
    <MainLayout>
      <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-2xl space-y-5 box-border">
        {/* Back navigation */}
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors -mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="shrink-0 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{title}</h1>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Content */}
        {children}
      </div>
    </MainLayout>
  );
}
