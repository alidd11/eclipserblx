import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquare, Ticket, ExternalLink, CheckCircle, Clock, Shield, Key, Copy, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { showSuccessNotification } from '@/lib/nativeNotification';
import { Badge } from '@/components/ui/badge';

interface InstallationCode {
  id: string;
  installation_code: string;
  product_name: string;
  is_used: boolean;
  created_at: string;
  expires_at: string;
}

export default function BotInstallation() {
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: installationCodes, isLoading } = useQuery({
    queryKey: ['bot-installation-codes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('bot_installation_codes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as InstallationCode[];
    },
    enabled: !!user,
  });

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showSuccessNotification('Copied!', 'Installation code copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const activeCode = installationCodes?.find(c => !c.is_used);
  const usedCodes = installationCodes?.filter(c => c.is_used) || [];

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

        {/* Installation Codes Section */}
        {user && (
          <Card className="border-green-500/30 bg-green-500/5 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-500">
                <Key className="h-5 w-5" />
                Your Installation Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Loading your codes...</p>
              ) : !installationCodes?.length ? (
                <p className="text-muted-foreground">
                  No installation codes found. Purchase a bot to receive your unique installation code.
                </p>
              ) : (
                <div className="space-y-4">
                  {activeCode && (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{activeCode.product_name}</p>
                          <p className="font-mono text-lg font-bold text-green-500 tracking-wider">
                            {activeCode.installation_code}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCode(activeCode.installation_code)}
                          className="shrink-0"
                        >
                          {copiedCode === activeCode.installation_code ? (
                            <>
                              <CheckCheck className="h-4 w-4 mr-2" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Code
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Provide this code when opening a support ticket for installation
                      </p>
                    </div>
                  )}
                  
                  {usedCodes.length > 0 && (
                    <div className="pt-2">
                      <p className="text-sm font-medium mb-2">Previously Used Codes</p>
                      <div className="space-y-2">
                        {usedCodes.map((code) => (
                          <div key={code.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div>
                              <p className="text-sm text-muted-foreground">{code.product_name}</p>
                              <p className="font-mono text-sm text-muted-foreground line-through">
                                {code.installation_code}
                              </p>
                            </div>
                            <Badge variant="secondary">Used</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                  with your specific requirements and platform settings. Please open a support ticket with your 
                  <strong className="text-green-500"> Installation Code</strong> to begin the installation process.
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
                      Create a support ticket either through our website or Discord server. Include your 
                      <strong className="text-green-500"> Installation Code</strong> (shown above if logged in).
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild>
                        <Link to="/support">
                          <Ticket className="h-4 w-4 mr-2" />
                          Open Website Ticket
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <a href="https://discord.gg/EmQnXwv6VZ" target="_blank" rel="noopener noreferrer">
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
                        <span>Your <strong className="text-green-500">Installation Code</strong> from your purchase email</span>
                      </li>
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
