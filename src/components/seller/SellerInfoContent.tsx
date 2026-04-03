import { 
  ArrowRight,
  Sparkles,
  Lock,
  TrendingUp,
  Shield,
  Percent,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const stats = [
  { value: "90%", label: "Max Earnings" },
  { value: "100%", label: "IP Ownership" },
  { value: "3", label: "Payout Methods" },
  { value: "24h", label: "Review Time" },
];

const sellingPoints = [
  {
    icon: Percent,
    title: "Industry-Leading Earnings",
    description: "Keep up to 90% of net earnings. Commission is calculated after payment processing fees — not before.",
    highlight: "85% base · 90% with Eclipse+",
  },
  {
    icon: Lock,
    title: "You Own Everything",
    description: "We only get a license to display and sell. You retain full IP, sell on other platforms, and remove products anytime.",
    highlight: "Zero lock-in",
  },
  {
    icon: Wallet,
    title: "Get Paid Your Way",
    description: "Stripe Connect direct to bank, PayPal, or manual bank transfer. Automatic payouts, no platform credits.",
    highlight: "3 payout options",
  },
  {
    icon: Shield,
    title: "Built-In Protection",
    description: "AI-powered Lua script analysis, virus scanning on all uploads, and manual product moderation before going live.",
    highlight: "Multi-layer security",
  },
];

const earningsBreakdown = [
  { label: "Customer Pays", value: "£10.00", type: "neutral" as const },
  { label: "Stripe Fee (1.5% + £0.20)", value: "-£0.35", type: "deduction" as const },
  { label: "Net After Stripe", value: "£9.65", type: "neutral" as const },
  { label: "Platform Commission (15%)", value: "-£1.45", type: "deduction" as const },
];

const steps = [
  { title: "Create Account", description: "Sign up free with email or Roblox" },
  { title: "Apply", description: "Quick application, reviewed in 24-48h" },
  { title: "Connect Payouts", description: "Link Stripe, PayPal, or bank details" },
  { title: "Start Selling", description: "List products and start earning" },
];

const comparisonRows = [
  { feature: "Your Earnings", eclipse: "Up to 90%", others: "70% or less" },
  { feature: "IP Ownership", eclipse: "100% yours", others: "Broad platform rights" },
  { feature: "Payout Methods", eclipse: "Stripe / PayPal / Bank", others: "Limited or credits" },
  { feature: "Platform Lock-in", eclipse: "None", others: "Exclusive or restricted" },
  { feature: "Store Customization", eclipse: "5 themes + 7 colors", others: "Basic or none" },
  { feature: "Security Scanning", eclipse: "AI + virus scan", others: "Manual review" },
];

export function SellerInfoContent() {
  return (
    <div className="space-y-0">
      {/* Hero */}
      <section className="relative py-16 md:py-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            Sell on <span className="text-primary">Eclipse</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            The marketplace that respects creators. Fair fees, full ownership, instant payouts.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <a 
              href="/become-seller"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all active:scale-[0.97]"
            >
              Start Selling
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative mt-12 max-w-2xl mx-auto px-4">
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-card/80 backdrop-blur border border-border/50 p-4 md:p-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Eclipse — 4 key points */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Why creators choose Eclipse</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {sellingPoints.map((point) => (
              <div 
                key={point.title} 
                className="group p-6 rounded-2xl border border-border/50 bg-card/30 hover:bg-card/60 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                    <point.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">{point.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
                    <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      {point.highlight}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Breakdown — clean and focused */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Transparent earnings</h2>
            <p className="text-muted-foreground mt-2 text-sm">Know exactly what you'll earn on every sale</p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/30 overflow-hidden">
            <div className="p-5 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Example: £10.00 Sale</span>
              </div>
            </div>
            <div className="divide-y divide-border/30">
              {earningsBreakdown.map((row) => (
                <div key={row.label} className="flex justify-between items-center px-5 py-3.5">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className={`text-sm font-medium ${row.type === 'deduction' ? 'text-destructive' : 'text-foreground'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center px-5 py-4 bg-primary/5">
                <span className="font-semibold text-primary">You Earn</span>
                <span className="text-2xl font-bold text-primary">£8.20</span>
              </div>
            </div>

            {/* Tiers */}
            <div className="grid grid-cols-2 border-t border-border/30">
              <div className="p-4 text-center border-r border-border/30">
                <Badge variant="secondary" className="mb-2">Base Seller</Badge>
                <p className="text-xl font-bold text-foreground">85%</p>
                <p className="text-xs text-muted-foreground">of net earnings</p>
              </div>
              <div className="p-4 text-center bg-primary/5">
                <Badge className="mb-2 bg-gradient-to-r from-amber-500 to-yellow-500 border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Eclipse+
                </Badge>
                <p className="text-xl font-bold text-primary">90%</p>
                <p className="text-xs text-muted-foreground">of net earnings</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            UK Stripe rates shown. Formula: (Sale − Stripe Fee) × (1 − Commission)
          </p>
        </div>
      </section>

      {/* Comparison — simplified */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Eclipse vs. the rest</h2>
          </div>

          <div className="rounded-2xl border border-border/50 overflow-hidden">
            <div className="divide-y divide-border/30">
              {comparisonRows.map((row) => (
                <div key={row.feature} className="grid grid-cols-3 text-sm">
                  <div className="px-4 py-3.5 font-medium text-foreground bg-muted/20 flex items-center">
                    {row.feature}
                  </div>
                  <div className="px-4 py-3.5 text-primary font-medium bg-primary/5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs md:text-sm">{row.eclipse}</span>
                  </div>
                  <div className="px-4 py-3.5 text-muted-foreground flex items-center">
                    <span className="text-xs md:text-sm">{row.others}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Column headers at bottom for context */}
            <div className="grid grid-cols-3 border-t border-border/50 bg-muted/10 text-[11px] text-muted-foreground">
              <div className="px-4 py-2"></div>
              <div className="px-4 py-2 font-semibold text-primary">Eclipse</div>
              <div className="px-4 py-2">Others</div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps — horizontal timeline */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Get started in minutes</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{step.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 px-4 print:hidden">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Ready to start?</h2>
          <p className="text-muted-foreground">
            Applications are reviewed within 24-48 hours. Join hundreds of creators already selling on Eclipse.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a 
              href="/become-seller"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all active:scale-[0.97]"
            >
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </a>
            <a 
              href="/support/chat" 
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-colors"
            >
              Ask a Question
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
