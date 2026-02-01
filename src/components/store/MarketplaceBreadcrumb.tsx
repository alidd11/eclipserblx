import { Link } from 'react-router-dom';
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
}

export function MarketplaceBreadcrumb({ 
  storeName, 
  storeSlug, 
  categoryName,
  accentColor = '#8b5cf6'
}: MarketplaceBreadcrumbProps) {
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
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Eclipse
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          <BreadcrumbSeparator />
          
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link 
                to="/marketplace" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Stores
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          <BreadcrumbSeparator />
          
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
              
              <BreadcrumbSeparator />
              
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
