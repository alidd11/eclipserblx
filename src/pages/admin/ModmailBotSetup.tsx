import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  FileCode, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  ExternalLink,
  Terminal,
  Key,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function ModmailBotSetup() {
  const handleDownloadCog = () => {
    window.open('/modmail-bot-files/dashboard_webhook.py', '_blank');
  };

  const handleDownloadInstructions = () => {
    window.open('/modmail-bot-files/SETUP_INSTRUCTIONS.md', '_blank');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const configExample = `"dashboard_webhook_url": "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/discord-modmail-webhook",
"dashboard_webhook_secret": "your-secret-key-here"`;

  return (
    <AdminLayout requiredPermissions={['manage_settings']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Discord Modmail Bot Setup</h1>
          <p className="text-muted-foreground mt-1">
            Configure the integration between your Discord modmail bot and this dashboard
          </p>
        </div>

        {/* Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Integration Overview
            </CardTitle>
            <CardDescription>
              This integration allows staff to reply to Discord modmail tickets directly from the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <ExternalLink className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Incoming Messages</h4>
                  <p className="text-sm text-muted-foreground">
                    User DMs → Bot forwards to dashboard webhook → Ticket created/updated
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <ExternalLink className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Outgoing Replies</h4>
                  <p className="text-sm text-muted-foreground">
                    Staff reply in dashboard → Edge function → Discord API → User receives DM
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Download Files */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Step 1: Download Required Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileCode className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">dashboard_webhook.py</p>
                    <p className="text-sm text-muted-foreground">Discord cog for webhook integration</p>
                  </div>
                </div>
                <Button onClick={handleDownloadCog} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileCode className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">SETUP_INSTRUCTIONS.md</p>
                    <p className="text-sm text-muted-foreground">Full setup guide</p>
                  </div>
                </div>
                <Button onClick={handleDownloadInstructions} size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Installation Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Step 2: Install the Cog
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <div>
                  <p className="font-medium">Place the file in your bot's cogs folder</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded mt-1 inline-block">
                    your-bot/cogs/dashboard_webhook.py
                  </code>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <div>
                  <p className="font-medium">Install aiohttp dependency (if not already installed)</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded mt-1 inline-block">
                    pip install aiohttp
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Step 3: Configure Your Bot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add these settings to your bot's <code className="bg-muted px-1 rounded">config.json</code>:
            </p>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>{configExample}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(configExample, 'Config')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-500">Important Security Note</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The <code className="bg-muted px-1 rounded">dashboard_webhook_secret</code> must match 
                    the <code className="bg-muted px-1 rounded">DISCORD_WEBHOOK_SECRET</code> configured 
                    in Cloud secrets. Use a strong, random string (32+ characters).
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Restart & Verify */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Step 4: Restart & Verify
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Restart your Discord bot</p>
                  <p className="text-sm text-muted-foreground">
                    The cog will auto-load on startup
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Test the connection</p>
                  <p className="text-sm text-muted-foreground">
                    Run <code className="bg-muted px-1 rounded">?dashboard_status</code> in Discord to verify the webhook is configured
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Send a test DM</p>
                  <p className="text-sm text-muted-foreground">
                    DM your bot from a non-staff account and verify the ticket appears in the dashboard
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <p className="font-medium">Messages not appearing in dashboard?</p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>Check bot console for webhook errors</li>
                  <li>Verify the webhook URL is correct</li>
                  <li>Ensure the secret matches on both sides</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="font-medium">Staff replies not sending?</p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>Verify DISCORD_BOT_TOKEN is set in Cloud secrets</li>
                  <li>Check edge function logs for errors</li>
                  <li>Ensure the bot has permission to DM users</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
