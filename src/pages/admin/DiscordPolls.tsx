import { useState } from 'react';
import { BarChart3, Send, Plus, Trash2, Clock, MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { format } from 'date-fns';

const DURATION_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '4', label: '4 hours' },
  { value: '12', label: '12 hours' },
  { value: '24', label: '24 hours' },
  { value: '48', label: '2 days' },
  { value: '168', label: '1 week' },
];

const INITIAL_FORM_STATE = {
  title: '',
  description: '',
  pollType: 'poll' as 'poll' | 'survey',
  options: ['', ''],
  durationHours: '24',
  allowMultiple: false,
};

export default function DiscordPolls() {
  const [formData, setFormData, clearFormData] = useFormPersistence('discord-poll', INITIAL_FORM_STATE);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const queryClient = useQueryClient();

  // Fetch webhook URL
  const { data: webhookUrl } = useQuery({
    queryKey: ['community-discord-webhook'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'community_discord_webhook_url')
        .maybeSingle();
      
      if (error) throw error;
      if (data?.value) {
        return typeof data.value === 'string' 
          ? data.value.replace(/^"|"$/g, '') 
          : String(data.value);
      }
      return null;
    },
  });

  // Fetch past polls
  const { data: polls, isLoading: pollsLoading } = useQuery({
    queryKey: ['discord-polls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discord_polls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  const addOption = () => {
    if (formData.options.length < 10) {
      setFormData({ options: [...formData.options, ''] });
    }
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_: string, i: number) => i !== index);
      setFormData({ options: newOptions });
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ options: newOptions });
  };

  const handleSend = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a question');
      return;
    }
    
    const validOptions = formData.options.filter((o: string) => o.trim());
    if (validOptions.length < 2) {
      toast.error('Please provide at least 2 options');
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-discord-poll', {
        body: {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          pollType: formData.pollType,
          options: validOptions,
          durationHours: parseInt(formData.durationHours),
          allowMultiple: formData.allowMultiple,
        },
      });

      if (error) {
        toast.error(`Failed to send: ${error.message}`);
      } else if (data?.success) {
        toast.success('Poll sent to Discord!');
        clearFormData();
        queryClient.invalidateQueries({ queryKey: ['discord-polls'] });
      } else {
        toast.error(data?.error || 'Failed to send poll');
      }
    } catch (err: any) {
      console.error('Poll error:', err);
      toast.error('Failed to send poll');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AdminLayout requiredPermissions={['manage_discord']}>
      <div className="px-4 sm:px-6 pt-4 pb-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Discord Polls</h1>
          <p className="text-muted-foreground">Create and send polls to your Discord community</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Dropdown for all devices */}
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full max-w-md bg-card">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-[100]">
              <SelectItem value="create">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Create Poll
                </div>
              </SelectItem>
              <SelectItem value="history">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Poll History
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Create Discord Poll
                </CardTitle>
                <CardDescription>
                  Send a poll or survey to gather community feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!webhookUrl && (
                  <Alert className="border-amber-500/50 bg-amber-500/10">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-amber-600 dark:text-amber-400">
                      <Link to="/admin/discord-settings" className="underline hover:no-underline">
                        Configure your Discord webhook in Discord Settings → Community tab
                      </Link>{' '}
                      to enable polls.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Poll Type</Label>
                    <Select 
                      value={formData.pollType} 
                      onValueChange={(v: 'poll' | 'survey') => setFormData({ pollType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="poll">
                          <span className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Quick Poll
                          </span>
                        </SelectItem>
                        <SelectItem value="survey">
                          <span className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Survey
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select 
                      value={formData.durationHours} 
                      onValueChange={(v) => setFormData({ durationHours: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Question</Label>
                  <Input
                    id="title"
                    placeholder="What would you like to ask?"
                    value={formData.title}
                    onChange={(e) => setFormData({ title: e.target.value })}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add more context for your poll..."
                    value={formData.description}
                    onChange={(e) => setFormData({ description: e.target.value })}
                    maxLength={500}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Options ({formData.options.length}/10)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                      disabled={formData.options.length >= 10}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {formData.options.map((option: string, index: number) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          maxLength={100}
                        />
                        {formData.options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(index)}
                            className="shrink-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label htmlFor="allowMultiple" className="cursor-pointer">
                      Allow multiple answers
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Users can select more than one option
                    </p>
                  </div>
                  <Switch
                    id="allowMultiple"
                    checked={formData.allowMultiple}
                    onCheckedChange={(checked) => setFormData({ allowMultiple: checked })}
                  />
                </div>

                <Button
                  onClick={handleSend}
                  disabled={isSending || !webhookUrl}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? 'Sending...' : 'Send Poll to Discord'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Poll History
                </CardTitle>
                <CardDescription>
                  View previously sent polls and surveys
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pollsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : polls && polls.length > 0 ? (
                  <div className="space-y-3">
                    {polls.map((poll: any) => (
                      <div
                        key={poll.id}
                        className="p-4 border rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{poll.title}</h4>
                            {poll.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {poll.description}
                              </p>
                            )}
                          </div>
                          <Badge variant={poll.status === 'posted' ? 'default' : 'secondary'}>
                            {poll.status === 'posted' ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : null}
                            {poll.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{poll.poll_type === 'poll' ? 'Poll' : 'Survey'}</span>
                          <span>•</span>
                          <span>{(poll.options as string[])?.length || 0} options</span>
                          <span>•</span>
                          <span>{format(new Date(poll.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No polls sent yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
