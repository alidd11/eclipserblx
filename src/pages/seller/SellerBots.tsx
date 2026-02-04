import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { toast } from 'sonner';
import { Bot, Plus, Settings, Copy, Check, ExternalLink, Code, Trash2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BotProduct {
  id: string;
  product_id: string;
  discord_application_id: string;
  discord_permissions: number;
  oauth_scopes: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
  };
}

const DEFAULT_SCOPES = ['bot', 'applications.commands'];
const COMMON_PERMISSIONS = [
  { name: 'Read Messages', value: 1024 },
  { name: 'Send Messages', value: 2048 },
  { name: 'Manage Messages', value: 8192 },
  { name: 'Embed Links', value: 16384 },
  { name: 'Attach Files', value: 32768 },
  { name: 'Read Message History', value: 65536 },
  { name: 'Add Reactions', value: 64 },
  { name: 'Use Slash Commands', value: 2147483648 },
  { name: 'Manage Roles', value: 268435456 },
  { name: 'Kick Members', value: 2 },
  { name: 'Ban Members', value: 4 },
];

export default function SellerBots() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotProduct | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Form state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([2048, 16384]); // Default: Send Messages, Embed Links

  // Fetch store's products that could be bots
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-products', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, is_active')
        .eq('store_id', store.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Fetch bot products for this store
  const { data: botProducts, isLoading: botsLoading } = useQuery({
    queryKey: ['seller-bot-products', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      // Get products for this store first
      const { data: storeProducts } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', store.id);
      
      if (!storeProducts?.length) return [];
      
      const productIds = storeProducts.map(p => p.id);
      
      const { data, error } = await supabase
        .from('bot_products')
        .select(`
          *,
          product:products (
            id,
            name,
            slug,
            is_active
          )
        `)
        .in('product_id', productIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as BotProduct[];
    },
    enabled: !!store?.id,
  });

  // Products without bot config
  const availableProducts = products?.filter(
    p => !botProducts?.some(bp => bp.product_id === p.id)
  ) || [];

  const createBotMutation = useMutation({
    mutationFn: async () => {
      const permissions = selectedPermissions.reduce((acc, p) => acc | p, 0);
      
      const { error } = await supabase
        .from('bot_products')
        .insert({
          product_id: selectedProductId,
          discord_application_id: applicationId,
          discord_permissions: permissions,
          oauth_scopes: DEFAULT_SCOPES,
          is_active: true,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-bot-products'] });
      toast.success('Bot configuration created');
      resetForm();
      setShowCreateDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create bot configuration');
    },
  });

  const updateBotMutation = useMutation({
    mutationFn: async (data: { id: string; is_active?: boolean; discord_permissions?: number }) => {
      const { error } = await supabase
        .from('bot_products')
        .update(data)
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-bot-products'] });
      toast.success('Bot configuration updated');
      setShowEditDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update bot configuration');
    },
  });

  const deleteBotMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bot_products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-bot-products'] });
      toast.success('Bot configuration deleted');
      setShowEditDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete bot configuration');
    },
  });

  const resetForm = () => {
    setSelectedProductId('');
    setApplicationId('');
    setSelectedPermissions([2048, 16384]);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const togglePermission = (value: number) => {
    setSelectedPermissions(prev => 
      prev.includes(value) 
        ? prev.filter(p => p !== value)
        : [...prev, value]
    );
  };

  const apiEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seller-bot-license`;

  const isLoading = productsLoading || botsLoading;

  return (
    <SellerLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              Discord Bots
            </h1>
            <p className="text-muted-foreground mt-1">
              Register your Discord bots and enable license-based activation
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} disabled={!availableProducts.length}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bot
          </Button>
        </div>

        {/* API Documentation Card */}
        <Card className="bg-muted/30 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Code className="h-4 w-4" />
              License Validation API
            </CardTitle>
            <CardDescription>
              Use this endpoint in your Discord bot to validate installation codes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background rounded px-3 py-2 text-sm font-mono border overflow-x-auto">
                  {apiEndpoint}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(apiEndpoint, 'endpoint')}
                >
                  {copiedField === 'endpoint' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>How it works:</strong> When a customer purchases your bot, they receive an installation code. 
                Your bot calls this API with the code to validate it and get the activation details.
              </AlertDescription>
            </Alert>

            <div className="bg-background rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Example Request (from your bot)</p>
              <pre className="text-xs bg-muted rounded p-3 overflow-x-auto">
{`POST ${apiEndpoint}
Content-Type: application/json
x-seller-id: ${store?.store_id || 'YOUR_STORE_ID'}

{
  "action": "validate",
  "installation_code": "BOT-XXXX-XXXX-XXXX",
  "guild_id": "123456789012345678",
  "guild_name": "My Server"
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Bot Products List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : botProducts?.length ? (
          <div className="space-y-4">
            {botProducts.map(bot => (
              <Card key={bot.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-3 rounded-lg",
                        bot.is_active ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Bot className={cn(
                          "h-6 w-6",
                          bot.is_active ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {bot.product?.name || 'Unknown Product'}
                          <Badge variant={bot.is_active ? 'default' : 'secondary'}>
                            {bot.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Application ID: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{bot.discord_application_id}</code>
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Scopes: {bot.oauth_scopes.join(', ')}</span>
                          <span>Permissions: {bot.discord_permissions}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBot(bot);
                        setShowEditDialog(true);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-2">No bots configured</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
                Register your Discord bots here to enable license-based activation for your customers.
              </p>
              {availableProducts.length > 0 ? (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Bot
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Create a product first, then come back here to configure it as a bot.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create Bot Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Register Discord Bot</DialogTitle>
              <DialogDescription>
                Link a product to your Discord bot for license-based activation
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only products without bot configuration are shown
                </p>
              </div>

              <div className="space-y-2">
                <Label>Discord Application ID</Label>
                <Input
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  placeholder="123456789012345678"
                />
                <p className="text-xs text-muted-foreground">
                  Found in your{' '}
                  <a 
                    href="https://discord.com/developers/applications" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Discord Developer Portal <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Bot Permissions</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {COMMON_PERMISSIONS.map(perm => (
                    <label key={perm.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch
                        checked={selectedPermissions.includes(perm.value)}
                        onCheckedChange={() => togglePermission(perm.value)}
                      />
                      <span>{perm.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  These permissions are used when generating OAuth2 invite links
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createBotMutation.mutate()}
                disabled={!selectedProductId || !applicationId || createBotMutation.isPending}
              >
                {createBotMutation.isPending ? 'Creating...' : 'Create Bot Config'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Bot Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Bot Configuration</DialogTitle>
              <DialogDescription>
                {selectedBot?.product?.name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedBot && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Disable to prevent new activations
                    </p>
                  </div>
                  <Switch
                    checked={selectedBot.is_active}
                    onCheckedChange={(checked) => 
                      updateBotMutation.mutate({ id: selectedBot.id, is_active: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Application ID</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted rounded px-3 py-2 text-sm font-mono">
                      {selectedBot.discord_application_id}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(selectedBot.discord_application_id, 'appId')}
                    >
                      {copiedField === 'appId' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>OAuth2 Scopes</Label>
                  <div className="flex flex-wrap gap-1">
                    {selectedBot.oauth_scopes.map(scope => (
                      <Badge key={scope} variant="secondary">{scope}</Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Permissions Integer</Label>
                  <code className="block bg-muted rounded px-3 py-2 text-sm font-mono">
                    {selectedBot.discord_permissions}
                  </code>
                </div>

                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <Button
                      variant="link"
                      className="text-destructive p-0 h-auto"
                      onClick={() => {
                        if (confirm('Are you sure? This will remove the bot configuration.')) {
                          deleteBotMutation.mutate(selectedBot.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete bot configuration
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SellerLayout>
  );
}
