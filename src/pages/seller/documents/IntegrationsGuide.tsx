import { SellerDocumentPage } from "@/components/seller/documents/SellerDocumentPage";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, Bell, Bot, Shield, Settings, Webhook,
  CheckCircle2, AlertTriangle, Gamepad2, Users, Layout,
  Copy, Link, RefreshCw, Lock
} from "lucide-react";

const discordFeatures = [
  {
    icon: Bell,
    title: "Sales Notifications",
    description: "Get instant Discord messages when someone buys your product. Includes buyer info, product name, and order amount.",
    setup: "Settings → Notifications → Add your Discord webhook URL for sales alerts.",
  },
  {
    icon: MessageSquare,
    title: "Review Notifications",
    description: "Be notified when customers leave reviews on your products. Respond quickly to maintain your rating.",
    setup: "Settings → Notifications → Add a separate webhook URL for review alerts.",
  },
  {
    icon: Users,
    title: "Role Pings",
    description: "Automatically ping specific Discord roles when you release new products or drop scheduled items.",
    setup: "Discord Integration → Configure role IDs for product drops and early access.",
  },
];

const botIntegration = [
  {
    step: "1",
    title: "Register Your Bot",
    description: "Go to the Bots section in your seller dashboard and register your Discord bot product.",
  },
  {
    step: "2",
    title: "Get Your Seller ID",
    description: "Copy your unique x-seller-id from the Bot Integration Guide page.",
  },
  {
    step: "3",
    title: "Integrate the API",
    description: "Add the license validation endpoint to your bot code. Code snippets available in JavaScript and Python.",
  },
  {
    step: "4",
    title: "Sell Installation Codes",
    description: "When customers purchase, they receive an installation code. Your bot validates it via the API.",
  },
];

const robloxFeatures = [
  {
    title: "Group Verification",
    description: "Verify buyers are in your Roblox group before allowing access to certain products or features.",
  },
  {
    title: "Badge Verification",
    description: "Gate products behind Roblox badge ownership for exclusive content distribution.",
  },
  {
    title: "Asset Delivery",
    description: "Automated delivery settings for Roblox-specific assets like models, decals, and scripts.",
  },
];

const discordTemplates = [
  {
    title: "What Are Server Templates?",
    icon: Layout,
    description: "Discord Server Templates are shareable URLs that let anyone clone your server's structure — channels, roles, permissions, and categories — into a new server instantly.",
  },
  {
    title: "How They Work",
    icon: Copy,
    description: "Create a template from Server Settings → Server Template. Discord generates a public URL (discord.new/...) that anyone can use to replicate your setup.",
  },
  {
    title: "Selling Templates",
    icon: Link,
    description: "List your template as a product on Eclipse. After purchase, the buyer receives the template link to create their own server with your pre-built layout.",
  },
  {
    title: "Security Considerations",
    icon: Lock,
    description: "Template URLs are public and cannot be revoked or limited. Once shared, anyone with the link can use it. Consider a link-rotation strategy or bot-driven setup service for premium templates.",
  },
];

const templateTips = [
  "Discord templates copy structure only — messages, members, and bots are not included",
  "Update your template regularly to keep the shared version current with your latest changes",
  "Use a bot-driven setup service for premium templates to maintain control over distribution",
  "Consider rotating template links periodically to limit unauthorized sharing",
  "Include setup instructions with your product so buyers know how to customize after cloning",
];

const webhookTips = [
  "Use separate webhook URLs for sales and reviews to organize your Discord channels",
  "Create a private staff channel for sale notifications to avoid cluttering your community",
  "Test your webhook by placing a test order before going live",
  "Discord webhook URLs look like: https://discord.com/api/webhooks/...",
  "Never share your webhook URLs publicly — anyone with the URL can post to your channel",
];

export default function IntegrationsGuide() {
  return (
    <SellerDocumentPage
      title="Discord & Integrations Guide"
      subtitle="Connect your store to Discord, Roblox, and more"
    >
      <div className="space-y-10">
        {/* Discord Notifications */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Discord Notifications
          </h2>
          <div className="space-y-4">
            {discordFeatures.map((feature, i) => (
              <div key={i} className="border-border/50">
                <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm text-lg">{feature.title}</h3>
                  </div>
                </div>
                <div className="p-4 pt-0 space-y-3">
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">HOW TO SET UP</p>
                    <p className="text-sm">{feature.setup}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Webhook Tips */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="h-6 w-6 text-primary" />
            Webhook Best Practices
          </h2>
          <div className="border border-border rounded-xl overflow-hidden border-border/50">
            <div className="p-4 pt-6">
              <ul className="space-y-3">
                {webhookTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Bot Licensing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Discord Bot Licensing
          </h2>
          <p className="text-muted-foreground">
            If you sell custom Discord bots, Eclipse provides a complete licensing system with validation API.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {botIntegration.map((step) => (
              <div key={step.step} className="border-border/50">
                <div className="p-4 pt-6">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-sm">
                      {step.step}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Discord Server Templates */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layout className="h-6 w-6 text-primary" />
            Discord Server Templates
          </h2>
          <p className="text-muted-foreground">
            Sell pre-built Discord server layouts that buyers can clone instantly.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {discordTemplates.map((item, i) => (
              <div key={i} className="border-border/50">
                <div className="p-4 pt-6">
                  <div className="flex gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 h-fit shrink-0">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border border-border rounded-xl overflow-hidden border-border/50">
            <div className="p-4 pt-6">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Best Practices</p>
              <ul className="space-y-3">
                {templateTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Roblox Integration */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gamepad2 className="h-6 w-6 text-primary" />
            Roblox Integration
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {robloxFeatures.map((feature, i) => (
              <div key={i} className="border-border/50">
                <div className="p-4 pt-6 text-center">
                  <h4 className="font-semibold mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Security Note */}
        <div className="border border-border rounded-xl overflow-hidden border-amber-500/30 bg-amber-500/5">
          <div className="p-4 pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Shield className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-500">Security Reminder</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Never share your Discord webhook URLs, bot tokens, or API keys publicly. These credentials
                  are stored securely in your seller dashboard and are only accessible by you and the platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SellerDocumentPage>
  );
}
