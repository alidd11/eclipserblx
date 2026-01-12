import { MainLayout } from '@/components/layout/MainLayout';
import { SITE_NAME } from '@/lib/constants';
import { Shield, Database, Cookie, UserCheck, Globe, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function PrivacyPolicy() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="font-display text-4xl font-bold gradient-text mb-4 text-center">
          Privacy Policy
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
                  <Shield className="h-6 w-6 text-primary" />
                  Introduction
                </h2>
                <p className="text-muted-foreground">
                  Welcome to {SITE_NAME}. We respect your privacy and are committed to protecting your personal 
                  data. This privacy policy explains how we collect, use, and safeguard your information when 
                  you visit our website and purchase our products.
                </p>
                <p className="text-muted-foreground mt-4">
                  This policy complies with the UK General Data Protection Regulation (UK GDPR) and the 
                  Data Protection Act 2018.
                </p>
              </section>

          {/* Data We Collect */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Information We Collect
            </h2>
            
            <h3 className="font-semibold text-lg mt-6 mb-3">Personal Information</h3>
            <p className="text-muted-foreground mb-4">
              When you create an account or make a purchase, we collect:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Email address</li>
              <li>Username</li>
              <li>Account credentials (securely hashed)</li>
              <li>Purchase and order history</li>
              <li>Download records</li>
            </ul>

            <h3 className="font-semibold text-lg mt-6 mb-3">Payment Information</h3>
            <p className="text-muted-foreground">
              Payment processing is handled securely by Stripe. We do not store your full credit card 
              details on our servers. Stripe may collect additional information as per their privacy policy.
            </p>

            <h3 className="font-semibold text-lg mt-6 mb-3">Technical Information</h3>
            <p className="text-muted-foreground mb-4">
              We automatically collect:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Pages visited and time spent</li>
              <li>Referring website</li>
            </ul>
          </section>

          {/* How We Use Data */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-primary" />
              How We Use Your Information
            </h2>
            <p className="text-muted-foreground mb-4">
              We use your personal data for the following purposes:
            </p>
            <div className="grid gap-4">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">Order Fulfillment</h4>
                  <p className="text-sm text-muted-foreground">
                    Processing your purchases, providing access to digital downloads, and sending 
                    order confirmations.
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">Account Management</h4>
                  <p className="text-sm text-muted-foreground">
                    Managing your account, authentication, and providing customer support.
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">Communication</h4>
                  <p className="text-sm text-muted-foreground">
                    Sending important updates about your orders, account, or changes to our services.
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">Service Improvement</h4>
                  <p className="text-sm text-muted-foreground">
                    Analyzing usage patterns to improve our website, products, and user experience.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <Cookie className="h-6 w-6 text-primary" />
              Cookies
            </h2>
            <p className="text-muted-foreground mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Keep you signed in to your account</li>
              <li>Remember your preferences</li>
              <li>Understand how you use our website</li>
              <li>Improve our services</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You can control cookies through your browser settings. Disabling certain cookies may 
              affect website functionality.
            </p>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Data Sharing
            </h2>
            <p className="text-muted-foreground mb-4">
              We do not sell your personal data. We may share your information with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Payment processors</strong> (Stripe) to process transactions</li>
              <li><strong>Hosting providers</strong> to deliver our services</li>
              <li><strong>Law enforcement</strong> when required by law</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Your Rights Under UK GDPR</h2>
            <p className="text-muted-foreground mb-4">
              You have the following rights regarding your personal data:
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold">1.</span>
                <div>
                  <strong>Right of Access</strong>
                  <p className="text-sm text-muted-foreground">Request a copy of your personal data</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold">2.</span>
                <div>
                  <strong>Right to Rectification</strong>
                  <p className="text-sm text-muted-foreground">Request correction of inaccurate data</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold">3.</span>
                <div>
                  <strong>Right to Erasure</strong>
                  <p className="text-sm text-muted-foreground">Request deletion of your data ("right to be forgotten")</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold">4.</span>
                <div>
                  <strong>Right to Restrict Processing</strong>
                  <p className="text-sm text-muted-foreground">Request limitation of how we use your data</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold">5.</span>
                <div>
                  <strong>Right to Data Portability</strong>
                  <p className="text-sm text-muted-foreground">Receive your data in a structured, machine-readable format</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold">6.</span>
                <div>
                  <strong>Right to Object</strong>
                  <p className="text-sm text-muted-foreground">Object to processing based on legitimate interests</p>
                </div>
              </div>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your personal data for as long as necessary to fulfill the purposes outlined 
              in this policy, unless a longer retention period is required by law. Order records are 
              kept for 7 years for tax and accounting purposes.
            </p>
          </section>

          {/* Security */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate technical and organizational measures to protect your personal 
              data against unauthorized access, alteration, disclosure, or destruction. This includes 
              encryption, secure servers, and regular security assessments.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this privacy policy from time to time. We will notify you of any significant 
              changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Contact Us
            </h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy or wish to exercise your rights, 
              please contact us through our{' '}
              <a 
                href="https://discord.gg/EmQnXwv6VZ" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Discord server
              </a>
              {' '}or use the live chat feature on our website.
            </p>
            <p className="text-muted-foreground mt-4">
              You also have the right to lodge a complaint with the Information Commissioner's Office 
              (ICO) at{' '}
              <a 
                href="https://ico.org.uk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                ico.org.uk
              </a>.
            </p>
            </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}