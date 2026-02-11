import { SellerDocumentPage } from "@/components/seller/documents/SellerDocumentPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, AlertTriangle, Ban, CheckCircle2, XCircle,
  Scale, MessageSquare, Clock, Flag, Heart
} from "lucide-react";

const coreRules = [
  {
    icon: Shield,
    title: "Original Work Only",
    description: "All products must be your original creation or you must have explicit rights/licenses to sell them. Reselling others' work is strictly prohibited.",
  },
  {
    icon: Heart,
    title: "Respectful Communication",
    description: "Treat buyers, other sellers, and staff with respect. Harassment, hate speech, or threatening behaviour results in immediate suspension.",
  },
  {
    icon: Scale,
    title: "Honest Representations",
    description: "Product descriptions, screenshots, and previews must accurately represent what the buyer receives. No bait-and-switch tactics.",
  },
  {
    icon: Clock,
    title: "Timely Support",
    description: "Respond to buyer questions and support requests within 48 hours. Good customer service builds your reputation and reviews.",
  },
];

const prohibitedContent = [
  "Backdoored or malicious scripts (auto-detected by our AI scanner)",
  "Stolen or pirated assets from other creators or platforms",
  "Assets that infringe on Roblox's Terms of Service",
  "Content promoting hate, violence, or illegal activities",
  "Real-money gambling mechanics or systems",
  "Personal data harvesting scripts or tools",
  "Assets using copyrighted material without authorization",
  "Misleading \"free\" products that require hidden payments",
  "Duplicate listings of the same product under different names",
  "Products that exploit game vulnerabilities or enable cheating",
];

const disputeProcess = [
  {
    step: "1",
    title: "Buyer Reports Issue",
    description: "The buyer contacts support or opens a dispute through their order page within 14 days of purchase.",
  },
  {
    step: "2",
    title: "Seller Notified",
    description: "You receive a notification with the buyer's concern. You have 48 hours to respond with your side.",
  },
  {
    step: "3",
    title: "Resolution Attempt",
    description: "Eclipse support mediates between both parties to find a fair resolution (replacement, fix, or refund).",
  },
  {
    step: "4",
    title: "Final Decision",
    description: "If no agreement is reached, Eclipse makes a final decision based on evidence from both parties.",
  },
];

const enforcementLevels = [
  {
    level: "Warning",
    description: "First-time minor violations receive a formal warning with guidance on the correct approach.",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  {
    level: "Product Removal",
    description: "Violating products are removed from the marketplace. You may resubmit after fixing the issues.",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  },
  {
    level: "Temporary Suspension",
    description: "Repeated violations result in a temporary store suspension (7-30 days).",
    color: "bg-red-500/10 text-red-500 border-red-500/30",
  },
  {
    level: "Permanent Ban",
    description: "Severe violations (malware, fraud, harassment) result in permanent removal from the platform.",
    color: "bg-destructive/10 text-destructive border-destructive/30",
  },
];

export default function CommunityGuidelines() {
  return (
    <SellerDocumentPage
      title="Community Guidelines & Policies"
      subtitle="Rules, prohibited content, and dispute resolution"
    >
      <div className="space-y-10">
        {/* Core Rules */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Core Rules
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {coreRules.map((rule, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <rule.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{rule.title}</h4>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Prohibited Content */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Ban className="h-6 w-6 text-destructive" />
            Prohibited Content
          </h2>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                The following content is strictly prohibited and will result in immediate removal:
              </p>
              <ul className="space-y-3">
                {prohibitedContent.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Enforcement */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6 text-primary" />
            Enforcement Actions
          </h2>
          <div className="space-y-3">
            {enforcementLevels.map((level, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className={`${level.color} shrink-0 font-medium`}>
                      {level.level}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{level.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Dispute Resolution */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Dispute Resolution Process
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {disputeProcess.map((step) => (
              <Card key={step.step} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-sm">
                      {step.step}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Need Help?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  If you're unsure whether your content meets our guidelines, or if you need to report a violation,
                  contact our support team through the seller dashboard. We're here to help.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SellerDocumentPage>
  );
}
