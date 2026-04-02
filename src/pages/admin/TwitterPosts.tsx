import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { TwitterComposer } from '@/components/admin/twitter/TwitterComposer';
import { TwitterFeed } from '@/components/admin/twitter/TwitterFeed';
import { TwitterHashtagPoolTab } from '@/components/admin/twitter/TwitterHashtagPoolTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Sparkles } from 'lucide-react';

export default function TwitterPosts() {
  const [activeTab, setActiveTab] = useState('feed');

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto border-x border-border min-h-screen">
        {/* Header - X style sticky */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="text-xl font-bold text-foreground">Eclipse / X</h1>
            <button className="p-2 rounded-full hover:bg-muted/50 transition-colors">
              <Sparkles className="h-5 w-5 text-foreground" />
            </button>
          </div>

          {/* Tab bar */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-transparent border-b border-border rounded-none h-auto p-0">
              <TabsTrigger
                value="feed"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 text-sm font-semibold text-muted-foreground data-[state=active]:text-foreground"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="hashtags"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 text-sm font-semibold text-muted-foreground data-[state=active]:text-foreground"
              >
                <Settings className="h-4 w-4 mr-1.5" />
                Hashtags
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="mt-0">
              {/* Composer */}
              <TwitterComposer />
              {/* Feed */}
              <TwitterFeed />
            </TabsContent>

            <TabsContent value="hashtags" className="mt-0 p-4">
              <TwitterHashtagPoolTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  );
}
