import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YouTubeUploadTab } from '@/components/admin/youtube/YouTubeUploadTab';
import { YouTubePodcastHistoryTab } from '@/components/admin/youtube/YouTubePodcastHistoryTab';

export default function YouTubePodcasts() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="YouTube Podcasts"
          description="Upload and manage podcast episodes"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Mobile dropdown */}
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upload">Upload Podcast</SelectItem>
                <SelectItem value="history">Upload History</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop tabs */}
          <TabsList className="hidden sm:flex">
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
      </div>
    </AdminLayout>
  );
}
