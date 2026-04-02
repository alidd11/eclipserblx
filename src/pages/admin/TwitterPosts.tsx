import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { TwitterComposer } from '@/components/admin/twitter/TwitterComposer';
import { TwitterFeed } from '@/components/admin/twitter/TwitterFeed';
import { TwitterMentions } from '@/components/admin/twitter/TwitterMentions';
import { TwitterHashtagPoolTab } from '@/components/admin/twitter/TwitterHashtagPoolTab';
import { Sun, Moon, Bell, Search, MoreHorizontal, Home, Users, Mail, Bookmark, ListTodo, User, Sparkles } from 'lucide-react';
import marketplaceLogo from '@/assets/marketplace-logo-icon-sm.webp';

type Tab = 'for-you' | 'mentions' | 'posts' | 'hashtags';

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
        sidebarText: 'text-[#e7e9ea]',
        sidebarHover: 'hover:bg-[#181818]',
        searchBg: 'bg-[#202327]',
        searchBorder: 'border-transparent focus-within:border-[#1d9bf0]',
        searchText: 'text-[#e7e9ea]',
        searchPlaceholder: 'placeholder-[#71767b]',
        trendBg: 'bg-[#16181c]',
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
        tabIndicator: 'bg-[#1d9bf0]',
        inputBg: 'bg-[#eff3f4]',
        cardBg: 'bg-white',
        sidebarText: 'text-[#0f1419]',
        sidebarHover: 'hover:bg-[#f7f9f9]',
        searchBg: 'bg-[#eff3f4]',
        searchBorder: 'border-transparent focus-within:border-[#1d9bf0]',
        searchText: 'text-[#0f1419]',
        searchPlaceholder: 'placeholder-[#536471]',
        trendBg: 'bg-[#f7f9f9]',
      };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'for-you', label: 'For you' },
    { key: 'mentions', label: 'Mentions' },
    { key: 'posts', label: 'Posts' },
    { key: 'hashtags', label: 'Hashtags' },
  ];

  const sidebarItems = [
    { icon: Home, label: 'Home', active: true },
    { icon: Search, label: 'Explore' },
    { icon: Bell, label: 'Notifications' },
    { icon: Mail, label: 'Messages' },
    { icon: ListTodo, label: 'Lists' },
    { icon: Bookmark, label: 'Bookmarks' },
    { icon: Users, label: 'Communities' },
    { icon: User, label: 'Profile' },
  ];

  return (
    <AdminLayout>
      <div className={`min-h-screen w-full ${theme.bg} transition-colors duration-200`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        <div className="flex justify-center w-full">
          {/* Left Sidebar - hidden on mobile */}
          <div className="hidden xl:flex flex-col items-end w-[275px] shrink-0 pr-3 sticky top-0 h-screen">
            <div className="flex flex-col h-full py-1 w-[258px]">
              {/* X Logo */}
              <div className="p-3 mb-1">
                <svg viewBox="0 0 24 24" className={`h-7 w-7 ${theme.text}`} fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>

              {/* Nav items */}
              <nav className="flex flex-col gap-0.5">
                {sidebarItems.map((item) => (
                  <button
                    key={item.label}
                    className={`flex items-center gap-5 px-3 py-3 rounded-full ${theme.sidebarHover} transition-colors ${
                      item.active ? `${theme.sidebarText} font-bold` : theme.textSecondary
                    }`}
                  >
                    <item.icon className="h-[26px] w-[26px]" strokeWidth={item.active ? 2.5 : 1.75} />
                    <span className="text-xl">{item.label}</span>
                  </button>
                ))}
              </nav>

              {/* Post button */}
              <button className="mt-4 w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white rounded-full py-3 text-[17px] font-bold transition-colors">
                Post
              </button>

              {/* Bottom: Eclipse account */}
              <div className={`mt-auto mb-3 flex items-center gap-3 p-3 rounded-full ${theme.sidebarHover} transition-colors cursor-pointer`}>
                <img src={marketplaceLogo} alt="Eclipse" className="h-10 w-10 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] font-bold ${theme.text} truncate`}>Eclipse</p>
                  <p className={`text-[15px] ${theme.textSecondary} truncate`}>@EclipseRblx</p>
                </div>
                <MoreHorizontal className={`h-5 w-5 ${theme.textSecondary}`} />
              </div>
            </div>
          </div>

          {/* Main feed column */}
          <div className={`w-full lg:max-w-[600px] ${theme.border} lg:border-x min-h-screen`}>
            {/* Top header */}
            <div className={`sticky top-0 z-20 backdrop-blur-xl ${theme.headerBg} ${theme.border} border-b`}>
              {/* Top row */}
              <div className="flex items-center justify-between px-4 h-[53px]">
                {/* Mobile: avatar */}
                <div className="xl:hidden">
                  <img src={marketplaceLogo} alt="Eclipse" className="h-8 w-8 rounded-full" />
                </div>
                {/* Desktop: page title */}
                <h2 className={`hidden xl:block text-xl font-bold ${theme.text}`}>Home</h2>

                {/* Center: X logo (mobile only) */}
                <div className="xl:hidden">
                  <svg viewBox="0 0 24 24" className={`h-6 w-6 ${theme.text}`} fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>

                {/* Right: theme toggle */}
                <button
                  onClick={() => setXDark(!xDark)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${theme.hover} transition-colors`}
                >
                  {xDark ? (
                    <Sun className={`h-5 w-5 ${theme.textSecondary}`} />
                  ) : (
                    <Moon className={`h-5 w-5 ${theme.textSecondary}`} />
                  )}
                </button>
              </div>

              {/* Tab bar */}
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 relative py-3 text-[15px] font-medium transition-colors ${
                      activeTab === tab.key ? `${theme.tabActive} font-bold` : theme.tabInactive
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
            ) : activeTab === 'mentions' ? (
              <TwitterMentions xTheme={theme} />
            ) : (
              <>
                <TwitterComposer xTheme={theme} />
                <TwitterFeed xTheme={theme} />
              </>
            )}
          </div>

          {/* Right Sidebar - hidden on smaller screens */}
          <div className="hidden lg:block w-[350px] shrink-0 pl-7 sticky top-0 h-screen overflow-y-auto">
            <div className="py-3 space-y-4">
              {/* Search */}
              <div className={`rounded-full ${theme.searchBg} ${theme.searchBorder} border flex items-center px-4 py-2.5 transition-colors`}>
                <Search className={`h-[18px] w-[18px] ${theme.textSecondary} mr-3 shrink-0`} />
                <input
                  type="text"
                  placeholder="Search"
                  className={`bg-transparent outline-none text-[15px] w-full ${theme.searchText} ${theme.searchPlaceholder}`}
                />
              </div>

              {/* Trending / What's happening */}
              <div className={`rounded-2xl ${theme.trendBg} overflow-hidden`}>
                <h3 className={`text-xl font-extrabold ${theme.text} px-4 py-3`}>What's happening</h3>
                {[
                  { category: 'Gaming · Trending', topic: 'Roblox', posts: '125K posts' },
                  { category: 'Technology · Trending', topic: 'Eclipse', posts: '2,841 posts' },
                  { category: 'Gaming', topic: 'Discord Bots', posts: '8,124 posts' },
                  { category: 'Business · Trending', topic: 'Marketplace', posts: '4,521 posts' },
                ].map((trend, i) => (
                  <div key={i} className={`px-4 py-3 ${theme.hover} transition-colors cursor-pointer`}>
                    <p className={`text-[13px] ${theme.textSecondary}`}>{trend.category}</p>
                    <p className={`text-[15px] font-bold ${theme.text}`}>{trend.topic}</p>
                    <p className={`text-[13px] ${theme.textSecondary}`}>{trend.posts}</p>
                  </div>
                ))}
                <button className={`px-4 py-3 text-[15px] ${theme.accent} ${theme.hover} w-full text-left transition-colors`}>
                  Show more
                </button>
              </div>

              {/* Who to follow */}
              <div className={`rounded-2xl ${theme.trendBg} overflow-hidden`}>
                <h3 className={`text-xl font-extrabold ${theme.text} px-4 py-3`}>Who to follow</h3>
                {[
                  { name: 'Eclipse Store', handle: '@EclipseStore' },
                  { name: 'Eclipse Finance', handle: '@EclipseFinance' },
                ].map((user, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 ${theme.hover} transition-colors cursor-pointer`}>
                    <img src={marketplaceLogo} alt={user.name} className="h-10 w-10 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-bold ${theme.text} truncate`}>{user.name}</p>
                      <p className={`text-[15px] ${theme.textSecondary} truncate`}>{user.handle}</p>
                    </div>
                    <button className={`${xDark ? 'bg-[#eff3f4] text-[#0f1419]' : 'bg-[#0f1419] text-white'} rounded-full px-4 py-1.5 text-[13px] font-bold`}>
                      Follow
                    </button>
                  </div>
                ))}
                <button className={`px-4 py-3 text-[15px] ${theme.accent} ${theme.hover} w-full text-left transition-colors`}>
                  Show more
                </button>
              </div>

              {/* Footer links */}
              <div className="px-4 flex flex-wrap gap-x-3 gap-y-1">
                {['Terms of Service', 'Privacy Policy', 'Cookie Policy', 'Accessibility', 'Ads info', 'More'].map((link) => (
                  <span key={link} className={`text-[13px] ${theme.textSecondary} hover:underline cursor-pointer`}>{link}</span>
                ))}
                <span className={`text-[13px] ${theme.textSecondary}`}>© 2026 Eclipse</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
