import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Settings, 
  ChevronLeft, 
  Save, 
  Loader2, 
  Server,
  CheckCircle,
  Hash,
  Zap,
  Shield
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GuildSettings {
  id: string;
  guild_id: string;
  settings: Record<string, unknown>;
  prefix: string;
  enabled_features: string[];
  disabled_features: string[];
  bot_installation_codes?: {
    product_name: string;
    license_status: string;
  };
}

export default function BotDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const codeId = searchParams.get('code');

  const [prefix, setPrefix] = useState('!');
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(new Set());

  // Fetch user's bot installations
  const { data: installations, isLoading: loadingInstallations } = useQuery({
    queryKey: ['user-bot-installations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('bot_installation_codes')
        .select(`
          id,
          installation_code,
          product_name,
          guild_id,
          discord_guild_name,
          discord_guild_icon,
          license_status,
          activated_at,
          bot_product_id
        `)
        .eq('user_id', user.id)
        .eq('license_status', 'active')
        .not('guild_id', 'is', null)
        .order('activated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Find the selected installation
  const selectedInstallation = codeId 
    ? installations?.find(i => i.id === codeId)
    : installations?.[0];

  // Fetch guild settings for selected installation
  const { data: guildSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['bot-guild-settings', selectedInstallation?.guild_id, selectedInstallation?.bot_product_id],
    queryFn: async () => {
      if (!selectedInstallation?.guild_id || !selectedInstallation?.bot_product_id) return null;
      
      const { data, error } = await supabase.functions.invoke('bot-guild-settings', {
        body: {},
        headers: {},
      });

      // Use URL params approach since the function expects query params
      const params = new URLSearchParams({
        guild_id: selectedInstallation.guild_id,
        bot_product_id: selectedInstallation.bot_product_id,
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-guild-settings?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch settings');
      const result = await response.json();
      return result.settings as GuildSettings | null;
    },
    enabled: !!selectedInstallation?.guild_id && !!selectedInstallation?.bot_product_id,
  });

  // Update local state when settings are fetched
  useEffect(() => {
    if (guildSettings) {
      setPrefix(guildSettings.prefix || '!');
      setEnabledFeatures(new Set(guildSettings.enabled_features || []));
    }
  }, [guildSettings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInstallation?.guild_id || !selectedInstallation?.bot_product_id) {
        throw new Error('No installation selected');
      }

      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-guild-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            guildId: selectedInstallation.guild_id,
            botProductId: selectedInstallation.bot_product_id,
            prefix,
            enabledFeatures: Array.from(enabledFeatures),
            disabledFeatures: AVAILABLE_FEATURES.filter(f => !enabledFeatures.has(f.id)).map(f => f.id),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-guild-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });

  const toggleFeature = (featureId: string) => {
    setEnabledFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-4">
          <h1 className="text-2xl font-display font-bold">Please Sign In</h1>
          <p className="text-muted-foreground">You need to be signed in to manage your bots.</p>
          <Button asChild className="gradient-button border-0">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (loadingInstallations) {
    return (
      <MainLayout>
        <div className="container py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!installations?.length) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-4 max-w-lg mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Bot className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold">No Active Bots</h1>
          <p className="text-muted-foreground">
            You don't have any bots installed yet. Purchase a bot and add it to your server to get started.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline">
              <Link to="/downloads">My Downloads</Link>
            </Button>
            <Button asChild className="gradient-button border-0">
              <Link to="/products">Browse Bots</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        <div className="space-y-2 mb-8">
          <Link 
            to="/downloads" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Downloads
          </Link>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Settings className="h-8 w-8" />
            Bot Dashboard
          </h1>
          <p className="text-muted-foreground">
            Configure settings for your installed bots
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Server List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-5 w-5" />
                Your Servers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {installations.map((install) => (
                <Link
                  key={install.id}
                  to={`/bot-dashboard?code=${install.id}`}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedInstallation?.id === install.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted'
                  }`}
                >
                  {install.discord_guild_icon ? (
                    <img 
                      src={install.discord_guild_icon} 
                      alt={install.discord_guild_name || 'Server'} 
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Server className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {install.discord_guild_name || 'Unknown Server'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {install.product_name}
                    </p>
                  </div>
                  {install.license_status === 'active' && (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Settings Panel */}
          <div className="space-y-6">
            {selectedInstallation ? (
              <>
                {/* Server Header */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      {selectedInstallation.discord_guild_icon ? (
                        <img 
                          src={selectedInstallation.discord_guild_icon} 
                          alt={selectedInstallation.discord_guild_name || 'Server'} 
                          className="w-16 h-16 rounded-full"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <Server className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold">
                          {selectedInstallation.discord_guild_name || 'Unknown Server'}
                        </h2>
                        <p className="text-muted-foreground">
                          {selectedInstallation.product_name}
                        </p>
                        <Badge 
                          variant="outline" 
                          className="mt-1 bg-green-500/10 text-green-500 border-green-500/30"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* General Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="h-5 w-5" />
                      General Settings
                    </CardTitle>
                    <CardDescription>
                      Configure basic bot settings for this server
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="prefix">Command Prefix</Label>
                      <Input
                        id="prefix"
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        placeholder="!"
                        className="max-w-[100px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        The prefix used before bot commands (e.g., !help)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Features */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Features
                    </CardTitle>
                    <CardDescription>
                      Enable or disable bot features for this server
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {AVAILABLE_FEATURES.map((feature) => (
                      <div 
                        key={feature.id}
                        className="flex items-center justify-between py-3 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <feature.icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{feature.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={enabledFeatures.has(feature.id)}
                          onCheckedChange={() => toggleFeature(feature.id)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="gradient-button border-0"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Select a server to view and edit its bot settings
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// Available features that can be toggled
const AVAILABLE_FEATURES = [
  {
    id: 'moderation',
    name: 'Moderation',
    description: 'Auto-moderation, bans, kicks, and warnings',
    icon: Shield,
  },
  {
    id: 'welcome',
    name: 'Welcome Messages',
    description: 'Greet new members with custom messages',
    icon: Zap,
  },
  {
    id: 'logging',
    name: 'Audit Logging',
    description: 'Log server events to a channel',
    icon: Settings,
  },
  {
    id: 'autoroles',
    name: 'Auto Roles',
    description: 'Automatically assign roles to new members',
    icon: Shield,
  },
];
