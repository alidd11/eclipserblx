import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useSellerStatus } from "@/hooks/useSellerStatus";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SITE_NAME } from "@/lib/constants";
import { 
  FileText, Scale, ShieldCheck, Ban, CreditCard, AlertTriangle, 
  Mail, CheckCircle2, ArrowLeft, Loader2, DollarSign, Package,
  Globe, Clock
} from "lucide-react";
import { Link } from "react-router-dom";

const CURRENT_TOS_VERSION = "1.0";

export default function SellerTermsOfService() {
  const { store } = useSellerStatus();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);

  // Check if the store has already signed
  const { data: agreement, isLoading: agreementLoading } = useQuery({
    queryKey: ['seller-agreement', store?.id, CURRENT_TOS_VERSION],
    queryFn: async () => {
      if (!store?.id) return null;
      
      const { data, error } = await supabase
        .from('seller_agreements')
        .select('*')
        .eq('store_id', store.id)
        .eq('agreement_version', CURRENT_TOS_VERSION)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  // Check if current user is the store owner
  const isOwner = store?.owner_id === user?.id;
  const hasSigned = !!agreement;

  // Mutation to sign the agreement
  const signMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id || !user?.id) throw new Error("Missing store or user");
      
      const { error } = await supabase
        .from('seller_agreements')
        .insert({
          store_id: store.id,
          signed_by: user.id,
          agreement_version: CURRENT_TOS_VERSION,
          user_agent: navigator.userAgent,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-agreement', store?.id] });
      toast.success("Agreement signed successfully", {
        description: "Thank you for agreeing to the Seller Terms of Service.",
      });
      navigate('/seller/documents');
    },
    onError: (error: Error) => {
      toast.error("Failed to sign agreement", {
        description: error.message,
      });
    },
  });

  const handleSign = () => {
    if (!agreed) {
      toast.error("Please agree to the terms", {
        description: "You must check the box to confirm you've read and agree to the terms.",
      });
      return;
    }
    signMutation.mutate();
  };

  if (agreementLoading) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/seller/documents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Seller Terms of Service</h1>
              {hasSigned && (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Signed
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Agreement between {store?.name || 'Your Store'} and {SITE_NAME}
            </p>
          </div>
        </div>

        {/* Signed Info */}
        {hasSigned && agreement && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-500">Agreement Signed</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    This agreement was signed on {new Date(agreement.signed_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Version: {agreement.agreement_version}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Terms Content */}
        <Card className="bg-card border-border">
          <CardContent className="pt-8 pb-8">
            <div className="prose prose-invert max-w-none space-y-8">
              {/* Introduction */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-6 w-6 text-primary" />
                  Introduction
                </h2>
                <p className="text-muted-foreground">
                  This Seller Agreement ("Agreement") is entered into between {SITE_NAME} ("Platform", "we", "us") 
                  and the store owner ("Seller", "you") operating a store on our marketplace. By selling products 
                  on {SITE_NAME}, you agree to be bound by these terms and conditions.
                </p>
                <p className="text-muted-foreground mt-4">
                  This Agreement governs your use of our seller services and the sale of digital products through 
                  our platform. It is governed by the laws of England and Wales.
                </p>
              </section>

              {/* Seller Obligations */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  Seller Obligations
                </h2>
                <p className="text-muted-foreground mb-4">
                  As a seller on {SITE_NAME}, you agree to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Provide accurate product descriptions and imagery</li>
                  <li>Ensure all products are your original work or you have rights to sell them</li>
                  <li>Respond to customer inquiries within a reasonable timeframe (48 hours)</li>
                  <li>Maintain high quality standards for all digital content</li>
                  <li>Not sell content that infringes on third-party intellectual property</li>
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Keep your store information and payment details up to date</li>
                </ul>
              </section>

              {/* Product Standards */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Package className="h-6 w-6 text-primary" />
                  Product Standards
                </h2>
                <p className="text-muted-foreground mb-4">
                  All products listed on the platform must:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Be compatible with Roblox and function as described</li>
                  <li>Include clear documentation or instructions where appropriate</li>
                  <li>Not contain malicious code, backdoors, or security vulnerabilities</li>
                  <li>Not include NSFW, violent, or inappropriate content</li>
                  <li>Meet our quality guidelines as outlined in the Seller Success Guide</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  We reserve the right to remove any products that do not meet these standards or that 
                  receive consistent negative feedback from customers.
                </p>
              </section>

              {/* Commission & Payments */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-primary" />
                  Commission & Payments
                </h2>
                <p className="text-muted-foreground mb-4">
                  Our standard commission structure is as follows:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Standard Products:</strong> 10% commission on net sales (after payment processing fees)</li>
                  <li><strong>Bot Products:</strong> 15% commission on net sales</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Payments are processed through Stripe Connect. You are responsible for providing accurate 
                  payment information and ensuring your Stripe account remains in good standing. Payouts are 
                  processed according to Stripe's standard payout schedule.
                </p>
                <Card className="glass-card mt-4">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Earnings Formula:</strong> (Sale Price - UK Stripe Fee) × (1 - Commission Rate)
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Intellectual Property */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Scale className="h-6 w-6 text-primary" />
                  Intellectual Property
                </h2>
                <p className="text-muted-foreground">
                  You retain 100% ownership of all intellectual property rights to your products. By listing 
                  products on {SITE_NAME}, you grant us a non-exclusive license to display, market, and 
                  distribute your products through our platform. This license terminates when you remove 
                  your products or close your store.
                </p>
                <p className="text-muted-foreground mt-4">
                  You represent and warrant that you own or have the necessary rights to sell all products 
                  listed on your store, and that your products do not infringe on any third-party rights.
                </p>
              </section>

              {/* Anti-Piracy & Watermarking */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  Anti-Piracy & Digital Watermarking
                </h2>
                <p className="text-muted-foreground">
                  To protect your intellectual property, {SITE_NAME} automatically applies digital 
                  watermarking to eligible product files (including Lua scripts) at the time of download. 
                  Each watermark contains a unique, traceable identifier linked to the buyer's purchase, 
                  enabling us to trace leaked files back to the original purchaser.
                </p>
                <p className="text-muted-foreground mt-4">
                  <strong>What this means for you as a seller:</strong>
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-2">
                  <li>Watermarking is <strong>automatic</strong> — no action required on your part</li>
                  <li>Watermarks do not alter your product's functionality</li>
                  <li>If a leaked copy is found, we can identify the buyer who redistributed it</li>
                  <li>Buyers are informed of watermarking in the Terms of Service and Privacy Policy</li>
                  <li>Additional download protections include rate limiting, IP tracking, and one-time-use download tokens</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  If you discover your products being redistributed without authorisation, please contact 
                  support with the leaked file and we will investigate using the embedded watermark data.
                </p>
              </section>

              {/* Prohibited Activities */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Ban className="h-6 w-6 text-destructive" />
                  Prohibited Activities
                </h2>
                <p className="text-muted-foreground mb-4">
                  The following activities are strictly prohibited:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Selling stolen, leaked, or pirated content</li>
                  <li>Price manipulation or fraudulent practices</li>
                  <li>Creating fake reviews or manipulating ratings</li>
                  <li>Circumventing platform fees or commission</li>
                  <li>Selling products that violate Roblox's Terms of Service</li>
                  <li>Harassing customers or other sellers</li>
                  <li>Using the platform for money laundering or illegal activities</li>
                </ul>
              </section>

              {/* Account Suspension */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                  Account Suspension & Termination
                </h2>
                <p className="text-muted-foreground">
                  We reserve the right to suspend or terminate your seller account for violations of this 
                  Agreement, our Terms of Service, or any applicable laws. In cases of serious violations, 
                  pending payouts may be withheld pending investigation.
                </p>
                <p className="text-muted-foreground mt-4">
                  You may close your store at any time by contacting support. Upon closure, you will 
                  receive any outstanding balance after a 30-day waiting period to account for potential 
                  refund requests.
                </p>
              </section>

              {/* Refunds & Disputes */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-primary" />
                  Refunds & Disputes
                </h2>
                <p className="text-muted-foreground">
                  Refunds are handled according to our platform Refund Policy. When a refund is issued, 
                  the corresponding commission will be deducted from your balance. You agree to work 
                  with us in good faith to resolve any customer disputes.
                </p>
                <p className="text-muted-foreground mt-4">
                  In cases of chargebacks, you may be responsible for chargeback fees if the chargeback 
                  results from your failure to deliver products as described or other seller-related issues.
                </p>
              </section>

              {/* Third-Party Platforms */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Globe className="h-6 w-6 text-primary" />
                  Third-Party Platforms
                </h2>
                <p className="text-muted-foreground">
                  Products sold on {SITE_NAME} are designed for use with Roblox. You acknowledge that 
                  changes to Roblox's platform may affect product functionality. We are not responsible 
                  for issues arising from third-party platform changes.
                </p>
              </section>

              {/* Changes to Agreement */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="h-6 w-6 text-primary" />
                  Changes to This Agreement
                </h2>
                <p className="text-muted-foreground">
                  We may update this Agreement from time to time. We will notify you of significant 
                  changes via email or through the seller dashboard. Continued use of the platform 
                  after changes constitutes acceptance of the updated terms.
                </p>
              </section>

              {/* Contact */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Mail className="h-6 w-6 text-primary" />
                  Contact Us
                </h2>
                <p className="text-muted-foreground">
                  If you have any questions about this Agreement, please contact our seller support team 
                  through the live chat feature or Discord server.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>

        {/* Sign Agreement Section */}
        {!hasSigned && isOwner && (
          <Card className="border-primary/30">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                  />
                  <label
                    htmlFor="agree"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    I, as the owner of <strong>{store?.name}</strong>, have read and agree to be bound by 
                    these Seller Terms of Service. I understand that this agreement governs my use of the 
                    {SITE_NAME} marketplace and my obligations as a seller.
                  </label>
                </div>
                <div className="flex justify-end gap-3">
                  <Link to="/seller/documents">
                    <Button variant="outline">Cancel</Button>
                  </Link>
                  <Button 
                    onClick={handleSign}
                    disabled={signMutation.isPending || !agreed}
                    className="gap-2"
                  >
                    {signMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Sign Agreement
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Non-Owner Message */}
        {!hasSigned && !isOwner && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-500">Owner Signature Required</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Only the store owner can sign this agreement. Please contact the store owner to 
                    complete this requirement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SellerLayout>
  );
}