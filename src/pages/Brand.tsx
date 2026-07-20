import { MainLayout } from '@/components/layout/MainLayout';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Button } from '@/components/ui/button';
import { Download, Check, X } from 'lucide-react';

const colors = [
  { name: 'Primary', token: '--primary', role: 'Primary CTAs, key interactions' },
  { name: 'Foreground', token: '--foreground', role: 'Body text, headings' },
  { name: 'Background', token: '--background', role: 'App canvas' },
  { name: 'Muted', token: '--muted', role: 'Subtle surfaces, chips' },
  { name: 'Accent', token: '--accent', role: 'Secondary emphasis' },
  { name: 'Destructive', token: '--destructive', role: 'Errors, dangerous actions' },
];

const typeScale = [
  { name: 'Display', className: 'font-display font-bold text-5xl tracking-tight', sample: 'Eclipse', meta: 'Display / Bold / 48px' },
  { name: 'Heading', className: 'font-display font-semibold text-2xl tracking-tight', sample: 'A marketplace for creators', meta: 'Display / Semibold / 24px' },
  { name: 'Body', className: 'text-base text-foreground', sample: 'Digital assets for the Roblox UK-roleplay community, delivered instantly and traced end-to-end.', meta: 'Sans / Regular / 16px' },
  { name: 'Caption', className: 'text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold', sample: 'Since 2024', meta: 'Sans / Semibold / 12px / 0.18em' },
];

const dos = [
  'Use the wordmark on solid, neutral backgrounds.',
  'Maintain clear space equal to the height of the "E".',
  'Use the primary token for CTAs and key emphasis.',
];
const donts = [
  "Don't stretch, rotate, or recolour the mark.",
  "Don't place the mark on busy imagery or gradients.",
  "Don't substitute display type with system defaults.",
];

export default function Brand() {
  usePageMeta({
    title: 'Brand Assets — Eclipse',
    description: 'Download official Eclipse logos, colour palette, and brand guidelines for press and partners.',
    canonicalPath: '/brand',
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10 md:py-16 max-w-5xl">
        {/* Editorial hero */}
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-10 items-end mb-14 pb-10 border-b border-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
              Brand Assets
            </p>
            <h1 className="font-display font-bold text-4xl md:text-5xl leading-[1.05] tracking-tight text-foreground">
              The Eclipse mark, in your hands.
            </h1>
            <p className="mt-5 text-muted-foreground text-base md:text-lg max-w-lg leading-relaxed">
              Logos, colour, and typography for press, partners, and community use. Handle with the same
              care we do.
            </p>
          </div>
          <div className="flex md:justify-end">
            <a href="/pwa-512x512.png" download="eclipse-logo.png">
              <Button className="h-11 px-5 gap-2">
                <Download className="h-4 w-4" />
                Download logo (PNG)
              </Button>
            </a>
          </div>
        </div>

        {/* Logo lockups — light + dark side by side */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">01 — Logo</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="h-52 flex items-center justify-center bg-[hsl(220_20%_10%)]">
                <img src="/pwa-512x512.png" alt="Eclipse logo on dark surface" className="h-24 w-24" />
              </div>
              <div className="px-5 py-3 flex items-center justify-between bg-card border-t border-border">
                <span className="text-sm font-medium text-foreground">On dark</span>
                <span className="text-[11px] font-mono text-muted-foreground">220 20% 10%</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="h-52 flex items-center justify-center bg-white">
                <img src="/pwa-512x512.png" alt="Eclipse logo on light surface" className="h-24 w-24" />
              </div>
              <div className="px-5 py-3 flex items-center justify-between bg-card border-t border-border">
                <span className="text-sm font-medium text-foreground">On light</span>
                <span className="text-[11px] font-mono text-muted-foreground">0 0% 100%</span>
              </div>
            </div>
          </div>

          {/* Do / Don't */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-full bg-success/15 text-success flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-foreground">Do</span>
              </div>
              <ul className="space-y-2">
                {dos.map((d) => (
                  <li key={d} className="text-sm text-foreground/80 leading-relaxed">— {d}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-full bg-destructive/15 text-destructive flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-foreground">Don't</span>
              </div>
              <ul className="space-y-2">
                {donts.map((d) => (
                  <li key={d} className="text-sm text-foreground/80 leading-relaxed">— {d}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Colour */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">02 — Colour</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {colors.map((c) => (
              <div key={c.token} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="h-24" style={{ backgroundColor: `hsl(var(${c.token}))` }} />
                <div className="p-4">
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{c.token}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{c.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography — live specimens */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">03 — Typography</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {typeScale.map((t) => (
              <div key={t.name} className="grid md:grid-cols-[140px_1fr] gap-4 md:gap-8 items-baseline p-6">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-[11px] font-mono text-muted-foreground mt-1">{t.meta}</p>
                </div>
                <div className={t.className}>{t.sample}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Voice */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">04 — Voice</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="rounded-2xl border border-border bg-muted/30 p-7 md:p-10">
            <p className="font-display text-2xl md:text-3xl text-foreground leading-tight tracking-tight max-w-3xl">
              "Professional, concise, confident. Sentence case for headings. No exclamation marks in UI copy."
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mt-6">
              House Style
            </p>
          </div>
        </section>

        <div className="border-t border-border pt-6 text-xs text-muted-foreground">
          For press enquiries, contact press@eclipserblx.com
        </div>
      </div>
    </MainLayout>
  );
}
