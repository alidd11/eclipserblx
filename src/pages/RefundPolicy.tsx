import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { SITE_NAME } from '@/lib/constants';
import { AlertCircle, CheckCircle, XCircle, Scale, Clock, Mail } from 'lucide-react';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';

export default function RefundPolicy() {
  const { discordUrl } = useDiscordUrl();
  usePageTracking({ pagePath: '/refund-policy' });
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="font-display text-4xl font-bold gradient-text mb-4 text-center">
          Refund Policy
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Important Notice */}
        <Card className="glass-card border-primary/50 mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Scale className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">UK Consumer Rights for Digital Content</h3>
                <p className="text-sm text-muted-foreground">
                  This policy complies with the Consumer Rights Act 2015 and the Consumer Contracts 
                  (Information, Cancellation and Additional Charges) Regulations 2013, which govern 
                  digital content purchases in the United Kingdom.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Card */}
        <Card className="bg-card border-border">
          <CardContent className="pt-8 pb-8">
            <div className="prose prose-invert max-w-none space-y-8">
              {/* Digital Content Rights */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-primary" />
                  Digital Content and Your Rights
                </h2>
                <p className="text-muted-foreground mb-4">
                  Under the Consumer Rights Act 2015, digital content (including digital downloads, scripts, 
                  liveries, and other digital assets) must be:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Of satisfactory quality</strong> - Free from defects, safe, and durable</li>
                  <li><strong>Fit for purpose</strong> - Suitable for any purpose you made known to us</li>
                  <li><strong>As described</strong> - Match the description, sample, or model shown</li>
                </ul>
              </section>

          {/* 14-Day Cancellation Right */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              14-Day Cancellation Period
            </h2>
            <Card className="glass-card mb-4">
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-4">
                  Under the Consumer Contracts Regulations 2013, you normally have 14 days to cancel 
                  a purchase made online. However, for digital content:
                </p>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-destructive">
                    <strong>Important:</strong> Once you download or access digital content, you lose 
                    your right to cancel under the 14-day cooling-off period. By proceeding with a 
                    download, you acknowledge and agree to this.
                  </p>
                </div>
              </CardContent>
            </Card>
            <p className="text-muted-foreground">
              Before purchasing, we ask you to expressly consent to the immediate supply of digital 
              content and acknowledge that you will lose your cancellation rights once the download 
              begins or access is granted.
            </p>
          </section>

          {/* When We Will Refund */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              When You Are Entitled to a Refund
            </h2>
            <p className="text-muted-foreground mb-4">
              You are entitled to a full or partial refund in the following circumstances:
            </p>
            <div className="space-y-4">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">Faulty Digital Content</h4>
                  <p className="text-sm text-muted-foreground">
                    If the digital content is faulty, corrupted, or doesn't work as described, you have 
                    30 days from purchase to request a full refund. We may first attempt to provide a 
                    replacement or repair.
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">Content Not As Described</h4>
                  <p className="text-sm text-muted-foreground">
                    If the digital content significantly differs from its description or preview images, 
                    you may request a refund within 30 days of purchase.
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">Download Issues (Our Fault)</h4>
                  <p className="text-sm text-muted-foreground">
                    If you cannot access or download your purchased content due to issues on our end 
                    that we cannot resolve within a reasonable timeframe, you are entitled to a full refund.
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">Duplicate Purchase</h4>
                  <p className="text-sm text-muted-foreground">
                    If you accidentally purchase the same item twice, contact us within 7 days for a 
                    refund on the duplicate purchase.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* When We Won't Refund */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              When Refunds Are Not Available
            </h2>
            <p className="text-muted-foreground mb-4">
              In accordance with UK law, refunds are generally not available in these circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>You have already downloaded or accessed the digital content</li>
              <li>You change your mind after downloading (buyer's remorse)</li>
              <li>The content doesn't suit your personal preferences (unless misrepresented)</li>
              <li>Your device or software is incompatible (where compatibility was stated)</li>
              <li>You purchased the wrong item without contacting us first</li>
              <li>More than 30 days have passed since purchase for faulty content claims</li>
            </ul>
          </section>

          {/* Eclipse+ Subscriptions */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Eclipse+ Membership Refunds</h2>
            <p className="text-muted-foreground mb-4">
              Eclipse+ subscriptions are recurring monthly payments. Regarding refunds:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>You may cancel your subscription at any time to prevent future charges</li>
              <li>Refunds for subscription payments are not provided once the billing period has started</li>
              <li>Products claimed for free using Eclipse+ benefits cannot be refunded separately</li>
              <li>Eclipse+ discounts applied at checkout represent the final price and are non-refundable as separate items</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>Note:</strong> Eclipse+ membership discounts cannot be combined with promotional 
              discount codes. When Eclipse+ discounts are applied, no additional promotional codes can be used.
            </p>
          </section>

          {/* How to Request */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              How to Request a Refund
            </h2>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <ol className="list-decimal list-inside text-muted-foreground space-y-3">
                  <li>
                    Contact us via our Discord server or email within the applicable timeframe
                  </li>
                  <li>
                    Provide your order number and email address used for the purchase
                  </li>
                  <li>
                    Clearly explain the reason for your refund request with any supporting evidence
                  </li>
                  <li>
                    We will review your request and respond within 5 business days
                  </li>
                  <li>
                    If approved, refunds are processed within 14 days to your original payment method
                  </li>
                </ol>
              </CardContent>
            </Card>
          </section>

          {/* Legal Rights */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Your Statutory Rights</h2>
            <p className="text-muted-foreground mb-4">
              This refund policy does not affect your statutory rights under UK consumer law. 
              Nothing in this policy is intended to limit any rights you have under:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>The Consumer Rights Act 2015</li>
              <li>The Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013</li>
              <li>The Electronic Commerce (EC Directive) Regulations 2002</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              For more information about your consumer rights, visit{' '}
              <a 
                href="https://www.citizensadvice.org.uk/consumer/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Citizens Advice
              </a>
              {' '}or{' '}
              <a 
                href="https://www.gov.uk/consumer-protection-rights" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GOV.UK Consumer Rights
              </a>.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Refund Policy, please contact us through our{' '}
              <a 
                href={discordUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Discord server
              </a>
              {' '}or use the live chat feature on our website.
            </p>
            </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}