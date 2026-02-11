import { SellerDocumentPage } from "@/components/seller/documents/SellerDocumentPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Palette, Layout, Type, Image, Globe, Star,
  CheckCircle2, Sparkles, Settings, Eye
} from "lucide-react";

const themes = [
  { name: "Default", description: "Clean, professional look with balanced spacing", recommended: true },
  { name: "Minimal", description: "Ultra-clean with maximum whitespace focus" },
  { name: "Bold", description: "Strong typography and high-contrast elements" },
  { name: "Gradient", description: "Smooth color transitions and modern feel" },
  { name: "Dark", description: "Sleek, immersive dark-first design" },
];

const customizationOptions = [
  {
    icon: Palette,
    title: "Accent Colors",
    description: "Choose from 7 accent colors to match your brand identity. Your accent color appears on buttons, links, badges, and highlights throughout your storefront.",
    items: ["Purple", "Blue", "Green", "Red", "Orange", "Pink", "Yellow"],
  },
  {
    icon: Image,
    title: "Branding Assets",
    description: "Upload a custom logo and banner image to make your store instantly recognizable.",
    items: ["Logo: Square format, min 200×200px", "Banner: Wide format, recommended 1200×400px", "Supported formats: PNG, JPG, WebP"],
  },
  {
    icon: Type,
    title: "Typography",
    description: "Select from custom heading and body fonts to create a unique reading experience for your customers.",
    items: ["Choose heading font for titles", "Choose body font for descriptions", "Fonts load automatically for visitors"],
  },
  {
    icon: Globe,
    title: "Social Links",
    description: "Connect your social media profiles so customers can follow you across platforms.",
    items: ["Discord server link", "Twitter/X profile", "YouTube channel", "TikTok profile", "Roblox profile", "Personal website"],
  },
];

const setupSteps = [
  {
    step: 1,
    title: "Complete Your Profile",
    description: "Go to Settings → Profile to add your store name, description, and bio. This is the first thing customers see.",
    tips: ["Keep your store name short and memorable", "Write a bio that explains what you sell and why", "Use keywords customers search for"],
  },
  {
    step: 2,
    title: "Upload Branding",
    description: "Add your logo and banner in Settings → Appearance. Consistent branding builds trust.",
    tips: ["Use a logo that's clear at small sizes", "Your banner should showcase your best work", "Keep branding consistent with your Discord"],
  },
  {
    step: 3,
    title: "Choose Theme & Colors",
    description: "Select a theme and accent color that matches your brand personality.",
    tips: ["Preview each theme before committing", "Dark theme works great for gaming content", "Bold theme stands out in search results"],
  },
  {
    step: 4,
    title: "Set Up Announcements",
    description: "Use the announcement bar to highlight sales, new products, or important updates.",
    tips: ["Keep announcements short and actionable", "Update regularly to show your store is active", "Use for limited-time offers to create urgency"],
  },
  {
    step: 5,
    title: "Configure Categories",
    description: "Enable the product categories relevant to your store to help customers navigate.",
    tips: ["Only enable categories you actually sell in", "Categories improve search visibility", "You can toggle categories on/off anytime"],
  },
];

export default function StoreSetupGuide() {
  return (
    <SellerDocumentPage
      title="Store Setup & Customization"
      subtitle="Make your storefront stand out and attract more buyers"
    >
      <div className="space-y-10">
        {/* Theme Selection */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layout className="h-6 w-6 text-primary" />
            Available Themes
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {themes.map((theme, i) => (
              <Card key={i} className={`border-border/50 ${theme.recommended ? "border-primary/50 bg-primary/5" : ""}`}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{theme.name}</h4>
                    {theme.recommended && <Badge className="bg-primary text-xs">Popular</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{theme.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Customization Options */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Customization Options
          </h2>
          <div className="space-y-4">
            {customizationOptions.map((option, i) => (
              <Card key={i} className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <option.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{option.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1.5">
                    {option.items.map((item, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Step by Step Setup */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            Step-by-Step Store Setup
          </h2>
          <div className="space-y-4">
            {setupSteps.map((step) => (
              <Card key={step.step} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center shrink-0">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-1">{step.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> TIPS
                        </p>
                        <ul className="space-y-1">
                          {step.tips.map((tip, j) => (
                            <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary">•</span> {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Trusted Seller */}
        <section>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <Star className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Earn Trusted Seller Status</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Trusted sellers receive a verified badge, priority listing placement, and increased buyer confidence. Earn this status through consistent quality, positive reviews, and reliable delivery.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">Verified Badge</Badge>
                    <Badge variant="outline" className="text-xs">Priority Placement</Badge>
                    <Badge variant="outline" className="text-xs">Buyer Trust</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </SellerDocumentPage>
  );
}
