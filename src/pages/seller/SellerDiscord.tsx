import { SellerLayout } from '@/components/seller/SellerLayout';
import { ScheduledAnnouncementCard } from '@/components/seller/ScheduledAnnouncementCard';
import { DiscordRolePingsCard } from '@/components/seller/DiscordRolePingsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { MessageSquare, Settings, ExternalLink } from 'lucide-react';

export default function SellerDiscord() {
  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Discord Integration</h1>
          <p className="text-muted-foreground">
            Connect with your community through Discord announcements and notifications.
          </p>
        </div>

        {/* Announcement Card */}
        <ScheduledAnnouncementCard />

        {/* Role Pings Card */}
        <DiscordRolePingsCard />

        {/* Configuration Hint */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Discord Settings
            </CardTitle>
            <CardDescription>
              Configure your Discord webhook URL and notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              To enable Discord announcements, you need to configure your Discord webhook URL in your notification settings. 
              This allows you to send product releases, promotions, and custom announcements directly to your Discord server.
            </p>
            <Button variant="outline" asChild>
              <Link to="/seller/settings/notifications">
                <Settings className="h-4 w-4 mr-2" />
                Configure Discord Webhook
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
