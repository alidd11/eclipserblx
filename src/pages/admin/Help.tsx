import { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  MessageCircle, 
  FileText, 
  Star, 
  TrendingUp, 
  Activity, 
  ClipboardList, 
  Mail, 
  BarChart3,
  Clock,
  Shield,
  Download,
  HelpCircle,
  BookOpen,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAdminAuth } from '@/hooks/useAdminAuth';

// Map display roles to database role values
const ROLE_MAP: Record<string, string[]> = {
  'All Staff': ['admin', 'product_manager', 'order_manager', 'support_agent', 'analyst', 'recruiter'],
  'Admin': ['admin'],
  'Product Manager': ['product_manager'],
  'Order Manager': ['order_manager'],
  'Support Agent': ['support_agent'],
  'Analyst': ['analyst'],
  'Recruiter': ['recruiter'],
};

const dashboardSections = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Your central hub for quick actions and duty management.',
    roles: ['All Staff'],
    features: [
      'Quick Actions grid for fast navigation to key areas',
      'Duty Clock In/Out system to track your work hours',
      'Live timer showing current session duration',
      'View your recent duty logs with notes',
      'Admins can see all staff duty logs'
    ]
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    description: 'Comprehensive metrics and performance data.',
    roles: ['Admin', 'Analyst'],
    features: [
      'Sales metrics and order statistics',
      'Customer growth and user analytics',
      'Product performance tracking',
      'Download statistics and trends',
      'Visual charts and graphs for data insights'
    ]
  },
  {
    title: 'Income',
    icon: TrendingUp,
    description: 'Financial overview and revenue tracking.',
    roles: ['Admin'],
    features: [
      'Daily, weekly, monthly, and yearly revenue breakdowns',
      '30-day revenue trend line chart',
      'Export financial reports as CSV',
      'Password re-verification required for security',
      'All access attempts are logged for audit'
    ]
  },
  {
    title: 'Staff Activity',
    icon: Activity,
    description: 'Monitor team activities and actions.',
    roles: ['Admin'],
    features: [
      'Track all staff actions across the dashboard',
      'See who handled which orders and chats',
      'Monitor product updates and changes',
      'Review login and session activity',
      'Filter activities by staff member or action type'
    ]
  },
  {
    title: 'Staff Messages',
    icon: Mail,
    description: 'Internal communication between team members.',
    roles: ['All Staff'],
    features: [
      'Send private messages to other staff',
      'Broadcast announcements to the team',
      'Track read/unread message status',
      'Keep internal discussions separate from customer support'
    ]
  },
  {
    title: 'Products',
    icon: Package,
    description: 'Manage your product catalog.',
    roles: ['Admin', 'Product Manager'],
    features: [
      'Add, edit, and remove products',
      'Upload product images and media',
      'Set prices and manage categories',
      'Toggle product visibility (active/inactive)',
      'Feature products on the homepage',
      'Upload and manage downloadable asset files'
    ]
  },
  {
    title: 'Orders',
    icon: ShoppingCart,
    description: 'View and manage customer orders.',
    roles: ['Admin', 'Order Manager'],
    features: [
      'View all orders with status tracking',
      'See order details, items, and payment info',
      'Process refunds when needed',
      'Filter orders by status, date, or customer',
      'Track discount codes used'
    ]
  },
  {
    title: 'Reviews',
    icon: Star,
    description: 'Moderate customer reviews.',
    roles: ['Admin'],
    features: [
      'Approve or reject pending reviews',
      'Feature top reviews on the homepage',
      'View ratings and feedback per product',
      'Manage review moderation queue'
    ]
  },
  {
    title: 'Live Chat',
    icon: MessageCircle,
    description: 'Real-time customer support.',
    roles: ['Admin', 'Support Agent'],
    features: [
      'Respond to customer inquiries in real-time',
      'Quick response templates for common questions',
      'File attachment support for sharing screenshots',
      'Typing indicators show when customer is typing',
      'Sound and push notifications for new messages',
      'Claim and manage conversation ownership',
      'View chat history and closed conversations'
    ]
  },
  {
    title: 'Applications',
    icon: FileText,
    description: 'Review job applications.',
    roles: ['Admin', 'Recruiter'],
    features: [
      'View incoming job applications',
      'Review applicant details and portfolios',
      'Send messages to applicants',
      'Update application status (pending, reviewing, accepted, rejected)',
      'Add internal notes on applications'
    ]
  },
  {
    title: 'Users',
    icon: Users,
    description: 'User management and role assignment.',
    roles: ['Admin'],
    features: [
      'View all registered users',
      'Assign and remove staff roles',
      'Available roles: Admin, Product Manager, Order Manager, Support Agent, Analyst, Recruiter',
      'Search users by name or email',
      'Note: Only the primary admin can assign/remove Admin roles'
    ]
  },
  {
    title: 'Audit Logs',
    icon: ClipboardList,
    description: 'Security and activity logging.',
    roles: ['Admin'],
    features: [
      'Track all significant actions in the system',
      'View who did what and when',
      'Monitor security-sensitive operations',
      'Filter logs by action type, user, or date'
    ]
  },
  {
    title: 'Settings',
    icon: Settings,
    description: 'Configure dashboard and site settings.',
    roles: ['Admin'],
    features: [
      'Manage site-wide configurations',
      'Configure notification preferences',
      'Adjust display and behavior settings'
    ]
  }
];

// Quick tips with role filters and merged getting started checklist items
const quickTips = [
  {
    icon: Clock,
    title: 'Always Clock In',
    description: 'Start your shift by clocking in on the Dashboard. This helps track work hours and ensures accurate records.',
    roles: ['All Staff'],
    isGettingStarted: true,
    order: 1
  },
  {
    icon: MessageCircle,
    title: 'Check Live Chat First',
    description: 'When starting your shift, check Live Chat for any waiting customer inquiries that need attention.',
    roles: ['Admin', 'Support Agent'],
    isGettingStarted: true,
    order: 2
  },
  {
    icon: ShoppingCart,
    title: 'Review Pending Orders',
    description: 'Review pending orders and process any that need action to keep customers happy.',
    roles: ['Admin', 'Order Manager'],
    isGettingStarted: true,
    order: 3
  },
  {
    icon: Mail,
    title: 'Check Staff Messages',
    description: 'Check Staff Messages for any team announcements or updates from other staff members.',
    roles: ['All Staff'],
    isGettingStarted: true,
    order: 4
  },
  {
    icon: Clock,
    title: 'Clock Out with Notes',
    description: 'Remember to clock out with notes about your session when you finish your shift.',
    roles: ['All Staff'],
    isGettingStarted: true,
    order: 5
  },
  {
    icon: Zap,
    title: 'Use Quick Responses',
    description: 'In Live Chat, use the quick response button to insert pre-written professional replies for common questions.',
    roles: ['Admin', 'Support Agent'],
    isGettingStarted: false
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'You only see menu items and features relevant to your assigned roles. Admins have full access to everything.',
    roles: ['All Staff'],
    isGettingStarted: false
  },
  {
    icon: Download,
    title: 'Export Data',
    description: 'Many pages support exporting data as CSV for reporting. Look for export buttons in Analytics and Income pages.',
    roles: ['Admin', 'Analyst'],
    isGettingStarted: false
  },
  {
    icon: Package,
    title: 'Product Media',
    description: 'Drag and drop to reorder product images. The first image becomes the thumbnail shown in listings.',
    roles: ['Admin', 'Product Manager'],
    isGettingStarted: false
  },
  {
    icon: FileText,
    title: 'Application Notes',
    description: 'Add internal notes to job applications to share insights with other recruiters reviewing the same applicant.',
    roles: ['Admin', 'Recruiter'],
    isGettingStarted: false
  }
];

export default function AdminHelp() {
  const { roles, isAdmin } = useAdminAuth();
  const [quickTipsOpen, setQuickTipsOpen] = useState(true);

  // Check if user has access to a section based on their roles
  const hasAccessToSection = (sectionRoles: string[]) => {
    if (isAdmin) return true;
    
    return sectionRoles.some(displayRole => {
      const dbRoles = ROLE_MAP[displayRole] || [];
      return dbRoles.some(dbRole => roles.includes(dbRole as any));
    });
  };

  // Filter sections based on user's roles
  const visibleSections = dashboardSections.filter(section => hasAccessToSection(section.roles));

  // Filter tips based on user's roles
  const visibleTips = quickTips.filter(tip => hasAccessToSection(tip.roles));

  // Separate getting started items from other tips
  const gettingStartedTips = visibleTips
    .filter(tip => tip.isGettingStarted)
    .sort((a, b) => (a.order || 99) - (b.order || 99));
  const otherTips = visibleTips.filter(tip => !tip.isGettingStarted);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-display">Dashboard Guide</CardTitle>
                <CardDescription>Learn how everything works in the admin dashboard</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Tips - Collapsible */}
        <Collapsible open={quickTipsOpen} onOpenChange={setQuickTipsOpen}>
          <Card className="bg-card border-border">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <HelpCircle className="h-5 w-5" />
                    Quick Tips & Getting Started
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {quickTipsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {/* Getting Started Checklist */}
                {gettingStartedTips.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Getting Started Checklist
                    </h4>
                    <div className="space-y-2">
                      {gettingStartedTips.map((tip, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex-shrink-0">
                            {tip.order}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{tip.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Tips */}
                {otherTips.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Pro Tips
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {otherTips.map((tip, index) => (
                        <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 h-fit">
                            <tip.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tip.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{tip.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Dashboard Sections - Filtered by role */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutDashboard className="h-5 w-5" />
              Your Dashboard Sections
            </CardTitle>
            <CardDescription>
              Features available to you based on your roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {visibleSections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sections available for your current role.
              </p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {visibleSections.map((section, index) => (
                  <AccordionItem key={index} value={`section-${index}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
                          <section.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{section.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-11 pr-2 pb-2">
                        <p className="text-sm text-muted-foreground mb-3 sm:hidden">
                          {section.description}
                        </p>
                        <ul className="space-y-2">
                          {section.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-start gap-2 text-sm">
                              <span className="text-primary mt-1">•</span>
                              <span className="text-muted-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
