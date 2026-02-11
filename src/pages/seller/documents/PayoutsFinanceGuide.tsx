import { SellerDocumentPage } from "@/components/seller/documents/SellerDocumentPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet, CreditCard, Building2, TrendingUp, Calculator,
  Clock, CheckCircle2, AlertTriangle, Info, Percent
} from "lucide-react";

const payoutMethods = [
  {
    icon: CreditCard,
    method: "Stripe Connect",
    description: "Direct bank payouts via Stripe. The fastest and most reliable option.",
    pros: ["Automatic payouts", "Instant dashboard visibility", "Direct to bank account"],
    timing: "Automatic — funds arrive within 2-7 business days",
    recommended: true,
  },
  {
    icon: Wallet,
    method: "PayPal",
    description: "Manual payouts to your registered PayPal email address.",
    pros: ["Widely accessible", "Quick transfers", "No bank details needed"],
    timing: "Manual request — processed within 3-5 business days",
    recommended: false,
  },
  {
    icon: Building2,
    method: "Bank Transfer (Wise)",
    description: "Direct bank transfer via Wise Business for international sellers.",
    pros: ["Low international fees", "Multi-currency support", "No PayPal/Stripe needed"],
    timing: "Manual request — processed within 5-7 business days",
    recommended: false,
  },
];

const earningsBreakdown = [
  { label: "Customer pays", value: "£10.00", type: "neutral" },
  { label: "Stripe processing fee (1.5% + £0.20)", value: "-£0.35", type: "fee" },
  { label: "Net after payment processing", value: "£9.65", type: "neutral" },
  { label: "Platform commission (15% base / 10% Eclipse+)", value: "-£1.45 / -£0.97", type: "fee" },
  { label: "Your earnings (base seller)", value: "£8.20", type: "earning" },
  { label: "Your earnings (Eclipse+ seller)", value: "£8.69", type: "highlight" },
];

const importantNotes = [
  {
    icon: Info,
    title: "Eclipse+ Buyer Discounts",
    description: "When an Eclipse+ member buys your product at a discounted price, the platform absorbs the discount. You always earn based on the full listing price.",
  },
  {
    icon: Calculator,
    title: "Commission Calculated on Net",
    description: "Platform commission is calculated AFTER Stripe/payment processing fees are deducted, not on the gross sale amount. This means you keep more.",
  },
  {
    icon: Clock,
    title: "Minimum Payout Threshold",
    description: "You can request a payout once your available balance reaches £5.00 or more. There is no maximum limit on payout requests.",
  },
  {
    icon: AlertTriangle,
    title: "Refunds & Chargebacks",
    description: "If a customer receives a refund, the corresponding seller earnings are reversed. Chargeback fees are covered by the platform, not the seller.",
  },
];

export default function PayoutsFinanceGuide() {
  return (
    <SellerDocumentPage
      title="Payouts & Finance Guide"
      subtitle="Understanding your earnings, commissions, and payout options"
    >
      <div className="space-y-10">
        {/* Commission Overview */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Percent className="h-6 w-6 text-primary" />
            Commission Structure
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center">
                <Badge variant="secondary" className="mb-3">Base Seller</Badge>
                <p className="text-4xl font-bold text-foreground">85%</p>
                <p className="text-sm text-muted-foreground mt-2">of net earnings (15% commission)</p>
              </CardContent>
            </Card>
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6 text-center">
                <Badge className="mb-3 bg-gradient-to-r from-amber-500 to-yellow-500">Eclipse+ Seller</Badge>
                <p className="text-4xl font-bold text-primary">90%</p>
                <p className="text-sm text-muted-foreground mt-2">of net earnings (10% commission)</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Earnings Example */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Earnings Breakdown Example
          </h2>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="space-y-0 divide-y divide-border">
                {earningsBreakdown.map((item, i) => (
                  <div key={i} className={`flex justify-between items-center py-3 ${
                    item.type === "highlight" ? "bg-primary/10 rounded-lg px-3 -mx-3" :
                    item.type === "earning" ? "bg-green-500/10 rounded-lg px-3 -mx-3" : ""
                  }`}>
                    <span className={`text-sm ${item.type === "highlight" || item.type === "earning" ? "font-semibold" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                    <span className={`font-mono font-semibold ${
                      item.type === "fee" ? "text-destructive" :
                      item.type === "highlight" ? "text-primary" :
                      item.type === "earning" ? "text-green-500" : ""
                    }`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Payout Methods */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Payout Methods
          </h2>
          <div className="space-y-4">
            {payoutMethods.map((method, i) => (
              <Card key={i} className={`border-border/50 ${method.recommended ? "border-primary/50 bg-primary/5" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <method.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{method.method}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{method.description}</p>
                      </div>
                    </div>
                    {method.recommended && <Badge className="bg-primary shrink-0">Recommended</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">BENEFITS</p>
                      <ul className="space-y-1">
                        {method.pros.map((pro, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs font-medium text-muted-foreground mb-2">TIMING</p>
                      <p className="text-sm">{method.timing}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Important Notes */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Important Information
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {importantNotes.map((note, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <note.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{note.title}</h4>
                      <p className="text-sm text-muted-foreground">{note.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </SellerDocumentPage>
  );
}
