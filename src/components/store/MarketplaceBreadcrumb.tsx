import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface MarketplaceBreadcrumbProps {
  storeName: string;
  storeSlug: string;
  categoryName?: string | null;
  accentColor?: string;
  compact?: boolean;
}

export function MarketplaceBreadcrumb({ 
  storeName, 
  storeSlug, 
  categoryName,
  accentColor = '#8b5cf6',
  compact = false,
}: MarketplaceBreadcrumbProps) {
  if (compact) {
    return (
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">
          Eclipse
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/" className="hover:text-foreground transition-colors">
          Stores
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link 
          to={`/store/${storeSlug}`} 
          className="hover:text-foreground transition-colors"
          style={{ color: accentColor }}
        >
          {storeName}
        </Link>
        {categoryName && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{categoryName}</span>
          </>
        )}
      </nav>
    );
  }

  return (
    <div 
      className="border-b px-3 xs:px-4 sm:px-6 py-2"
      style={{ borderColor: `${accentColor}15` }}
    >
      <Breadcrumb>
        <BreadcrumbList className="text-xs sm:text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link 
                to="/" 
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Eclipse</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          <BreadcrumbSeparator>
            <ChevronRight className="h-3.5 w-3.5" />
          </BreadcrumbSeparator>
          
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link 
                to="/" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Stores
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          <BreadcrumbSeparator>
            <ChevronRight className="h-3.5 w-3.5" />
          </BreadcrumbSeparator>
          
          {categoryName ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link 
                    to={`/store/${storeSlug}`} 
                    className="hover:text-foreground transition-colors"
                    style={{ color: accentColor }}
                  >
                    {storeName}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
              
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">{categoryName}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <BreadcrumbItem>
              <BreadcrumbPage 
                className="font-medium"
                style={{ color: accentColor }}
              >
                {storeName}
              </BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
