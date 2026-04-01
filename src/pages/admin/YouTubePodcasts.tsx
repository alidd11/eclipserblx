import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { YouTubeUploadTab } from '@/components/admin/youtube/YouTubeUploadTab';
import { YouTubePodcastHistoryTab } from '@/components/admin/youtube/YouTubePodcastHistoryTab';

export default function YouTubePodcasts() {
  return (
    <AdminLayout>
      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload Podcast</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <YouTubeUploadTab />
        </TabsContent>
        <TabsContent value="history">
          <YouTubePodcastHistoryTab />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
