import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { TwitterComposer } from '@/components/admin/twitter/TwitterComposer';
import { TwitterFeed } from '@/components/admin/twitter/TwitterFeed';
import { TwitterMentions } from '@/components/admin/twitter/TwitterMentions';
import { TwitterHashtagPoolTab } from '@/components/admin/twitter/TwitterHashtagPoolTab';
import { TwitterPostHistoryTab } from '@/components/admin/twitter/TwitterPostHistoryTab';
import { TwitterScheduledPostsPanel } from '@/components/admin/twitter/TwitterScheduledPostsPanel';
import { TwitterAnalyticsBar } from '@/components/admin/twitter/TwitterAnalyticsBar';
import { TwitterContentCalendar } from '@/components/admin/twitter/TwitterContentCalendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Tab = 'for-you' | 'mentions' | 'posts' | 'hashtags' | 'calendar';

const xTheme = {
  bg: 'bg-background',
  text: 'text-foreground',
  textSecondary: 'text-muted-foreground',
  border: 'border-border',
  hover: 'hover:bg-muted/50',
  headerBg: 'bg-background/80',
  accent: 'text-[#1d9bf0]',
  accentBg: 'bg-[#1d9bf0]',
  tabActive: 'text-foreground',
  tabInactive: 'text-muted-foreground',
  tabIndicator: 'bg-[#1d9bf0]',
  inputBg: 'bg-muted',
  cardBg: 'bg-card',
  sidebarText: 'text-foreground',
  sidebarHover: 'hover:bg-muted/50',
  searchBg: 'bg-muted',
  searchBorder: 'border-border focus-within:border-[#1d9bf0]',
  searchText: 'text-foreground',
  searchPlaceholder: 'placeholder-muted-foreground',
  trendBg: 'bg-muted/40',
};

const tabs: { key: Tab; label: string }[] = [
  { key: 'for-you', label: 'Compose' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'posts', label: 'Posts' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'hashtags', label: 'Hashtags' },
];

export default function TwitterPosts() {
  const [activeTab, setActiveTab] = useState<Tab>('for-you');

  return (
    <AdminLayout>
      <div className="space-y-5 w-full">
        <AdminPageHeader
          title="X / Twitter"
          description="Compose, schedule, and manage posts"
        />

        {/* Mobile dropdown */}
        <div className="sm:hidden">
          <Select value={activeTab} onValueChange={v => setActiveTab(v as Tab)}>
            <SelectTrigger className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map(tab => (
                <SelectItem key={tab.key} value={tab.key}>{tab.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Desktop tabs */}
          <div className="hidden sm:flex overflow-x-auto border-b border-border bg-muted/30">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 min-w-0 relative py-3 text-sm font-medium transition-colors whitespace-nowrap px-4',
                  activeTab === tab.key
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full bg-[#1d9bf0]" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex">
            {/* Main column */}
            <div className="flex-1 min-w-0">
              {activeTab === 'hashtags' ? (
                <TwitterHashtagPoolTab xTheme={xTheme} />
              ) : activeTab === 'mentions' ? (
                <TwitterMentions xTheme={xTheme} />
              ) : activeTab === 'calendar' ? (
                <TwitterContentCalendar xTheme={xTheme} />
              ) : activeTab === 'posts' ? (
                <div>
                  <div className="lg:hidden">
                    <TwitterScheduledPostsPanel xTheme={xTheme} />
                  </div>
                  <TwitterPostHistoryTab xTheme={xTheme} />
                </div>
              ) : (
                <>
                  <TwitterAnalyticsBar xTheme={xTheme} />
                  <TwitterComposer xTheme={xTheme} />
                  <TwitterFeed xTheme={xTheme} />
                </>
              )}
            </div>

            {/* Right sidebar — desktop only, only show scheduled posts (calendar moved to tab) */}
            <div className="hidden lg:block w-[320px] border-l border-border p-4 space-y-4">
              <TwitterScheduledPostsPanel xTheme={xTheme} />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
