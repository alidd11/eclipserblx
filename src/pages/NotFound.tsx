import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
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

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground hover:text-primary transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
