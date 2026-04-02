import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { TwitterComposer } from '@/components/admin/twitter/TwitterComposer';
import { TwitterFeed } from '@/components/admin/twitter/TwitterFeed';
import { TwitterHashtagPoolTab } from '@/components/admin/twitter/TwitterHashtagPoolTab';
import { Sun, Moon, Settings, Search, MoreHorizontal } from 'lucide-react';

type Tab = 'for-you' | 'posts' | 'hashtags';

export default function TwitterPosts() {
  const [activeTab, setActiveTab] = useState<Tab>('for-you');
  const [xDark, setXDark] = useState(true);

  const theme = xDark
    ? {
        bg: 'bg-black',
        text: 'text-[#e7e9ea]',
        textSecondary: 'text-[#71767b]',
        border: 'border-[#2f3336]',
        hover: 'hover:bg-[#181818]',
        headerBg: 'bg-black/80',
        accent: 'text-[#1d9bf0]',
        accentBg: 'bg-[#1d9bf0]',
        tabActive: 'text-[#e7e9ea]',
        tabInactive: 'text-[#71767b]',
        tabIndicator: 'bg-[#1d9bf0]',
        inputBg: 'bg-[#202327]',
        cardBg: 'bg-black',
      }
    : {
        bg: 'bg-white',
        text: 'text-[#0f1419]',
        textSecondary: 'text-[#536471]',
        border: 'border-[#eff3f4]',
        hover: 'hover:bg-[#f7f9f9]',
        headerBg: 'bg-white/80',
        accent: 'text-[#1d9bf0]',
        accentBg: 'bg-[#1d9bf0]',
        tabActive: 'text-[#0f1419]',
        tabInactive: 'text-[#536471]',
        tabIndi: 'bg-[#1d9bf0]',
        tabIndicator: 'bg-[#1d9bf0]',
        inputBg: 'bg-[#eff3f4]',
        cardBg: 'bg-white',
      };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'for-you', label: 'For you' },
    { key: 'posts', label: 'Posts' },
    { key: 'hashtags', label: 'Hashtags' },
  ];

  return (
    <AdminLayout>
      <div className={`min-h-screen ${theme.bg} transition-colors duration-200`}>
        <div className={`max-w-[600px] mx-auto ${theme.border} border-x min-h-screen`}>
          {/* Top header */}
          <div className={`sticky top-0 z-20 backdrop-blur-xl ${theme.headerBg} ${theme.border} border-b`}>
            {/* Top row: logo + actions */}
            <div className="flex items-center justify-between px-4 h-[53px]">
              {/* Left: profile placeholder */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1d9bf0] to-[#1d9bf0]/60 flex items-center justify-center">
                <span className="text-white font-bold text-xs">E</span>
              </div>

              {/* Center: X logo */}
              <svg viewBox="0 0 24 24" className={`h-6 w-6 ${theme.text}`} fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>

              {/* Right: theme toggle */}
              <button
                onClick={() => setXDark(!xDark)}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.hover} transition-colors`}
              >
                {xDark ? (
                  <Sun className={`h-[18px] w-[18px] ${theme.textSecondary}`} />
                ) : (
                  <Moon className={`h-[18px] w-[18px] ${theme.textSecondary}`} />
                )}
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 relative py-3 text-[15px] font-bold transition-colors ${
                    activeTab === tab.key ? theme.tabActive : theme.tabInactive
                  } ${theme.hover}`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[56px] h-[4px] rounded-full ${theme.tabIndicator}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {activeTab === 'hashtags' ? (
            <div className="p-4">
              <TwitterHashtagPoolTab />
            </div>
          ) : (
            <>
              <TwitterComposer xTheme={theme} />
              <TwitterFeed xTheme={theme} />
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
