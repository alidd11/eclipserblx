import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, CheckCircle, Clock, Download, ExternalLink, Settings, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';

export default function BotInstallation() {
  const { user } = useAuth();
  const { discordUrl } = useDiscordUrl();

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 mb-4">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-cinzel mb-3">Bot Installation</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Adding your purchased bot to your Discord server is now easier than ever with our one-click setup.
          </p>
        </div>

        {/* Self-Service Notice */}
        <Card className="border-green-500/30 bg-green-500/5 mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <Zap className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-green-500">Instant Self-Service Setup</h3>
                <p className="text-muted-foreground">
                  No more waiting for manual installation! Simply click the <strong>"Add to Server"</strong> button 
                  on your Downloads page, authorize the bot, and it will be instantly activated on your server.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <div className="space-y-6 mb-10">
          <h2 className="text-2xl font-semibold font-cinzel">How It Works</h2>
          
          <div className="grid gap-4">
            {/* Step 1 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Go to Your Downloads</h3>
                    <p className="text-muted-foreground mb-4">
                      After purchasing a bot, visit your Downloads page to see all your purchased bots.
                    </p>
                    {user ? (
                      <Button asChild>
                        <Link to="/downloads">
                          <Download className="h-4 w-4 mr-2" />
                          View My Downloads
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild>
                        <Link to="/auth">
                          Sign In to View Downloads
                        </Link>
                      </Button>
                    )}
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
                    <h3 className="font-semibold text-lg mb-2">Click "Add to Server"</h3>
                    <p className="text-muted-foreground mb-3">
                      Each bot you've purchased will have an <strong>"Add to Server"</strong> button. Click it to start the authorization process.
                    </p>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <Bot className="h-5 w-5 text-blue-500" />
                      <span className="text-sm">Your Bot Name</span>
                      <Button size="sm" className="ml-auto gradient-button border-0" disabled>
                        <Bot className="h-4 w-4 mr-2" />
                        Add to Server
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </div>
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
                    <h3 className="font-semibold text-lg mb-2">Authorize on Discord</h3>
                    <p className="text-muted-foreground">
                      You'll be redirected to Discord to select your server and authorize the bot. 
                      Make sure you have <strong>Manage Server</strong> permissions on the server you want to add the bot to.
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
                    <h3 className="font-semibold text-lg mb-2">Bot is Ready!</h3>
                    <p className="text-muted-foreground mb-3">
                      Once authorized, your bot will be instantly activated. You can manage its settings from the bot dashboard.
                    </p>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-green-500">Your Server Name</span>
                        <span className="text-xs text-green-400/70">Installed & Running</span>
                      </div>
                      <Button size="sm" variant="outline" className="ml-auto border-primary/30 text-primary" disabled>
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Bot
                      </Button>
                    </div>
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
              How Long Does It Take?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">Instant</p>
                <p className="text-sm text-muted-foreground">Bot Activation</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">30 sec</p>
                <p className="text-sm text-muted-foreground">Total Setup Time</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">24/7</p>
                <p className="text-sm text-muted-foreground">Bot Availability</p>
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
                If you encounter any issues during setup, our support team is here to help.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" asChild>
                  <Link to="/faq">View FAQ</Link>
                </Button>
                <Button variant="outline" asChild>
                  <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                    Discord Support
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </a>
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
