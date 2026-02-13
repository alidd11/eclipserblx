import { SellerLayout } from '@/components/seller/SellerLayout';
import { AddPortalBotCard } from '@/components/seller/AddPortalBotCard';
import { ScheduledAnnouncementCard } from '@/components/seller/ScheduledAnnouncementCard';
import { DiscordRolePingsCard } from '@/components/seller/DiscordRolePingsCard';
import { DiscordServerOverview } from '@/components/seller/DiscordServerOverview';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';

export default function SellerDiscord() {
  return (
    <SellerLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Discord Integration</h1>
          <p className="text-muted-foreground text-sm">
            Promote your store and engage your community through Discord.
          </p>
        </div>

        {/* Server Stats Overview */}
        <DiscordServerOverview />

        {/* Portal Bot Card */}
        <AddPortalBotCard />

        {/* Announcement Card with Templates + Preview */}
        <ScheduledAnnouncementCard />

        {/* Role Pings Card */}
        <DiscordRolePingsCard />

        {/* Webhook Config Link */}
        <Card className="border-border/50">
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Configure your Discord webhook URL for fallback announcements
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0 self-start sm:self-auto">
              <Link to="/seller/settings/notifications">
                Configure
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
