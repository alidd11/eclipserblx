import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TwitterComposeTab } from '@/components/admin/twitter/TwitterComposeTab';
import { TwitterHashtagPoolTab } from '@/components/admin/twitter/TwitterHashtagPoolTab';
import { TwitterPostHistoryTab } from '@/components/admin/twitter/TwitterPostHistoryTab';

export default function TwitterPosts() {
  return (
    <AdminLayout>
      <Tabs defaultValue="compose" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="hashtags">Hashtag Pool</TabsTrigger>
          <TabsTrigger value="history">Post History</TabsTrigger>
        </TabsList>
        <TabsContent value="compose">
          <TwitterComposeTab />
        </TabsContent>
        <TabsContent value="hashtags">
          <TwitterHashtagPoolTab />
        </TabsContent>
        <TabsContent value="history">
          <TwitterPostHistoryTab />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
