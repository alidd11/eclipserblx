import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MessageCircleQuestion, Send, Sparkles, Clock, CheckCircle2, Loader2, RefreshCw, History, Undo2, Eye, AlertTriangle, Link } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  display_name: string | null;
  username: string | null;
  discord_id: string | null;
  discord_username: string | null;
}

// Pre-defined question categories with example questions
const QUESTION_CATEGORIES = {
  gaming: {
    label: 'Gaming',
    emoji: '🎮',
    questions: [
      "What's your all-time favorite video game and why?",
      "If you could only play one game for the rest of your life, what would it be?",
      "What's the most underrated game you've ever played?",
      "Console or PC - which do you prefer and why?",
      "What game have you replayed the most times?",
      "What's your favorite gaming memory?",
      "Which game has the best soundtrack?",
      "What upcoming game are you most excited for?",
      "What's your favorite multiplayer game to play with friends?",
      "If you could be any video game character, who would you be?",
    ]
  },
  roleplay: {
    label: 'Roleplay & RP',
    emoji: '🎭',
    questions: [
      "What's your favorite roleplay scenario or theme?",
      "How did you get into roleplaying?",
      "What's the most memorable RP moment you've experienced?",
      "Do you prefer realistic or fantasy roleplay settings?",
      "What makes a great roleplay community?",
      "What's your favorite roleplay vehicle or asset you've used?",
      "How do you create immersive characters for roleplay?",
      "What RP server features are most important to you?",
      "Share your best roleplay story!",
      "What's your dream roleplay scenario that you haven't tried yet?",
    ]
  },
  community: {
    label: 'Community',
    emoji: '👥',
    questions: [
      "What brought you to our community?",
      "What's your favorite thing about this server?",
      "How has your day been so far?",
      "What's something you're looking forward to this week?",
      "If you could add any feature to our server, what would it be?",
      "What's your favorite way to spend free time?",
      "Share a fun fact about yourself!",
      "What's the best advice you've ever received?",
      "What's your hidden talent?",
      "If you could travel anywhere, where would you go?",
    ]
  },
  funHypothetical: {
    label: 'Fun & Hypothetical',
    emoji: '🤔',
    questions: [
      "If you won the lottery tomorrow, what's the first thing you'd buy?",
      "Would you rather have the ability to fly or be invisible?",
      "If you could have dinner with anyone (dead or alive), who would it be?",
      "What superpower would you choose and why?",
      "If you could live in any fictional universe, which would you pick?",
      "Would you rather explore space or the deep ocean?",
      "If you could master any skill instantly, what would it be?",
      "What would your dream house look like?",
      "If you could time travel, would you go to the past or future?",
      "What would you do if you were invisible for a day?",
    ]
  },
  creative: {
    label: 'Creative',
    emoji: '🎨',
    questions: [
      "What's your favorite creative hobby?",
      "If you could create anything, what would you make?",
      "What inspires your creativity?",
      "Share a project you're proud of!",
      "What's your dream job?",
      "If you could redesign anything in the world, what would it be?",
      "What's the most creative solution you've come up with?",
      "Do you prefer creating alone or collaborating with others?",
      "What's something you've always wanted to learn?",
      "If you wrote a book, what would it be about?",
    ]
  }
};

export default function DiscordQOTD() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('create');
  const [useAutoGenerate, setUseAutoGenerate] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('gaming');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  
  // Preview state
  const [previewQuestion, setPreviewQuestion] = useState<string | null>(null);
  const [previousQuestion, setPreviousQuestion] = useState<string | null>(null);

  // Fetch current user's profile
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, username, discord_id, discord_username')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id
  });

  // Fetch QOTD history
  const { data: qotdHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['discord-qotd-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discord_qotd')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch community webhook
  const { data: discordSettings } = useQuery({
    queryKey: ['community-discord-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['community_discord_webhook_url', 'qotd_discord_role_id', 'discord_ping_role_id']);
      
      if (error) throw error;
      const settings: Record<string, string> = {};
      data?.forEach(s => {
        settings[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value);
      });
      return settings;
    }
  });

  const webhookSettings = discordSettings?.community_discord_webhook_url;

  const generateRandomQuestion = useCallback(() => {
    const category = QUESTION_CATEGORIES[selectedCategory as keyof typeof QUESTION_CATEGORIES];
    if (category) {
      const randomIndex = Math.floor(Math.random() * category.questions.length);
      return category.questions[randomIndex];
    }
    return '';
  }, [selectedCategory]);

  const handleGeneratePreview = () => {
    if (previewQuestion) {
      setPreviousQuestion(previewQuestion);
    }
    const newQuestion = generateRandomQuestion();
    setPreviewQuestion(newQuestion);
  };

  const handleGoBack = () => {
    if (previousQuestion) {
      const current = previewQuestion;
      setPreviewQuestion(previousQuestion);
      setPreviousQuestion(current);
    }
  };

  const postQOTDMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!user) throw new Error('Not authenticated');

      // Save to database
      const { data: qotd, error: insertError } = await supabase
        .from('discord_qotd')
        .insert({
          question,
          is_auto_generated: useAutoGenerate,
          category: useAutoGenerate ? selectedCategory : null,
          status: 'posted',
          posted_at: new Date().toISOString(),
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Get staff Discord info
      const staffDiscordId = profile?.discord_id;
      const staffDiscordDisplayName = profile?.discord_username || profile?.display_name || profile?.username || 'Staff';

      // Send to Discord - role ID handled by edge function from settings
      const { data, error } = await supabase.functions.invoke('send-discord-qotd', {
        body: { 
          question,
          qotdId: qotd.id,
          category: useAutoGenerate ? selectedCategory : 'custom',
          staffUserId: user.id,
          staffDiscordId,
          staffDiscordDisplayName
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Question of the Day posted to Discord!');
      queryClient.invalidateQueries({ queryKey: ['discord-qotd-history'] });
      setCustomQuestion('');
      setPreviewQuestion(null);
      setPreviousQuestion(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to post QOTD: ${error.message}`);
    }
  });

  const handlePostQOTD = async () => {
    if (!webhookSettings) {
      toast.error('Please configure the community Discord webhook in Discord Settings first');
      return;
    }

    setIsPosting(true);
    try {
      let question: string;
      
      if (useAutoGenerate) {
        // Use the preview question if available, otherwise generate new
        question = previewQuestion || generateRandomQuestion();
      } else {
        question = customQuestion.trim();
      }
      
      if (!question) {
        toast.error('Please enter a question or generate a preview first');
        return;
      }

      await postQOTDMutation.mutateAsync(question);
    } finally {
      setIsPosting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Posted</Badge>;
      case 'scheduled':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const currentCategory = QUESTION_CATEGORIES[selectedCategory as keyof typeof QUESTION_CATEGORIES];
  const staffName = profile?.discord_username || profile?.display_name || profile?.username || 'Staff';
  const hasDiscordLinked = !!profile?.discord_id;

  // Show Discord link requirement if not linked
  if (profile && !hasDiscordLinked) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Question of the Day</h1>
            <p className="text-muted-foreground">
              Engage your community with daily discussion questions
            </p>
          </div>

          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4 py-8">
                <div className="h-16 w-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Discord Account Required</h3>
                  <p className="text-muted-foreground max-w-md">
                    To post Questions of the Day, you need to link your Discord account first. 
                    This allows your Discord profile to be tagged in the embed.
                  </p>
                </div>
                <Button asChild className="gap-2 mt-4">
                  <a href="/account">
                    <Link className="h-4 w-4" />
                    Link Discord Account
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Question of the Day</h1>
          <p className="text-muted-foreground">
            Engage your community with daily discussion questions
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Mobile dropdown */}
          <div className="block sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100] bg-card">
                <SelectItem value="create">Create QOTD</SelectItem>
                <SelectItem value="history">History</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop tabs */}
          <TabsList className="hidden sm:grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="create" className="gap-2">
              <MessageCircleQuestion className="h-4 w-4" />
              Create QOTD
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircleQuestion className="h-5 w-5 text-primary" />
                  Create Question
                </CardTitle>
                <CardDescription>
                  Choose to auto-generate from categories or write your own custom question
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Toggle between auto-generate and custom */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      Auto-Generate Question
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Randomly select from pre-made questions by category
                    </p>
                  </div>
                  <Switch
                    checked={useAutoGenerate}
                    onCheckedChange={(checked) => {
                      setUseAutoGenerate(checked);
                      setPreviewQuestion(null);
                      setPreviousQuestion(null);
                    }}
                  />
                </div>

                {useAutoGenerate ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question Category</Label>
                      <Select 
                        value={selectedCategory} 
                        onValueChange={(val) => {
                          setSelectedCategory(val);
                          setPreviewQuestion(null);
                          setPreviousQuestion(null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="z-[100] bg-card">
                          {Object.entries(QUESTION_CATEGORIES).map(([key, cat]) => (
                            <SelectItem key={key} value={key}>
                              {cat.emoji} {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Preview section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Question Preview
                        </Label>
                        <div className="flex items-center gap-2">
                          {previousQuestion && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleGoBack}
                              className="gap-1.5"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                              Go Back
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGeneratePreview}
                            className="gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            {previewQuestion ? 'Regenerate' : 'Generate'}
                          </Button>
                        </div>
                      </div>

                      {previewQuestion ? (
                        <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{currentCategory?.emoji}</span>
                            <div className="flex-1 space-y-2">
                              <p className="font-semibold text-lg">{previewQuestion}</p>
                              <p className="text-sm text-muted-foreground italic">
                                Sent by {staffName}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-center">
                          <p className="text-sm text-muted-foreground">
                            Click "Generate" to preview a random question from this category
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/20">
                      <p className="text-sm text-muted-foreground mb-2">Example questions from this category:</p>
                      <ul className="space-y-1">
                        {currentCategory?.questions.slice(0, 3).map((q, i) => (
                          <li key={i} className="text-sm">• {q}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="custom-question">Your Question</Label>
                      <Textarea
                        id="custom-question"
                        placeholder="What question would you like to ask the community?"
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Tip: Open-ended questions tend to get more engagement!
                      </p>
                    </div>

                    {/* Custom question preview */}
                    {customQuestion.trim() && (
                      <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">💬</span>
                          <div className="flex-1 space-y-2">
                            <p className="font-semibold text-lg">{customQuestion}</p>
                            <p className="text-sm text-muted-foreground italic">
                              Sent by {staffName}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!webhookSettings && (
                  <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
                    <p className="text-sm">
                      ⚠️ Community Discord webhook not configured. Please set it up in{' '}
                      <a href="/admin/discord-settings" className="underline">Discord Settings</a> first.
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handlePostQOTD}
                  disabled={isPosting || !webhookSettings || (!useAutoGenerate && !customQuestion.trim()) || (useAutoGenerate && !previewQuestion)}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isPosting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Post to Discord
                    </>
                  )}
                </Button>

                {useAutoGenerate && !previewQuestion && (
                  <p className="text-xs text-center text-muted-foreground">
                    Generate a preview first before posting
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  QOTD History
                </CardTitle>
                <CardDescription>
                  Previously posted questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : qotdHistory && qotdHistory.length > 0 ? (
                  <div className="space-y-3">
                    {qotdHistory.map((qotd) => (
                      <div 
                        key={qotd.id}
                        className="p-4 rounded-lg border bg-muted/20 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <p className="font-medium flex-1">{qotd.question}</p>
                          {getStatusBadge(qotd.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {qotd.category && (
                            <span className="capitalize">📁 {qotd.category}</span>
                          )}
                          {qotd.is_auto_generated && (
                            <span>✨ Auto-generated</span>
                          )}
                          {qotd.posted_at && (
                            <span>📅 {format(new Date(qotd.posted_at), 'MMM d, yyyy h:mm a')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircleQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No questions posted yet</p>
                    <p className="text-sm">Create your first QOTD above!</p>
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
