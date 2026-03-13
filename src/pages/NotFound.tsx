import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, ShoppingBag, Store, HelpCircle, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";

const suggestedLinks = [
  { to: "/products", label: "Browse Products", icon: ShoppingBag },
  { to: "/stores", label: "All Stores", icon: Store },
  { to: "/faq", label: "FAQ", icon: HelpCircle },
  { to: "/contact", label: "Contact Us", icon: Briefcase },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  usePageMeta({ title: "Page Not Found" });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);

    // Tell search engines not to index this soft-404 page
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const existed = !!meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    meta.content = 'noindex';

    return () => {
      if (!existed && meta) meta.remove();
      else if (meta) meta.content = 'index, follow';
    };
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 safe-area-page">
      <PageTransition className="max-w-md w-full">
        {/* Rule */}
        <div className="w-12 h-0.5 bg-primary mb-8" />

        {/* Number */}
        <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-3">
          Error 404
        </p>

        <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground leading-none mb-4">
          Page not<br />found.
        </h1>

        <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-xs">
          The page at <code className="text-foreground bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{location.pathname}</code> doesn't exist or has been moved.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8" role="search" aria-label="Search products">
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm"
            aria-label="Search products"
          />
          <Button type="submit" size="sm" variant="secondary" className="h-9 px-3">
            <Search className="h-3.5 w-3.5" />
          </Button>
        </form>

        {/* Suggested links */}
        <div className="grid grid-cols-2 gap-2 mb-8">
          {suggestedLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <link.icon className="h-3.5 w-3.5 flex-shrink-0" />
              {link.label}
            </Link>
          ))}
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground hover:text-primary transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to home
        </Link>
      </PageTransition>
    </div>
  );
};

export default NotFound;
