import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight,
  Lock,
  TrendingUp,
  Shield,
  Percent,
  Wallet,
  CheckCircle2,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  PoundSterling,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { useSellerVerification } from "@/hooks/useSellerVerification";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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


const steps = [
  { title: "Sign Up", description: "Create a free account with email or Roblox" },
  { title: "Apply", description: "Quick application — reviewed within 24–48 hours" },
  { title: "Set Up Payouts", description: "Connect Stripe, PayPal, or bank details" },
  { title: "Start Earning", description: "List your first product and go live" },
];

function EligibilityChecker() {
  const { user } = useAuth();
  const [showResults, setShowResults] = useState(false);
  const { verificationResults, userProfile } = useSellerVerification();

  if (!user) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-5 text-center space-y-3">
        <h3 className="font-semibold text-sm text-foreground">Check if you qualify</h3>
        <p className="text-xs text-muted-foreground">Sign in to instantly check your eligibility for auto-approval.</p>
        <Button asChild size="sm" variant="outline">
          <Link to="/auth">Sign In to Check</Link>
        </Button>
      </div>
    );
  }

  if (!showResults) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-5 text-center space-y-3">
        <h3 className="font-semibold text-sm text-foreground">Check if you qualify</h3>
        <p className="text-xs text-muted-foreground">See if your application can be instantly approved.</p>
        <Button size="sm" onClick={() => setShowResults(true)}>
          Check Eligibility
        </Button>
      </div>
    );
  }

  const checks = [
    {
      label: 'Email verified',
      passed: verificationResults.email_verified,
      required: true,
    },
    {
      label: 'Discord linked',
      passed: !!userProfile?.discord_username,
      required: true,
    },
    {
      label: 'Roblox linked',
      passed: !!userProfile?.roblox_username,
      required: true,
    },
    {
      label: 'Identity match ≥ 80%',
      passed: (verificationResults.identity_consistency?.similarity_score ?? 0) >= 80,
      required: true,
      detail: verificationResults.identity_consistency
        ? `${verificationResults.identity_consistency.similarity_score}% match`
        : 'Link both accounts first',
    },
  ];

  const allPassed = checks.every(c => c.passed);
  const passedCount = checks.filter(c => c.passed).length;

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      <div className="p-4 border-b border-border/30 bg-muted/15">
        <h3 className="font-semibold text-sm text-foreground">Eligibility Check</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {allPassed
            ? 'You qualify for instant approval!'
            : `${passedCount}/${checks.length} requirements met`}
        </p>
      </div>
      <div className="divide-y divide-border/20">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              {check.passed ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
              )}
              <span className="text-xs text-foreground">{check.label}</span>
            </div>
            {check.detail && (
              <span className="text-[10px] text-muted-foreground">{check.detail}</span>
            )}
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-border/30">
        {allPassed ? (
          <Button asChild size="sm" className="w-full">
            <Link to="/become-seller">
              Apply Now — Instant Approval
              <Zap className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground text-center">
              You can still apply — applications not meeting auto-approval criteria are reviewed manually within 24–48h.
            </p>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/become-seller">Apply Anyway</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CompetitiveEarningsCalculator() {
  const [price, setPrice] = useState(10);

  // Eclipse: flat 15%, platform absorbs all processing fees
  const eclipseEarnings = price * 0.85;

  // Competitor model: 10% commission + seller pays Stripe fees (2.9% + £0.30)
  const stripeFee = price > 0 ? (price * 0.029) + 0.30 : 0;
  const competitorEarnings = Math.max(0, price - (price * 0.10) - stripeFee);

  const eclipseAdvantage = eclipseEarnings - competitorEarnings;
  const eclipseWins = eclipseAdvantage >= 0;

  const formatGBP = (v: number) => `{formatGBP(v)}`;

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/30 bg-muted/10">
        <h3 className="text-sm font-semibold text-foreground">True Take-Home Calculator</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          See what you actually keep — not just the headline rate
        </p>
      </div>

      {/* Slider */}
      <div className="px-5 pt-5 pb-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Product price</span>
          <span className="font-bold text-foreground text-sm">£{price}</span>
        </div>
        <Slider
          value={[price]}
          onValueChange={([v]) => setPrice(v)}
          min={1}
          max={100}
          step={1}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>£1</span>
          <span>£100</span>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 gap-3">
          {/* Eclipse column */}
          <motion.div
            key={`eclipse-${price}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-center relative"
          >
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                Eclipse
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 mb-1">You keep</p>
            <p className="text-2xl font-bold text-primary">{formatGBP(eclipseEarnings)}</p>
            <div className="mt-2 space-y-1 text-[10px] text-muted-foreground text-left">
              <div className="flex justify-between">
                <span>Commission (15%)</span>
                <span className="text-destructive">−{formatGBP(price * 0.15)}</span>
              </div>
              <div className="flex justify-between">
                <span>Processing fees</span>
                <span className="font-medium text-primary">£0.00</span>
              </div>
            </div>
          </motion.div>

          {/* Competitor column */}
          <motion.div
            key={`comp-${price}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-border/50 bg-card p-4 text-center relative"
          >
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                Typical rival
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 mb-1">You keep</p>
            <p className="text-2xl font-bold text-foreground">{formatGBP(competitorEarnings)}</p>
            <div className="mt-2 space-y-1 text-[10px] text-muted-foreground text-left">
              <div className="flex justify-between">
                <span>Commission (10%)</span>
                <span className="text-destructive">−{formatGBP(price * 0.10)}</span>
              </div>
              <div className="flex justify-between">
                <span>Stripe fees (you pay)</span>
                <span className="text-destructive">−{formatGBP(stripeFee)}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Verdict */}
        <motion.div
          key={`verdict-${price}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "mt-3 rounded-lg px-4 py-2.5 text-center text-xs font-medium",
            eclipseWins
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {eclipseWins ? (
            <>You earn <span className="font-bold">{formatGBP(eclipseAdvantage)} more</span> per sale on Eclipse</>
          ) : (
            <>At £{price}, the rival model saves you {formatGBP(Math.abs(eclipseAdvantage))} — but you lose fee predictability</>
          )}
        </motion.div>
      </div>

      {/* Footer context */}
      <div className="px-5 py-3 border-t border-border/30 bg-muted/5">
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          Based on UK Stripe fees (2.9% + 30p per transaction). On products under ~£15 — 
          where most Roblox assets sell — Eclipse's all-inclusive model puts more money in your pocket.
        </p>
      </div>
    </div>
  );
}

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
            className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all text-sm"
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

      {/* Eligibility Checker */}
      <section className="px-5 -mt-4 mb-8">
        <div className="max-w-md mx-auto">
          <EligibilityChecker />
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

      {/* Competitive Earnings Comparison */}
      <section className="py-12 md:py-16 px-5">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-2">The real cost of "lower" commission</h2>
          <p className="text-center text-xs text-muted-foreground mb-8">
            Some platforms advertise lower rates — then pass payment processing fees to you. Drag the slider and see what you actually take home.
          </p>

          <CompetitiveEarningsCalculator />
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
              className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all text-sm"
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
