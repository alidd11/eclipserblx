import { 
  Shield, 
  Percent, 
  CreditCard, 
  Palette, 
  Users, 
  Bot,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  FileCheck,
  TrendingUp,
  Bell,
  Calendar,
  MessageSquare,
  Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComparisonTable } from "./ComparisonTable";
import { EclipseLogo } from "@/components/ui/EclipseLogo";

const benefits = [
  {
    icon: Lock,
    title: "You Own Your Work",
    description: "Eclipse only receives a license to display and sell - you retain 100% intellectual property ownership. No platform claims on your creations.",
  },
  {
    icon: Percent,
    title: "Keep Up to 90% of Net Earnings",
    description: "Base sellers keep 85%, Eclipse+ members keep 90%. Commission calculated AFTER Stripe fees for maximum transparency.",
  },
  {
    icon: Wallet,
    title: "Flexible Payout Options",
    description: "Choose how you get paid: Stripe Connect (direct to bank), PayPal, or manual bank transfer. Your earnings, your choice.",
  },
  {
    icon: Palette,
    title: "Customizable Storefront",
    description: "5 unique themes, 7 accent colors, custom logo and banner. Make your store stand out from the competition.",
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description: "Discord webhooks for sales, new reviews, and scheduled releases. Stay informed on your phone or desktop.",
  },
  {
    icon: Bot,
    title: "AI-Powered Security",
    description: "Advanced Lua script analysis for backdoor detection plus virus scanning. Protect your reputation automatically.",
  },
];

const additionalFeatures = [
  {
    icon: Calendar,
    title: "Scheduled Releases",
    description: "Set future release dates for your products. Build hype and launch when you're ready.",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Invite team members with different roles (Admin, Editor, Viewer) to help manage your store.",
  },
  {
    icon: MessageSquare,
    title: "Discord Integration",
    description: "Connect your Discord webhook to get instant notifications for orders, reviews, and product launches.",
  },
  {
    icon: CreditCard,
    title: "Direct Bank Payouts",
    description: "Get paid directly to your bank account via Stripe Connect. No platform credits, no waiting.",
  },
];

const steps = [
  {
    number: "1",
    title: "Create Your Account",
    description: "Sign up for free on Eclipse with your email address.",
  },
  {
    number: "2",
    title: "Submit Application",
    description: "Complete a brief seller application. Review takes 24-48 hours.",
  },
  {
    number: "3",
    title: "Connect Payouts",
    description: "Link Stripe Connect, PayPal, or provide bank details for payouts.",
  },
  {
    number: "4",
    title: "Start Selling",
    description: "List your products, customize your store, and start earning!",
  },
];

const ownershipPoints = [
  "Eclipse only receives a license to display/sell - you retain full IP ownership",
  "Sell your assets on multiple platforms simultaneously",
  "Remove your products anytime with no strings attached",
  "No perpetual rights claims on your creations",
  "No derivative works claims by the platform",
];

const payoutOptions = [
  {
    method: "Stripe Connect",
    description: "Direct to your bank account",
    timing: "Automatic payouts",
    recommended: true,
  },
  {
    method: "PayPal",
    description: "Manual payout to your PayPal email",
    timing: "Request anytime",
    recommended: false,
  },
  {
    method: "Bank Transfer",
    description: "Manual transfer to your bank details",
    timing: "Request anytime",
    recommended: false,
  },
];

export function SellerInfoContent() {
  return (
    <div className="space-y-12 print:space-y-8">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-8 print:py-4">
        <div className="flex justify-center">
          <EclipseLogo size="lg" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent print:text-primary">
            Sell Your Digital Products on Eclipse
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The transparent marketplace where you keep what you create. Fair fees, full ownership, flexible payouts.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Badge variant="outline" className="text-lg px-4 py-2 border-primary/50">
            <Percent className="h-4 w-4 mr-2" />
            Up to 90% Earnings
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 border-primary/50">
            <Lock className="h-4 w-4 mr-2" />
            100% Asset Ownership
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 border-primary/50">
            <Wallet className="h-4 w-4 mr-2" />
            3 Payout Options
          </Badge>
        </div>
      </section>

      {/* Why Eclipse Section */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Why Sell on Eclipse?</h2>
          <p className="text-muted-foreground mt-2">Everything you need to succeed as a digital creator</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-border/50 bg-card/50 print:break-inside-avoid">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <benefit.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Asset Ownership Section */}
      <section className="space-y-6 print:break-before-page">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 mb-4">
            <Shield className="h-5 w-5" />
            <span className="font-semibold">Our Promise</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground">You Own Your Assets</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Unlike other marketplaces that claim broad rights to your work, Eclipse respects your intellectual property
          </p>
        </div>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <ul className="space-y-4">
              {ownershipPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Comparison Table Section */}
      <section className="space-y-6 print:break-before-page print:break-inside-avoid">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground print:text-2xl">How We Compare</h2>
          <p className="text-muted-foreground mt-2 print:text-sm print:mt-1">See why Eclipse is the best choice for digital creators</p>
        </div>
        <Card className="border-border/50 overflow-hidden print:break-inside-avoid">
          <CardContent className="p-0 md:p-6 print:p-2">
            <ComparisonTable />
          </CardContent>
        </Card>
      </section>

      {/* Earnings Breakdown Section */}
      <section className="space-y-6 print:break-before-page">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Transparent Earnings</h2>
          <p className="text-muted-foreground mt-2">Know exactly what you'll earn before you list</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="pt-6 space-y-6">
            <div className="bg-muted/30 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Example: £10.00 Sale (UK Stripe Rates)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Customer Pays</span>
                  <span className="font-semibold">£10.00</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Stripe Fee (1.5% + £0.20)</span>
                  <span className="text-destructive">-£0.35</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Net After Stripe</span>
                  <span className="font-semibold">£9.65</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Platform Commission (15%)</span>
                  <span className="text-destructive">-£1.45</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-primary/10 rounded-lg px-3">
                  <span className="font-semibold text-primary">Your Earnings</span>
                  <span className="font-bold text-xl text-primary">£8.20</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                * UK domestic Stripe rates shown. International rates may vary slightly.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Base Seller</Badge>
                </div>
                <p className="text-2xl font-bold text-foreground">85%</p>
                <p className="text-sm text-muted-foreground">of net earnings (after Stripe fees)</p>
              </div>
              <div className="p-4 rounded-lg border border-primary/50 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Eclipse+ Member
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-primary">90%</p>
                <p className="text-sm text-muted-foreground">of net earnings (10% commission)</p>
              </div>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Our Formula:</strong> Your Earnings = (Sale Price - Stripe Fee) × (1 - Commission Rate)
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Payout Options Section */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Flexible Payout Options</h2>
          <p className="text-muted-foreground mt-2">Choose how you want to receive your earnings</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {payoutOptions.map((option, index) => (
            <Card key={index} className={`border-border/50 ${option.recommended ? 'border-primary/50 bg-primary/5' : ''}`}>
              <CardContent className="pt-6 text-center">
                {option.recommended && (
                  <Badge className="mb-3 bg-primary">Recommended</Badge>
                )}
                <h3 className="font-semibold text-lg mb-2">{option.method}</h3>
                <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
                <p className="text-xs text-muted-foreground">{option.timing}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Powerful Seller Tools</h2>
          <p className="text-muted-foreground mt-2">Everything you need to manage and grow your store</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {additionalFeatures.map((feature, index) => (
            <Card key={index} className="border-border/50">
              <CardContent className="pt-6 text-center">
                <feature.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Store Customization Section */}
      <section className="space-y-6 print:break-before-page">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Make Your Store Unique</h2>
          <p className="text-muted-foreground mt-2">Stand out with full customization options</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "5 Themes", desc: "Default, Minimal, Bold, Gradient, Dark" },
            { label: "7 Accent Colors", desc: "Match your brand identity" },
            { label: "Custom Branding", desc: "Logo and banner uploads" },
            { label: "Trusted Seller Badge", desc: "Earn verified status" },
          ].map((item, index) => (
            <Card key={index} className="border-border/50 text-center">
              <CardContent className="pt-6">
                <p className="font-bold text-lg text-primary">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Security Section */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Security You Can Trust</h2>
          <p className="text-muted-foreground mt-2">Multi-layer protection for you and your customers</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border/50">
            <CardContent className="pt-6 text-center">
              <Bot className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">AI Script Analysis</h3>
              <p className="text-sm text-muted-foreground">Advanced Lua backdoor detection protects your reputation</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6 text-center">
              <FileCheck className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Virus Scanning</h3>
              <p className="text-sm text-muted-foreground">All uploads scanned via Cloudmersive for malware</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6 text-center">
              <Shield className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Product Moderation</h3>
              <p className="text-sm text-muted-foreground">All products reviewed before going live</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Get Started Section */}
      <section className="space-y-6 print:break-before-page">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Get Started in 4 Simple Steps</h2>
          <p className="text-muted-foreground mt-2">From signup to first sale in no time</p>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <Card key={index} className="border-border/50 relative">
              <CardContent className="pt-6 text-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
              {index < steps.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground z-10" />
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-8 space-y-6 print:hidden">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl font-bold text-foreground">Ready to Start Selling?</h2>
          <p className="text-muted-foreground">
            Join Eclipse today and start earning from your digital creations. Our team reviews applications within 24-48 hours.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <a 
            href="/auth" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Apply Now
            <ArrowRight className="h-4 w-4" />
          </a>
          <a 
            href="/support/chat" 
            className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors"
          >
            Chat with Us
          </a>
        </div>
      </section>

      {/* Footer for Print */}
      <footer className="hidden print:block text-center py-8 border-t border-border">
        <EclipseLogo size="sm" />
        <p className="text-muted-foreground mt-4">
          Eclipse Marketplace • eclipserblx.com
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Questions? Join our Discord community or start a live chat.
        </p>
      </footer>
    </div>
  );
}
