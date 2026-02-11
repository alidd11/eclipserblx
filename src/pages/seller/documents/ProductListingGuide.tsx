import { SellerDocumentPage } from "@/components/seller/documents/SellerDocumentPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Image, FileText, Tag, Star, CheckCircle2, XCircle,
  AlertTriangle, Lightbulb, TrendingUp, Package
} from "lucide-react";

const listingTips = [
  {
    icon: Image,
    title: "Use High-Quality Images",
    description: "Upload up to 4 clear, well-lit images showing your product in action. Use in-game screenshots at max resolution. The first image is your thumbnail — make it count.",
  },
  {
    icon: FileText,
    title: "Write Compelling Descriptions",
    description: "Start with the key benefit, then list features. Explain what's included, how to install, and any requirements. Use formatting to make it scannable.",
  },
  {
    icon: Tag,
    title: "Price Competitively",
    description: "Research similar products on the marketplace. Consider introductory pricing for your first few listings. Remember: lower prices can mean higher volume.",
  },
  {
    icon: Star,
    title: "Encourage Reviews",
    description: "After a successful sale, politely ask buyers for a review. Positive reviews build trust and boost your store's visibility in search results.",
  },
];

const dosAndDonts = {
  dos: [
    "Include version numbers and changelogs",
    "Specify compatible Roblox game frameworks",
    "Add installation/setup instructions",
    "Use relevant categories and tags",
    "Keep product files organized in folders",
    "Respond to buyer questions quickly",
    "Update products when Roblox APIs change",
  ],
  donts: [
    "Use misleading thumbnails or screenshots",
    "Copy descriptions from other sellers",
    "List the same product multiple times",
    "Include obfuscated or backdoored scripts",
    "Use copyrighted assets without permission",
    "Spam tags or irrelevant categories",
    "Ignore buyer support messages",
  ],
};

const pricingTiers = [
  { range: "£1 - £3", type: "Simple Assets", examples: "Basic decals, simple UI elements, single scripts" },
  { range: "£3 - £8", type: "Standard Products", examples: "Vehicle liveries, uniform packs, UI kits" },
  { range: "£8 - £15", type: "Premium Products", examples: "Full vehicle packs, complex scripts, multi-asset bundles" },
  { range: "£15+", type: "Enterprise Products", examples: "Complete game systems, Discord bots, custom frameworks" },
];

export default function ProductListingGuide() {
  return (
    <SellerDocumentPage
      title="Product Listing Guide"
      subtitle="Best practices for creating listings that sell"
    >
      <div className="space-y-10">
        {/* Tips Grid */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Listing Best Practices
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {listingTips.map((tip, i) => (
              <Card key={i} className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <tip.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{tip.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{tip.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing Guide */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Pricing Guide
          </h2>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="space-y-0 divide-y divide-border">
                {pricingTiers.map((tier, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 py-4 first:pt-0 last:pb-0">
                    <Badge variant="outline" className="w-fit text-primary border-primary/30 font-mono">
                      {tier.range}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium">{tier.type}</p>
                      <p className="text-sm text-muted-foreground">{tier.examples}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                * These are suggested ranges. You're free to set any price above £1.00 minimum.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Do's and Don'ts */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Do's & Don'ts
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-green-500 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> Do
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3">
                  {dosAndDonts.dos.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <XCircle className="h-5 w-5" /> Don't
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3">
                  {dosAndDonts.donts.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* File Requirements */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            File Requirements
          </h2>
          <Card className="border-border/50">
            <CardContent className="pt-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30">
                  <h4 className="font-semibold mb-2">Accepted File Types</h4>
                  <p className="text-sm text-muted-foreground">.rbxm, .rbxmx, .lua, .zip, .rar, .png, .jpg, .json, .txt</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <h4 className="font-semibold mb-2">Image Requirements</h4>
                  <p className="text-sm text-muted-foreground">Max 4 images per product. Recommended: 1920×1080 or 1:1 ratio. PNG or JPG format.</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <h4 className="font-semibold mb-2">Security Scanning</h4>
                  <p className="text-sm text-muted-foreground">All uploads are automatically scanned for malware and backdoors. Clean files only.</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <h4 className="font-semibold mb-2">Review Process</h4>
                  <p className="text-sm text-muted-foreground">New products are reviewed within 24-48 hours before going live on the marketplace.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </SellerDocumentPage>
  );
}
