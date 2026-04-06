import { MainLayout } from '@/components/layout/MainLayout';
import { SITE_NAME } from '@/lib/constants';
import { Shield, Database, Cookie, UserCheck, Globe, Mail, Scale, Clock, Server } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function PrivacyPolicy() {
  const { discordUrl } = useDiscordUrl();
  usePageTracking({ pagePath: '/privacy-policy' });
  usePageMeta({ title: 'Privacy Policy', description: 'Eclipse privacy policy. How we collect, use and protect your personal data on our Roblox asset marketplace.', canonicalPath: '/privacy' });
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="font-display text-4xl font-bold gradient-text mb-4 text-center">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Last updated: 6 March 2026
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
                  Welcome to {SITE_NAME} ("we", "us", "our"). We are the data controller for the personal data 
                  processed through this website. We respect your privacy and are committed to protecting your personal 
                  data. This privacy policy explains how we collect, use, and safeguard your information when 
                  you visit our website and purchase our products.
                </p>
                <p className="text-muted-foreground mt-4">
                  This policy complies with the UK General Data Protection Regulation (UK GDPR) and the 
                  Data Protection Act 2018. If you are located in the EEA, the EU GDPR also applies to you.
                </p>
              </section>

              {/* Data We Collect */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Database className="h-6 w-6 text-primary" />
                  Information We Collect
                </h2>
                
                <h3 className="font-semibold text-lg mt-6 mb-3">Personal Information You Provide</h3>
                <p className="text-muted-foreground mb-4">
                  When you create an account, make a purchase, or contact us, we collect:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Email address</li>
                  <li>Username and display name</li>
                  <li>Account credentials (securely hashed — we never store plaintext passwords)</li>
                  <li>Purchase and order history</li>
                  <li>Download records (including IP address, device information, and timestamps)</li>
                  <li>Subscription status (e.g., Eclipse+ membership)</li>
                  <li>Discord username (if you choose to link your account)</li>
                  <li>Support ticket content and correspondence</li>
                  <li>Digital watermark identifiers embedded in downloaded product files for anti-piracy purposes</li>
                </ul>

                <h3 className="font-semibold text-lg mt-6 mb-3">Payment Information</h3>
                <p className="text-muted-foreground">
                  Payment processing is handled securely by Stripe. We do not store your full credit card 
                  details on our servers. Stripe acts as an independent data controller for payment data — 
                  see <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Stripe's Privacy Policy</a>.
                </p>

                <h3 className="font-semibold text-lg mt-6 mb-3">Technical Information (Collected Automatically)</h3>
                <p className="text-muted-foreground mb-4">
                  With your consent (via our cookie banner), we automatically collect:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>IP address (hashed/anonymised after 30–90 days)</li>
                  <li>Browser type and version</li>
                  <li>Device type (desktop, mobile, tablet)</li>
                  <li>Pages visited and time spent</li>
                  <li>Referring website</li>
                  <li>A randomly generated visitor ID stored in your browser (not linked to your real identity)</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  <strong>Essential technical data</strong> (authentication session tokens, CSRF protection) is collected 
                  without consent as it is strictly necessary for the website to function.
                </p>
              </section>

              {/* Legal Bases */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Scale className="h-6 w-6 text-primary" />
                  Legal Bases for Processing (Article 6 UK GDPR)
                </h2>
                <p className="text-muted-foreground mb-4">
                  We process your personal data on the following legal bases:
                </p>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-semibold mb-1">Contract Performance (Art. 6(1)(b))</h4>
                    <p className="text-sm text-muted-foreground">
                      Processing your purchases, delivering digital downloads, managing your account, 
                      and providing customer support — all necessary to fulfil our contract with you.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-semibold mb-1">Consent (Art. 6(1)(a))</h4>
                    <p className="text-sm text-muted-foreground">
                      Analytics cookies and marketing communications. You can withdraw consent at any time 
                      via the cookie settings or by unsubscribing. Your consent preferences are recorded 
                      with a timestamp and version number for our records.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-semibold mb-1">Legitimate Interest (Art. 6(1)(f))</h4>
                    <p className="text-sm text-muted-foreground">
                      Fraud prevention, IP protection (watermarking, download tracking), platform security 
                      (rate limiting, IP ban enforcement), and service improvement. We have conducted a 
                      legitimate interest assessment for each of these purposes.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-semibold mb-1">Legal Obligation (Art. 6(1)(c))</h4>
                    <p className="text-sm text-muted-foreground">
                      Retaining financial records (orders, transactions, seller earnings, commission data) 
                      for 7 years as required by UK tax legislation (HMRC requirements). This includes 
                      seller transaction records and payout histories needed for tax compliance.
                    </p>
                  </div>
                </div>
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
                  <Card className="border border-border rounded-xl">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-2">Order Fulfilment</h4>
                      <p className="text-sm text-muted-foreground">
                        Processing your purchases, providing access to digital downloads, and sending 
                        order confirmations.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border border-border rounded-xl">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-2">Account Management</h4>
                      <p className="text-sm text-muted-foreground">
                        Managing your account, authentication, and providing customer support.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border border-border rounded-xl">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-2">Communication</h4>
                      <p className="text-sm text-muted-foreground">
                        Sending important updates about your orders, account, or changes to our services. 
                        We will only send marketing communications with your explicit consent.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border border-border rounded-xl">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-2">Service Improvement</h4>
                      <p className="text-sm text-muted-foreground">
                        With your consent, analysing anonymised usage patterns to improve our website, 
                        products, and user experience.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border border-border rounded-xl">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-2">Security &amp; Fraud Prevention</h4>
                      <p className="text-sm text-muted-foreground">
                        Detecting and preventing fraud, abuse, and unauthorized access. This includes 
                        download watermarking, rate limiting, and IP-based ban enforcement.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Cookies */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Cookie className="h-6 w-6 text-primary" />
                  Cookies &amp; Consent Management
                </h2>
                <p className="text-muted-foreground mb-4">
                  We use cookies and similar technologies, categorised as follows:
                </p>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-semibold mb-1">Essential Cookies (Always Active)</h4>
                    <p className="text-sm text-muted-foreground">
                      Authentication session, CSRF protection, cookie consent preference storage. 
                      These cannot be disabled as the website cannot function without them.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-semibold mb-1">Analytics Cookies (Requires Consent)</h4>
                    <p className="text-sm text-muted-foreground">
                      Page visit tracking, visitor counts, browser/device statistics. Data is anonymised 
                      and automatically deleted after 90 days.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-semibold mb-1">Marketing Cookies (Requires Consent)</h4>
                    <p className="text-sm text-muted-foreground">
                      Used for referral tracking and affiliate programme attribution.
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground mt-4">
                  You can change your cookie preferences at any time by clicking "Cookie Settings" in the 
                  website footer. When you update your preferences, we record the change with a timestamp 
                  for compliance purposes. No analytics or marketing data is collected until you give consent.
                </p>
              </section>

              {/* Data Sharing & Sub-processors */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Globe className="h-6 w-6 text-primary" />
                  Data Sharing &amp; Sub-Processors
                </h2>
                <p className="text-muted-foreground mb-4">
                  We do not sell your personal data. We share your information with the following 
                  categories of recipients:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold">Processor</th>
                        <th className="text-left py-3 px-4 font-semibold">Purpose</th>
                        <th className="text-left py-3 px-4 font-semibold">Location</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Stripe</td>
                        <td className="py-3 px-4">Payment processing &amp; identity verification</td>
                        <td className="py-3 px-4">US (EU SCCs)</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Supabase (AWS)</td>
                        <td className="py-3 px-4">Database hosting &amp; authentication</td>
                        <td className="py-3 px-4">EU (Frankfurt)</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Sentry</td>
                        <td className="py-3 px-4">Error monitoring (no PII collected)</td>
                        <td className="py-3 px-4">EU (Frankfurt)</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Resend</td>
                        <td className="py-3 px-4">Transactional email delivery</td>
                        <td className="py-3 px-4">US (EU SCCs)</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Discord</td>
                        <td className="py-3 px-4">Account linking &amp; notifications (optional)</td>
                        <td className="py-3 px-4">US (EU SCCs)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-muted-foreground mt-4">
                  Where data is transferred outside the UK/EEA, we rely on Standard Contractual Clauses (SCCs) 
                  approved by the UK ICO or the European Commission, or adequacy decisions, to ensure your 
                  data receives equivalent protection.
                </p>
                <p className="text-muted-foreground mt-2">
                  We may also share data with <strong>law enforcement</strong> when required by law or to 
                  protect our legal rights.
                </p>
              </section>

              {/* Data Retention */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="h-6 w-6 text-primary" />
                  Data Retention Schedule
                </h2>
                <p className="text-muted-foreground mb-4">
                  We retain your data only for as long as necessary. Our specific retention periods are:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold">Data Category</th>
                        <th className="text-left py-3 px-4 font-semibold">Retention Period</th>
                        <th className="text-left py-3 px-4 font-semibold">Legal Basis</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Account profile data</td>
                        <td className="py-3 px-4">Until account deletion</td>
                        <td className="py-3 px-4">Contract</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Order &amp; transaction records</td>
                        <td className="py-3 px-4">7 years</td>
                        <td className="py-3 px-4">Legal obligation (HMRC)</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Seller earnings &amp; payout records</td>
                        <td className="py-3 px-4">7 years</td>
                        <td className="py-3 px-4">Legal obligation (HMRC)</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Page visit analytics</td>
                        <td className="py-3 px-4">90 days (auto-deleted)</td>
                        <td className="py-3 px-4">Consent</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Search logs</td>
                        <td className="py-3 px-4">60 days (auto-deleted)</td>
                        <td className="py-3 px-4">Consent</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">IP address hashes</td>
                        <td className="py-3 px-4">30–90 days (anonymised)</td>
                        <td className="py-3 px-4">Legitimate interest</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Consent records</td>
                        <td className="py-3 px-4">3 years after last interaction</td>
                        <td className="py-3 px-4">Legal obligation</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Support tickets</td>
                        <td className="py-3 px-4">2 years after closure</td>
                        <td className="py-3 px-4">Legitimate interest</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Audit logs</td>
                        <td className="py-3 px-4">2 years</td>
                        <td className="py-3 px-4">Legitimate interest</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Download watermark records</td>
                        <td className="py-3 px-4">Duration of product availability</td>
                        <td className="py-3 px-4">Legitimate interest</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-muted-foreground mt-4">
                  Automated cleanup processes run regularly to enforce these retention periods. Data is 
                  permanently deleted or irreversibly anonymised when the retention period expires.
                </p>
              </section>

              {/* Your Rights */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4">Your Rights Under UK GDPR</h2>
                <p className="text-muted-foreground mb-4">
                  You have the following rights regarding your personal data. To exercise any of these rights, 
                  contact us via the methods listed below. We will respond within 30 days.
                </p>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-bold">1.</span>
                    <div>
                      <strong>Right of Access (Art. 15)</strong>
                      <p className="text-sm text-muted-foreground">Request a copy of all personal data we hold about you (Subject Access Request).</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-bold">2.</span>
                    <div>
                      <strong>Right to Rectification (Art. 16)</strong>
                      <p className="text-sm text-muted-foreground">Request correction of inaccurate data. You can update most information directly in your account settings.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-bold">3.</span>
                    <div>
                      <strong>Right to Erasure (Art. 17)</strong>
                      <p className="text-sm text-muted-foreground">
                        Request deletion of your data ("right to be forgotten"). Note: we may retain order 
                        records for 7 years due to legal obligations.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-bold">4.</span>
                    <div>
                      <strong>Right to Restrict Processing (Art. 18)</strong>
                      <p className="text-sm text-muted-foreground">Request limitation of how we use your data while we verify your concerns.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-bold">5.</span>
                    <div>
                      <strong>Right to Data Portability (Art. 20)</strong>
                      <p className="text-sm text-muted-foreground">Receive your data in a structured, machine-readable format (JSON).</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-bold">6.</span>
                    <div>
                      <strong>Right to Object (Art. 21)</strong>
                      <p className="text-sm text-muted-foreground">Object to processing based on legitimate interests. We will cease processing unless we demonstrate compelling legitimate grounds.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-bold">7.</span>
                    <div>
                      <strong>Right to Withdraw Consent</strong>
                      <p className="text-sm text-muted-foreground">
                        Withdraw consent at any time (e.g., via cookie settings). Withdrawal does not affect 
                        the lawfulness of processing before withdrawal.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Automated Decision-Making */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4">Automated Decision-Making</h2>
                <p className="text-muted-foreground">
                  We use automated systems for the following purposes:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-4">
                  <li><strong>Rate limiting:</strong> Automated IP-based throttling to prevent abuse. This may temporarily restrict access.</li>
                  <li><strong>Seller trust scoring:</strong> Automated scoring based on upload history to flag potential policy violations. Restricted sellers can appeal to our support team.</li>
                  <li><strong>Content moderation:</strong> Product submissions undergo automated checks before manual review.</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  None of these automated processes make decisions that produce legal effects or similarly 
                  significantly affect you without human review. You have the right to request human 
                  intervention for any automated decision.
                </p>
              </section>

              {/* Children's Privacy */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4">Children's Privacy</h2>
                <p className="text-muted-foreground">
                  Our services are not directed at children under 13. We do not knowingly collect personal 
                  data from children under 13. If we become aware that a child under 13 has provided us 
                  with personal data, we will take steps to delete such data. If you are a parent or guardian 
                  and believe your child has provided us with personal data, please contact us.
                </p>
              </section>

              {/* International Transfers */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Server className="h-6 w-6 text-primary" />
                  International Data Transfers
                </h2>
                <p className="text-muted-foreground">
                  Our primary database infrastructure is hosted in the EU (Frankfurt, Germany). Some of our 
                  sub-processors (Stripe, Resend, Discord) are based in the United States. For these transfers, 
                  we rely on:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-4">
                  <li>Standard Contractual Clauses (SCCs) approved by the UK ICO</li>
                  <li>The EU-US Data Privacy Framework (where applicable)</li>
                  <li>Supplementary security measures including encryption in transit and at rest</li>
                </ul>
              </section>

              {/* Security */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4">Data Security</h2>
                <p className="text-muted-foreground">
                  We implement appropriate technical and organisational measures to protect your personal 
                  data against unauthorised access, alteration, disclosure, or destruction. This includes:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-4">
                  <li>TLS encryption for all data in transit</li>
                  <li>Encryption at rest for stored data</li>
                  <li>Row-Level Security (RLS) policies ensuring users can only access their own data</li>
                  <li>Audit logging of sensitive data access by staff</li>
                  <li>Content Security Policy (CSP) headers to prevent cross-site attacks</li>
                  <li>Rate limiting and DDoS protection</li>
                  <li>Regular security assessments</li>
                </ul>
              </section>

              {/* Changes */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4">Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this privacy policy from time to time. For material changes that affect how 
                  we process your data, we will re-request your consent via the cookie banner. The "Last updated" 
                  date at the top of this page indicates when the policy was last revised.
                </p>
              </section>

              {/* Contact */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Mail className="h-6 w-6 text-primary" />
                  Contact Us
                </h2>
                <p className="text-muted-foreground">
                  If you have any questions about this Privacy Policy, wish to exercise your data rights, 
                  or want to make a complaint, please contact us through:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-4">
                  <li>Our <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord server</a></li>
                  <li>The live chat / support ticket system on our website</li>
                  <li>The contact form on our website</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  We aim to respond to all data protection requests within 30 days.
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
