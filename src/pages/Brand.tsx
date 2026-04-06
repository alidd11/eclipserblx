import { MainLayout } from '@/components/layout/MainLayout';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const colors = [
  { name: 'Primary', value: 'hsl(var(--primary))', token: '--primary' },
  { name: 'Background', value: 'hsl(var(--background))', token: '--background' },
  { name: 'Foreground', value: 'hsl(var(--foreground))', token: '--foreground' },
  { name: 'Muted', value: 'hsl(var(--muted))', token: '--muted' },
  { name: 'Accent', value: 'hsl(var(--accent))', token: '--accent' },
  { name: 'Destructive', value: 'hsl(var(--destructive))', token: '--destructive' },
];

const guidelines = [
  { title: 'Logo Usage', text: 'Always use the official Eclipse wordmark. Do not stretch, rotate, or alter the proportions. Maintain a minimum clear space equal to the height of the "E" around all sides.' },
  { title: 'Colour Palette', text: 'Use the primary purple for CTAs and key interactions. Reserve destructive red for errors and warnings only. Dark backgrounds should use the background token, not arbitrary hex values.' },
  { title: 'Typography', text: 'We use a system font stack for body text to maximise performance and readability. Display headings use bold weight with tight letter-spacing.' },
  { title: 'Tone of Voice', text: 'Professional, concise, and confident. Avoid exclamation marks in UI copy. Use sentence case for headings and labels.' },
];

export default function Brand() {
  usePageMeta({
    title: 'Brand Assets — Eclipse',
    description: 'Download official Eclipse logos, colour palette, and brand guidelines for press and partners.',
    canonicalPath: '/brand',
  });

  return (
    <MainLayout>
      <div className="container max-w-4xl py-12 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Brand Assets</h1>
          <p className="mt-2 text-muted-foreground">
            Official logos, colours, and guidelines for press, partners, and community use.
          </p>
        </div>

        {/* Logo */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Logo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-border rounded-xl p-8 flex items-center justify-center bg-background">
              <img src="/pwa-512x512.png" alt="Eclipse logo on dark" className="h-20 w-20" />
            </div>
            <div className="border border-border rounded-xl p-8 flex items-center justify-center bg-white">
              <img src="/pwa-512x512.png" alt="Eclipse logo on light" className="h-20 w-20" />
            </div>
          </div>
          <a href="/pwa-512x512.png" download="eclipse-logo.png">
            <Button variant="outline" size="sm" className="h-10 gap-2">
              <Download className="h-4 w-4" />
              Download Logo (PNG)
            </Button>
          </a>
        </div>

        {/* Colours */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Colour Palette</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {colors.map((c) => (
              <div key={c.token} className="border border-border rounded-xl overflow-hidden">
                <div className="h-16" style={{ backgroundColor: c.value }} />
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{c.token}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guidelines */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Guidelines</h2>
          <div className="space-y-4">
            {guidelines.map((g) => (
              <div key={g.title} className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">{g.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{g.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-6 text-xs text-muted-foreground">
          For press enquiries, contact press@eclipserblx.com
        </div>
      </div>
    </MainLayout>
  );
}
