import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Mail, AlertTriangle, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const SITE_NAME = 'Eclipse';
const CONTACT_EMAIL = 'legal@eclipserblx.com';

export default function DMCA() {
  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-display font-bold">DMCA & IP Policy</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {SITE_NAME} respects the intellectual property rights of others and expects our users to do the same.
            </p>
          </div>

          {/* Quick Actions */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Need to report a violation?</h3>
                  <p className="text-sm text-muted-foreground">
                    Use the "Report IP Violation" button on any product page
                  </p>
                </div>
                <Button asChild>
                  <Link to="/products">Browse Products</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Policy Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                {SITE_NAME} operates as a marketplace for digital assets, primarily Roblox-related content. 
                We take intellectual property rights seriously and have implemented this policy to address 
                claims of copyright infringement, trademark violations, and unauthorized distribution of 
                digital assets.
              </p>
              <p>
                In accordance with the Digital Millennium Copyright Act (DMCA) and similar UK/EU regulations, 
                we will respond expeditiously to claims of intellectual property infringement that are reported 
                to us through proper channels.
              </p>
            </CardContent>
          </Card>

          {/* What We Consider Violations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Types of Violations
              </CardTitle>
              <CardDescription>
                The following are considered intellectual property violations on our platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Copyright Infringement</h4>
                  <p className="text-sm text-muted-foreground">
                    Selling or distributing content that copies another creator's original work without permission
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Trademark Violations</h4>
                  <p className="text-sm text-muted-foreground">
                    Using protected brand names, logos, or identifiers without authorization
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Stolen Assets</h4>
                  <p className="text-sm text-muted-foreground">
                    Selling Roblox models, scripts, or assets that were taken from other creators
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Unauthorized Resale</h4>
                  <p className="text-sm text-muted-foreground">
                    Reselling products purchased from other marketplaces without resale rights
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How to Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                How to Report a Violation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                If you believe that your intellectual property has been used on our platform without 
                authorization, you can report it using one of these methods:
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-4 items-start p-4 bg-muted/50 rounded-lg">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold">Use the Report Button</h4>
                    <p className="text-sm text-muted-foreground">
                      Navigate to the infringing product page and click "Report IP Violation" in the 
                      product actions. Fill out the form with your details and evidence.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-muted/50 rounded-lg">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold">Email Us Directly</h4>
                    <p className="text-sm text-muted-foreground">
                      Send a detailed report to <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a> with:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                      <li>Your contact information</li>
                      <li>Description of the copyrighted work</li>
                      <li>URL of the infringing product</li>
                      <li>Statement of good faith belief</li>
                      <li>Statement of accuracy under penalty of perjury</li>
                      <li>Your physical or electronic signature</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Our Process */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Our Review Process
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-500 font-semibold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Report Received</h4>
                    <p className="text-sm text-muted-foreground">
                      We acknowledge receipt within 24 hours and begin review
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-500 font-semibold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Investigation</h4>
                    <p className="text-sm text-muted-foreground">
                      We review the claim, contact the seller, and gather evidence
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Action Taken</h4>
                    <p className="text-sm text-muted-foreground">
                      If valid, we remove the content and may take action against the seller
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Resolution</h4>
                    <p className="text-sm text-muted-foreground">
                      We notify all parties of the outcome
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Counter-Notice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-amber-500" />
                Counter-Notice Procedure
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                If you believe your content was removed in error or that you have the right to use 
                the material, you may submit a counter-notice. Your counter-notice must include:
              </p>
              <ul>
                <li>Your physical or electronic signature</li>
                <li>Identification of the material that was removed</li>
                <li>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake</li>
                <li>Your name, address, and phone number</li>
                <li>A statement that you consent to the jurisdiction of the courts</li>
              </ul>
              <p>
                Upon receipt of a valid counter-notice, we will forward it to the original complainant. 
                If they do not file a court action within 10-14 business days, we may restore the content.
              </p>
            </CardContent>
          </Card>

          {/* Repeat Offenders */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Repeat Infringer Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                We maintain a strict policy against repeat infringers. Sellers who receive multiple 
                valid IP violation claims will face escalating consequences:
              </p>
              <ul>
                <li><strong>First offense:</strong> Warning and content removal</li>
                <li><strong>Second offense:</strong> Temporary store suspension (7 days)</li>
                <li><strong>Third offense:</strong> Permanent account termination</li>
              </ul>
              <p>
                We reserve the right to immediately terminate accounts in cases of egregious or 
                willful infringement.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Designated Agent</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                For DMCA notices and IP-related inquiries, contact our designated agent:
              </p>
              <div className="p-4 bg-muted/50 rounded-lg not-prose">
                <p className="font-semibold">{SITE_NAME} Legal Team</p>
                <p className="text-sm text-muted-foreground">
                  Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Last Updated */}
          <p className="text-center text-sm text-muted-foreground">
            Last updated: February 2025
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
