import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquare, Ticket, ExternalLink, CheckCircle, Clock, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BotInstallation() {
  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 mb-4">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-cinzel mb-3">Bot Installation Guide</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Thank you for purchasing a bot from Eclipse! Follow the steps below to get your bot installed and running.
          </p>
        </div>

        {/* Important Notice */}
        <Card className="border-primary/30 bg-primary/5 mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Important Information</h3>
                <p className="text-muted-foreground">
                  Bot purchases require manual installation by our team. This is to ensure your bot is properly configured 
                  with your specific requirements and platform settings. Please open a support ticket to begin the installation process.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-6 mb-10">
          <h2 className="text-2xl font-semibold font-cinzel">Installation Steps</h2>
          
          <div className="grid gap-4">
            {/* Step 1 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Open a Support Ticket</h3>
                    <p className="text-muted-foreground mb-4">
                      Create a support ticket either through our website or Discord server. Include your order ID 
                      and the bot you purchased.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild>
                        <Link to="/support">
                          <Ticket className="h-4 w-4 mr-2" />
                          Open Website Ticket
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <a href="https://discord.gg/lovable-dev" target="_blank" rel="noopener noreferrer">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Discord Support
                          <ExternalLink className="h-3 w-3 ml-2" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Provide Required Information</h3>
                    <p className="text-muted-foreground mb-3">
                      Our team will ask you for the necessary details to configure your bot. This may include:
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 shrink-0" />
                        <span>Discord server ID or Roblox game/group information</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 shrink-0" />
                        <span>Bot permissions and role configuration preferences</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 shrink-0" />
                        <span>Any custom settings or features you'd like enabled</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 shrink-0" />
                        <span>API keys or tokens if applicable</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Installation & Configuration</h3>
                    <p className="text-muted-foreground">
                      Our team will install and configure your bot within <strong>24-48 hours</strong> of receiving 
                      all required information. You'll be notified via your ticket when the installation is complete.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Testing & Handover</h3>
                    <p className="text-muted-foreground">
                      Once installed, we'll guide you through testing the bot's features and provide any 
                      documentation or instructions for ongoing use.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Timeline */}
        <Card className="mb-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Expected Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">1-2 hrs</p>
                <p className="text-sm text-muted-foreground">Ticket Response</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">24-48 hrs</p>
                <p className="text-sm text-muted-foreground">Installation</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">Same Day</p>
                <p className="text-sm text-muted-foreground">Handover & Testing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
              <p className="text-muted-foreground mb-4">
                If you have any questions about the installation process, don't hesitate to reach out.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" asChild>
                  <Link to="/faq">View FAQ</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
