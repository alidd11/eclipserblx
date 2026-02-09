import { Shield, Gavel, Bell, ScrollText, Users, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Shield,
    title: 'Cross-Server Bans',
    description: 'Ban a user once and they\'re automatically banned across all your connected servers instantly.',
    gradient: 'from-blue-600 to-blue-700',
  },
  {
    icon: Gavel,
    title: 'Slash Commands',
    description: 'Use /ban, /unban, and /bans directly in Discord to manage bans without leaving the app.',
    gradient: 'from-violet-600 to-violet-700',
  },
  {
    icon: Bell,
    title: 'Ban Logging',
    description: 'Set up a dedicated log channel with optional role pings to track all ban activity.',
    gradient: 'from-indigo-600 to-indigo-700',
  },
  {
    icon: ScrollText,
    title: 'Full Audit History',
    description: 'Every ban, unban, and revoke is recorded with timestamps, reasons, and moderator info.',
    gradient: 'from-purple-600 to-purple-700',
  },
  {
    icon: Users,
    title: 'Role-Based Permissions',
    description: 'Configure which Discord roles can view, manage, or administrate bans on your servers.',
    gradient: 'from-pink-600 to-pink-700',
  },
  {
    icon: Zap,
    title: 'Instant Sync',
    description: 'New servers automatically sync existing bans. No manual setup required.',
    gradient: 'from-amber-600 to-amber-700',
  },
];

export function FeatureCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <Card key={feature.title} className="bg-card border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-foreground text-sm md:text-base">{feature.title}</h4>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
