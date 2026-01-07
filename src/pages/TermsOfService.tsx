import { MainLayout } from '@/components/layout/MainLayout';
import { SITE_NAME } from '@/lib/constants';
import { FileText, AlertTriangle, Scale, ShieldCheck, Ban, CreditCard, Globe, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function TermsOfService() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="font-display text-4xl font-bold gradient-text mb-4 text-center">
          Terms of Service
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Main Content Card */}
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
                  Welcome to {SITE_NAME}. These Terms of Service ("Terms") govern your use of our website 
                  and the purchase of digital products from our platform. By accessing our website or 
                  making a purchase, you agree to be bound by these Terms.
                </p>
                <p className="text-muted-foreground mt-4">
                  These Terms are governed by the laws of England and Wales. If you are a consumer, you 
                  will benefit from any mandatory provisions of the law of the country in which you are resident.
                </p>
              </section>

          {/* About Us */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">About Us</h2>
            <p className="text-muted-foreground">
              {SITE_NAME} is a digital marketplace specializing in assets for UK roleplay servers on the 
              Roblox platform. We sell digital products including but not limited to liveries, scripts, 
              3D models, and other digital content.
            </p>
          </section>

          {/* Definitions */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Definitions</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>"Digital Content"</strong> means data produced and supplied in digital form</li>
              <li><strong>"Products"</strong> refers to the digital content available for purchase on our platform</li>
              <li><strong>"You/Your"</strong> refers to the person accessing the website or purchasing products</li>
              <li><strong>"We/Us/Our"</strong> refers to {SITE_NAME}</li>
            </ul>
          </section>

          {/* Account Terms */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Account Terms
            </h2>
            <p className="text-muted-foreground mb-4">
              To purchase products, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Be at least 13 years old (or 16 in the EU/UK for GDPR purposes)</li>
              <li>Have parental/guardian consent if under 18</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          {/* Digital Content Rights */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />
              Digital Content Rights (Consumer Rights Act 2015)
            </h2>
            <Card className="glass-card mb-4">
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  Under the Consumer Rights Act 2015, digital content supplied must be:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-4">
                  <li><strong>Of satisfactory quality</strong> - including being free from defects, safe, and durable</li>
                  <li><strong>Fit for a particular purpose</strong> - suitable for any purpose we have agreed</li>
                  <li><strong>As described</strong> - matching any description, sample, or demonstration</li>
                </ul>
              </CardContent>
            </Card>
            <p className="text-muted-foreground">
              If digital content does not meet these standards, you may be entitled to a repair, 
              replacement, or refund. See our Refund Policy for details.
            </p>
          </section>

          {/* Licence Grant */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Licence Grant</h2>
            <p className="text-muted-foreground mb-4">
              Upon successful purchase, we grant you a non-exclusive, non-transferable licence to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Use the digital content for personal or server use within Roblox</li>
              <li>Modify the content for your own use (where technically possible)</li>
              <li>Use the content on servers you own or operate</li>
            </ul>
            
            <h3 className="font-semibold text-lg mt-6 mb-3">You may NOT:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Resell, redistribute, or share purchased content</li>
              <li>Claim ownership or authorship of our products</li>
              <li>Use content in a way that competes with our business</li>
              <li>Remove any watermarks, credits, or attribution</li>
              <li>Use content for illegal purposes</li>
            </ul>
          </section>

          {/* Pricing and Payment */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              Pricing and Payment
            </h2>
            <p className="text-muted-foreground mb-4">
              All prices are displayed in GBP (£) and include VAT where applicable. We reserve 
              the right to change prices at any time, but changes will not affect orders already placed.
            </p>
            <p className="text-muted-foreground">
              Payment is processed securely through Stripe. We do not store your full payment 
              card details. By making a purchase, you confirm that you are authorized to use 
              the payment method provided.
            </p>
          </section>

          {/* Delivery */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Delivery of Digital Content</h2>
            <p className="text-muted-foreground">
              Digital content is delivered immediately upon successful payment confirmation. 
              You will receive access to download your purchases through your account dashboard. 
              In accordance with the Consumer Contracts Regulations 2013, by proceeding with 
              your purchase you consent to immediate supply of digital content and acknowledge 
              that you will lose your 14-day cancellation right once the download begins.
            </p>
          </section>

          {/* Prohibited Uses */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <Ban className="h-6 w-6 text-destructive" />
              Prohibited Uses
            </h2>
            <p className="text-muted-foreground mb-4">
              You agree not to use our platform or products to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon intellectual property rights</li>
              <li>Distribute malware or harmful code</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Engage in fraudulent activities</li>
              <li>Circumvent any technological protection measures</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content on this website, including but not limited to text, graphics, logos, 
              images, and digital products, is the property of {SITE_NAME} or our content creators 
              and is protected by UK and international copyright laws. The purchase of a product 
              grants you a licence to use that product; it does not transfer ownership of the 
              underlying intellectual property.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-primary" />
              Limitation of Liability
            </h2>
            <p className="text-muted-foreground mb-4">
              To the fullest extent permitted by law:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability is limited to the amount you paid for the relevant product</li>
              <li>We are not responsible for any loss of data or business interruption</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Nothing in these Terms limits or excludes liability for death or personal injury 
              caused by negligence, fraud, or any other liability that cannot be limited by law.
            </p>
          </section>

          {/* Third-Party Platforms */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Third-Party Platforms
            </h2>
            <p className="text-muted-foreground">
              Our products are designed for use with Roblox, a third-party platform. We are not 
              affiliated with Roblox Corporation. Your use of Roblox is subject to their terms 
              of service. We are not responsible for any changes to Roblox that may affect the 
              functionality of our products.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account and access to our services immediately, 
              without prior notice, if you breach these Terms. Upon termination, your right to 
              use the platform ceases immediately, but previously purchased content remains 
              available for download subject to our refund policy.
            </p>
          </section>

          {/* Dispute Resolution */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Dispute Resolution</h2>
            <p className="text-muted-foreground">
              If you have a dispute with us, please contact us first to try to resolve it. 
              If we cannot resolve the matter informally, disputes will be subject to the 
              exclusive jurisdiction of the courts of England and Wales. If you are a consumer, 
              you may also be able to submit disputes to the Online Dispute Resolution platform 
              at{' '}
              <a 
                href="https://ec.europa.eu/consumers/odr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                ec.europa.eu/consumers/odr
              </a>.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Changes to These Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will provide notice of 
              significant changes by posting the updated Terms on this page. Your continued use 
              of the platform after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* Severability */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Severability</h2>
            <p className="text-muted-foreground">
              If any provision of these Terms is found to be invalid or unenforceable, that 
              provision will be limited or eliminated to the minimum extent necessary, and the 
              remaining provisions will remain in full force and effect.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Contact Us
            </h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms of Service, please contact us through our{' '}
              <a 
                href="https://discord.gg/d3Tq4KbNwq" 
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