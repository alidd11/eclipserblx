import { Link } from 'react-router-dom';
import { Car, Code, Box, Layout, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
  {
    name: 'Vehicle Liveries',
    slug: 'vehicle-liveries',
    description: 'Professional police, ambulance, and emergency vehicle wraps',
    icon: Car,
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    name: 'Scripts & Systems',
    slug: 'scripts-systems',
    description: 'Powerful MDT, CAD, and roleplay management systems',
    icon: Code,
    gradient: 'from-purple-500 to-pink-400',
  },
  {
    name: '3D Models',
    slug: '3d-models',
    description: 'High-quality props, buildings, and environment assets',
    icon: Box,
    gradient: 'from-orange-500 to-yellow-400',
  },
  {
    name: 'UI Kits',
    slug: 'ui-kits',
    description: 'Sleek interfaces for HUDs, menus, and dashboards',
    icon: Layout,
    gradient: 'from-green-500 to-emerald-400',
  },
];

export function CategoryShowcase() {
  return (
    <section className="py-20 bg-card/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Browse by Category
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Find exactly what you need for your roleplay server from our curated categories
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link
              key={category.slug}
              to={`/categories/${category.slug}`}
              className="group"
            >
              <div className="gaming-card-hover p-6 h-full flex flex-col">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br",
                  category.gradient
                )}>
                  <category.icon className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="font-display text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                
                <p className="text-sm text-muted-foreground flex-1">
                  {category.description}
                </p>
                
                <div className="mt-4 flex items-center text-sm text-primary font-medium">
                  Browse Category
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
