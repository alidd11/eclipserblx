import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="container mx-auto px-4 py-24 md:py-32 relative">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Premium Roblox Assets</span>
          </div>

          {/* Heading */}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            Power Your Server{' '}
            <span className="gradient-text">With Eclipse</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional vehicle liveries, powerful scripts, stunning 3D models, and sleek UI kits. Everything you need to create an immersive roleplay experience.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/products">
              <Button size="lg" className="gradient-button border-0 text-lg px-8">
                Browse Products
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/categories">
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Categories
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="pt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div className="text-center">
              <div className="font-display text-3xl font-bold gradient-text">500+</div>
              <div className="text-sm text-muted-foreground">Products</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl font-bold gradient-text">10K+</div>
              <div className="text-sm text-muted-foreground">Downloads</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl font-bold gradient-text">99%</div>
              <div className="text-sm text-muted-foreground">Satisfaction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
