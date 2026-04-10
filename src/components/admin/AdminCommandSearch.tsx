import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Settings,
  MessageCircle, FileText, Star, TrendingUp, Activity, ClipboardList,
  Mail, BarChart3, HelpCircle, AlertTriangle, Tags, Ban, Gift,
  Inbox, Shield, Megaphone, IdCard, Gamepad2, Store, FolderOpen,
  Ticket, Bot, Upload, Wallet, DollarSign, Globe, Scale, Rss,
  FileCode, Zap, RotateCcw, Headphones, Twitter, ShieldCheck, Link2, Code, LucideIcon,
} from 'lucide-react';
import { useSearchCommand } from '@/hooks/useSearchCommand';

interface SearchItem {
  title: string;
  href: string;
  icon: LucideIcon;
  group: string;
  keywords?: string;
}

const searchItems: SearchItem[] = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard, group: 'Navigation' },
  { title: 'Analytics', href: '/admin/analytics', icon: BarChart3, group: 'Daily Operations', keywords: 'stats metrics data' },
  { title: 'Ad Analytics', href: '/admin/advertisement-analytics', icon: Megaphone, group: 'Daily Operations' },
  { title: 'Community Announcements', href: '/admin/community-announcements', icon: Megaphone, group: 'Daily Operations' },
  { title: 'Discord Polls', href: '/admin/discord-polls', icon: BarChart3, group: 'Daily Operations' },
  { title: 'QOTD', href: '/admin/discord-qotd', icon: MessageCircle, group: 'Daily Operations' },
  { title: 'Twitter / X', href: '/admin/twitter-posts', icon: Twitter, group: 'Daily Operations', keywords: 'social media posts' },
  { title: 'Promotions', href: '/admin/promotions', icon: Tags, group: 'Daily Operations', keywords: 'discounts coupons' },
  { title: 'Revenue', href: '/admin/revenue', icon: TrendingUp, group: 'Finance', keywords: 'income money earnings' },
  { title: 'Platform Ledger', href: '/admin/platform-ledger', icon: DollarSign, group: 'Finance' },
  { title: 'Payouts', href: '/admin/payouts', icon: Wallet, group: 'Finance' },
  { title: 'Refunds & Disputes', href: '/admin/disputes-refunds', icon: RotateCcw, group: 'Finance' },
  { title: 'Affiliates', href: '/admin/affiliate-hub', icon: Gift, group: 'Finance' },
  { title: 'Live Chat', href: '/admin/live-chat', icon: Inbox, group: 'Communications', keywords: 'support chat' },
  { title: 'Customer Tickets', href: '/admin/customer-tickets', icon: Ticket, group: 'Communications', keywords: 'support tickets' },
  { title: 'Seller Tickets', href: '/admin/seller-tickets', icon: Ticket, group: 'Communications' },
  { title: 'Transcripts', href: '/admin/transcripts', icon: FileText, group: 'Communications' },
  { title: 'Messages', href: '/admin/messages', icon: MessageCircle, group: 'Communications', keywords: 'staff chat' },
  { title: 'Products', href: '/admin/products', icon: Package, group: 'Store', keywords: 'items listings' },
  { title: 'Categories', href: '/admin/categories', icon: FolderOpen, group: 'Store' },
  { title: 'Orders', href: '/admin/orders', icon: ShoppingCart, group: 'Store', keywords: 'purchases transactions' },
  { title: 'Reviews', href: '/admin/reviews', icon: Star, group: 'Store', keywords: 'ratings feedback' },
  { title: 'Seller Stores', href: '/admin/seller-commissions', icon: Store, group: 'Marketplace' },
  { title: 'Store Applications', href: '/admin/store-applications', icon: FileText, group: 'Marketplace' },
  { title: 'Staff Directory', href: '/admin/staff-directory', icon: IdCard, group: 'Team', keywords: 'employees team members' },
  { title: 'Staff Activity', href: '/admin/staff-activity', icon: Activity, group: 'Team' },
  { title: 'Internal Notes', href: '/admin/internal-notes', icon: FileText, group: 'Team' },
  { title: 'Applications', href: '/admin/applications', icon: FileText, group: 'Team', keywords: 'hiring jobs' },
  { title: 'User Management', href: '/admin/users', icon: Users, group: 'Customers', keywords: 'customers accounts' },
  { title: 'Gift Credits', href: '/admin/gift-credits', icon: Gift, group: 'Customers' },
  { title: 'IP Bans', href: '/admin/ip-bans', icon: Ban, group: 'Customers' },
  { title: 'Subscribers', href: '/admin/subscribers', icon: Mail, group: 'Customers' },
  { title: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardList, group: 'System', keywords: 'history trail' },
  { title: 'Rate Limits', href: '/admin/rate-limits', icon: Shield, group: 'System' },
  { title: 'Role Permissions', href: '/admin/role-permissions', icon: Shield, group: 'System', keywords: 'access control' },
  { title: 'Settings', href: '/admin/settings', icon: Settings, group: 'System', keywords: 'configuration preferences' },
  { title: 'Changelog', href: '/admin/changelog', icon: FileText, group: 'System' },
  { title: 'Incidents', href: '/admin/incidents', icon: AlertTriangle, group: 'System' },
  { title: 'Help', href: '/admin/help', icon: HelpCircle, group: 'System' },
];

export function AdminCommandSearch() {
  const { open, setOpen } = useSearchCommand();
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const map = new Map<string, SearchItem[]>();
    searchItems.forEach(item => {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    });
    return map;
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search admin pages..." />
      <CommandList>
        <CommandEmpty>No pages found.</CommandEmpty>
        {Array.from(groups.entries()).map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map(item => (
              <CommandItem
                key={item.href}
                value={`${item.title} ${item.keywords || ''}`}
                onSelect={() => handleSelect(item.href)}
                className="gap-2 cursor-pointer"
              >
                <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
