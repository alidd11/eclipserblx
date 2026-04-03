import { 
  ArrowRight,
  Sparkles,
  Lock,
  TrendingUp,
  Shield,
  Percent,
  Wallet,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const sellingPoints = [
  {
    icon: Percent,
    title: "Keep 85% of Every Sale",
    description: "Flat 15% commission on the gross price — we absorb all Stripe and payment processing fees. No hidden deductions.",
    highlight: "Simple & predictable",
  },
  {
    icon: Lock,
    title: "100% IP Ownership",
    description: "You retain full intellectual property rights. Sell on other platforms, remove products anytime — zero lock-in.",
    highlight: "Your work, your rules",
  },
  {
    icon: Wallet,
    title: "3 Payout Options",
    description: "Stripe Connect (direct to bank), PayPal, or manual bank transfer. Automatic payouts on your schedule.",
    highlight: "No platform credits",
  },
  {
    icon: Shield,
    title: "Multi-Layer Security",
    description: "AI Lua script analysis for backdoor detection, virus scanning on every upload, and manual moderation before listing.",
    highlight: "Automated protection",
  },
];

const comparisonRows = [
  { feature: "Seller Earnings", eclipse: "85–90% of gross", others: "70% or less" },
  { feature: "Processing Fees", eclipse: "We absorb them", others: "Deducted from you" },
  { feature: "IP Ownership", eclipse: "100% yours", others: "Broad platform rights" },
  { feature: "Payouts", eclipse: "Stripe / PayPal / Bank", others: "Credits or limited" },
  { feature: "Lock-in", eclipse: "None — sell anywhere", others: "Exclusive or restricted" },
  { feature: "Security", eclipse: "AI scan + virus check", others: "Manual review" },
];

const steps = [
  { title: "Sign Up", description: "Create a free account with email or Roblox" },
  { title: "Apply", description: "Quick application — reviewed within 24–48 hours" },
  { title: "Set Up Payouts", description: "Connect Stripe, PayPal, or bank details" },
  { title: "Start Earning", description: "List your first product and go live" },
];

export function SellerInfoContent() {
  return (
    <div>
      {/* Hero */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-5 space-y-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Zap className="h-3 w-3" />
            Now accepting seller applications
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
            Sell on Eclipse
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            The creator-first marketplace. Keep 85% of every sale — we cover the payment fees.
          </p>
          <a 
            href="/become-seller"
            className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all active:scale-[0.97] text-sm"
          >
            Start Selling
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* Key numbers */}
        <div className="relative mt-10 max-w-md mx-auto px-5">
          <div className="grid grid-cols-3 rounded-2xl bg-card border border-border/50 divide-x divide-border/50">
            {[
              { value: "85%", sub: "You keep" },
              { value: "0%", sub: "Processing fees" },
              { value: "24h", sub: "Review time" },
            ].map((s) => (
              <div key={s.sub} className="py-4 text-center">
                <p className="text-xl md:text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Eclipse */}
      <section className="py-12 md:py-16 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-8">Why creators choose Eclipse</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {sellingPoints.map((point) => (
              <div 
                key={point.title} 
                className="p-5 rounded-2xl border border-border/40 bg-card/40 hover:border-border/70 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-primary/10 shrink-0 mt-0.5">
                    <point.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground">{point.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{point.description}</p>
                    <span className="inline-block text-[11px] font-medium text-primary bg-primary/8 px-2 py-0.5 rounded-full">
                      {point.highlight}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings — accurate flat commission */}
      <section className="py-12 md:py-16 px-5">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-2">Transparent earnings</h2>
          <p className="text-center text-xs text-muted-foreground mb-8">Simple flat commission — no surprise deductions</p>

          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2 bg-muted/15">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Example: £10.00 Sale</span>
            </div>
            
            <div className="divide-y divide-border/20">
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-muted-foreground">Sale Price</span>
                <span className="text-sm font-medium text-foreground">£10.00</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-muted-foreground">Stripe / Payment Fees</span>
                <span className="text-sm font-medium text-green-500">£0.00 (we cover this)</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-muted-foreground">Eclipse Commission (15%)</span>
                <span className="text-sm font-medium text-destructive">−£1.50</span>
              </div>
              <div className="flex justify-between items-center px-5 py-4 bg-primary/5">
                <span className="font-semibold text-primary text-sm">You Receive</span>
                <span className="text-2xl font-bold text-primary">£8.50</span>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-border/30">
              <div className="p-4 text-center border-r border-border/30">
                <Badge variant="secondary" className="mb-1.5 text-[10px]">Base Seller</Badge>
                <p className="text-lg font-bold text-foreground">85%</p>
                <p className="text-[10px] text-muted-foreground">15% commission</p>
              </div>
              <div className="p-4 text-center bg-primary/[0.03]">
                <Badge className="mb-1.5 text-[10px] bg-gradient-to-r from-amber-500 to-yellow-500 border-0">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                  Eclipse+
                </Badge>
                <p className="text-lg font-bold text-primary">90%</p>
                <p className="text-[10px] text-muted-foreground">10% commission</p>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-3">
            Flat commission on gross sale price. We absorb all payment processing costs.
          </p>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-12 md:py-16 px-5">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-8">How we compare</h2>

          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr,1fr,1fr] text-[11px] font-semibold border-b border-border/30 bg-muted/15">
              <div className="px-4 py-2.5 text-muted-foreground"></div>
              <div className="px-3 py-2.5 text-primary text-center">Eclipse</div>
              <div className="px-3 py-2.5 text-muted-foreground text-center">Others</div>
            </div>
            <div className="divide-y divide-border/20">
              {comparisonRows.map((row) => (
                <div key={row.feature} className="grid grid-cols-[1fr,1fr,1fr] text-xs">
                  <div className="px-4 py-3 font-medium text-foreground flex items-center">
                    {row.feature}
                  </div>
                  <div className="px-3 py-3 text-primary font-medium flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>{row.eclipse}</span>
                  </div>
                  <div className="px-3 py-3 text-muted-foreground flex items-center justify-center text-center">
                    {row.others}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-12 md:py-16 px-5">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-8">Get started in minutes</h2>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={step.title} className="flex items-start gap-4 p-4 rounded-xl border border-border/40 bg-card/40">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{step.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-20 px-5 print:hidden">
        <div className="max-w-md mx-auto text-center space-y-5">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Ready to start earning?</h2>
          <p className="text-sm text-muted-foreground">
            Applications reviewed within 24–48 hours.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a 
              href="/become-seller"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all active:scale-[0.97] text-sm"
            >
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </a>
            <a 
              href="/support/chat" 
              className="inline-flex items-center justify-center gap-2 px-7 py-3 border border-border text-foreground font-semibold rounded-xl hover:bg-muted/50 transition-colors text-sm"
            >
              Ask a Question
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
