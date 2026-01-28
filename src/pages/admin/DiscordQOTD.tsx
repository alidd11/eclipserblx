import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MessageCircleQuestion, Send, Sparkles, Clock, CheckCircle2, Loader2, RefreshCw, History } from 'lucide-react';
import { cn } from '@/lib/utils';

// Pre-defined question categories with example questions
const QUESTION_CATEGORIES = {
  gaming: {
    label: 'Gaming',
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
  const [activeTab, setActiveTab] = useState('create');
  const [useAutoGenerate, setUseAutoGenerate] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('gaming');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isPosting, setIsPosting] = useState(false);

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
  const { data: webhookSettings } = useQuery({
    queryKey: ['community-discord-webhook'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'community_discord_webhook_url')
        .maybeSingle();
      
      if (error) throw error;
      return data?.value as string | null;
    }
  });

  const postQOTDMutation = useMutation({
    mutationFn: async (question: string) => {
      const { data: { user } } = await supabase.auth.getUser();
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

      // Send to Discord
      const { data, error } = await supabase.functions.invoke('send-discord-qotd', {
        body: { 
          question,
          qotdId: qotd.id,
          category: useAutoGenerate ? selectedCategory : 'custom'
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Question of the Day posted to Discord!');
      queryClient.invalidateQueries({ queryKey: ['discord-qotd-history'] });
      setCustomQuestion('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to post QOTD: ${error.message}`);
    }
  });

  const generateRandomQuestion = () => {
    const category = QUESTION_CATEGORIES[selectedCategory as keyof typeof QUESTION_CATEGORIES];
    if (category) {
      const randomIndex = Math.floor(Math.random() * category.questions.length);
      return category.questions[randomIndex];
    }
    return '';
  };

  const handlePostQOTD = async () => {
    if (!webhookSettings) {
      toast.error('Please configure the community Discord webhook in Discord Settings first');
      return;
    }

    setIsPosting(true);
    try {
      const question = useAutoGenerate ? generateRandomQuestion() : customQuestion.trim();
      
      if (!question) {
        toast.error('Please enter a question or select a category');
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

  // Mobile tab dropdown
  const [mobileTab, setMobileTab] = useState('create');

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
                    onCheckedChange={setUseAutoGenerate}
                  />
                </div>

                {useAutoGenerate ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="z-[100] bg-card">
                          {Object.entries(QUESTION_CATEGORIES).map(([key, cat]) => (
                            <SelectItem key={key} value={key}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/20">
                      <p className="text-sm text-muted-foreground mb-2">Example questions from this category:</p>
                      <ul className="space-y-1">
                        {QUESTION_CATEGORIES[selectedCategory as keyof typeof QUESTION_CATEGORIES]?.questions.slice(0, 3).map((q, i) => (
                          <li key={i} className="text-sm">• {q}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
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
                  disabled={isPosting || !webhookSettings || (!useAutoGenerate && !customQuestion.trim())}
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
