import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Plus, Trash2, Save, Eye, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export function WelcomeEmbedBuilder() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  const guildId = store?.credentials?.discord_guild_id;

  const [enabled, setEnabled] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [title, setTitle] = useState('Welcome!');
  const [description, setDescription] = useState('Welcome to our server!');
  const [color, setColor] = useState('#7C3AED');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [footerText, setFooterText] = useState('');
  const [fields, setFields] = useState<EmbedField[]>([]);

  // Fetch existing embed settings
  const { data: embedSettings } = useQuery({
    queryKey: ['store-welcome-embed', store?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('store_welcome_embeds')
        .select('*')
        .eq('store_id', store!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  // Fetch channels
  const { data: channels = [] } = useQuery({
    queryKey: ['discord-channels', guildId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase.functions.invoke('bot-control', {
        body: { action: 'guild-channels', guild_id: guildId },
      });
      if (error) return [];
      return data?.channels || [];
    },
    enabled: !!guildId,
  });

  // Load existing settings
  useEffect(() => {
    if (embedSettings) {
      setEnabled(embedSettings.enabled);
      setChannelId(embedSettings.channel_id || '');
      setTitle(embedSettings.title || 'Welcome!');
      setDescription(embedSettings.description || 'Welcome to our server!');
      setColor(embedSettings.color || '#7C3AED');
      setThumbnailUrl(embedSettings.thumbnail_url || '');
      setImageUrl(embedSettings.image_url || '');
      setFooterText(embedSettings.footer_text || '');
      setFields((embedSettings.fields as unknown as EmbedField[]) || []);
    }
  }, [embedSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        store_id: store!.id,
        enabled,
        channel_id: channelId || null,
        title,
        description,
        color,
        thumbnail_url: thumbnailUrl || null,
        image_url: imageUrl || null,
        footer_text: footerText || null,
        fields: fields as any,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('store_welcome_embeds')
        .upsert(payload, { onConflict: 'store_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-welcome-embed'] });
      toast.success('Welcome embed saved!');
    },
    onError: () => toast.error('Failed to save'),
  });

  const addField = () => {
    setFields([...fields, { name: '', value: '', inline: false }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof EmbedField, value: any) => {
    setFields(fields.map((f, i) => i === index ? { ...f, [key]: value } : f));
  };

  // Convert hex color to decimal for preview
  const colorInt = parseInt(color.replace('#', ''), 16);

  if (!guildId) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Connect the Portal Bot to your server first to use welcome embeds.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enable toggle + channel select */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" /> Welcome Embed
              </CardTitle>
              <CardDescription className="text-xs">
                Send a custom embed to a channel when someone joins your server.
              </CardDescription>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardHeader>
        {enabled && (
          <CardContent className="space-y-4 pt-0">
            <div>
              <Label className="text-xs">Welcome Channel</Label>
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger><SelectValue placeholder="Select a channel..." /></SelectTrigger>
                <SelectContent>
                  {channels.map((ch: any) => (
                    <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {enabled && (
        <>
          {/* Embed Content */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Embed Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Welcome!" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Welcome to our server! Use {user} for the member's name."
                  rows={3}
                  className="min-h-[80px]"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Use <code>{'{user}'}</code> for member name, <code>{'{server}'}</code> for server name.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer" />
                    <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Footer Text</Label>
                  <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Powered by Eclipse" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Thumbnail URL</Label>
                  <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label className="text-xs">Image URL</Label>
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fields */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Fields</CardTitle>
                <Button variant="outline" size="sm" onClick={addField} disabled={fields.length >= 10}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Field
                </Button>
              </div>
            </CardHeader>
            {fields.length > 0 && (
              <CardContent className="space-y-3 pt-0">
                {fields.map((field, i) => (
                  <div key={i} className="flex gap-2 items-start p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 space-y-2">
                      <Input value={field.name} onChange={(e) => updateField(i, 'name', e.target.value)} placeholder="Field name" className="text-xs h-8" />
                      <Input value={field.value} onChange={(e) => updateField(i, 'value', e.target.value)} placeholder="Field value" className="text-xs h-8" />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch checked={field.inline} onCheckedChange={(v) => updateField(i, 'inline', v)} />
                        Inline
                      </label>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeField(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Preview */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4" /> Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-[#2f3136] rounded-lg p-4 max-w-md" style={{ borderLeft: `4px solid ${color}` }}>
                {thumbnailUrl && (
                  <img src={thumbnailUrl} alt="" className="w-12 h-12 rounded-full float-right ml-3" />
                )}
                <h3 className="text-white font-semibold text-sm">{title || 'Welcome!'}</h3>
                <p className="text-[#dcddde] text-sm mt-1 whitespace-pre-wrap">
                  {(description || '').replace('{user}', '**NewMember**').replace('{server}', '**Server**')}
                </p>
                {fields.length > 0 && (
                  <div className={`grid gap-2 mt-3 ${fields.some(f => f.inline) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {fields.map((f, i) => (
                      <div key={i} className={f.inline ? '' : 'col-span-full'}>
                        <p className="text-[#ffffff99] text-xs font-semibold">{f.name || 'Field'}</p>
                        <p className="text-[#dcddde] text-xs">{f.value || 'Value'}</p>
                      </div>
                    ))}
                  </div>
                )}
                {imageUrl && <img src={imageUrl} alt="" className="w-full rounded mt-3" />}
                {footerText && <p className="text-[#72767d] text-[10px] mt-2">{footerText}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Welcome Embed'}
          </Button>
        </>
      )}
    </div>
  );
}
