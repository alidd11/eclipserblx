import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  ChevronLeft, 
  Loader2, 
  Server,
  CheckCircle,
  ExternalLink,
  Calendar,
  Hash
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function BotDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const codeId = searchParams.get('code');

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
            <Bot className="h-8 w-8" />
            My Bots
          </h1>
          <p className="text-muted-foreground">
            View your installed bots and manage them via BotGhost
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

          {/* Server Info Panel */}
          <div className="space-y-6">
            {selectedInstallation ? (
              <>
                {/* Server Header */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {selectedInstallation.discord_guild_icon ? (
                        <img 
                          src={selectedInstallation.discord_guild_icon} 
                          alt={selectedInstallation.discord_guild_name || 'Server'} 
                          className="w-20 h-20 rounded-2xl"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
                          <Server className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold">
                          {selectedInstallation.discord_guild_name || 'Unknown Server'}
                        </h2>
                        <p className="text-muted-foreground mb-3">
                          {selectedInstallation.product_name}
                        </p>
                        <Badge 
                          variant="outline" 
                          className="bg-green-500/10 text-green-500 border-green-500/30"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          License Active
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Server Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Installation Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Hash className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Server ID</p>
                          <p className="font-mono text-sm">{selectedInstallation.guild_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Activated</p>
                          <p className="text-sm">
                            {selectedInstallation.activated_at 
                              ? format(new Date(selectedInstallation.activated_at), 'MMM d, yyyy')
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* BotGhost Configuration */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">Configure Your Bot</h3>
                        <p className="text-sm text-muted-foreground">
                          Bot settings, commands, and features are managed through BotGhost's dashboard. 
                          Click below to open the configuration panel.
                        </p>
                      </div>
                      <Button 
                        asChild
                        className="gradient-button border-0 shrink-0"
                      >
                        <a 
                          href="https://botghost.com/dashboard" 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          Open BotGhost
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Select a server to view its details
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
