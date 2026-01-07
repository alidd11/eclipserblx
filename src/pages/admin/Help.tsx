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
  Zap
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    roles: ['Admin'],
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

const quickTips = [
  {
    icon: Clock,
    title: 'Always Clock In',
    description: 'Start your shift by clocking in on the Dashboard. This helps track work hours and ensures accurate records.'
  },
  {
    icon: Zap,
    title: 'Use Quick Responses',
    description: 'In Live Chat, use the quick response button to insert pre-written professional replies for common questions.'
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'You only see menu items and features relevant to your assigned roles. Admins have full access to everything.'
  },
  {
    icon: Download,
    title: 'Export Data',
    description: 'Many pages support exporting data as CSV for reporting. Look for export buttons in Analytics and Income pages.'
  }
];

export default function AdminHelp() {
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

        {/* Quick Tips */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="h-5 w-5" />
              Quick Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickTips.map((tip, index) => (
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
          </CardContent>
        </Card>

        {/* Dashboard Sections */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutDashboard className="h-5 w-5" />
              Dashboard Sections
            </CardTitle>
            <CardDescription>Click on any section to learn more about its features</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {dashboardSections.map((section, index) => (
                <AccordionItem key={index} value={`section-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
                        <section.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{section.title}</span>
                          <div className="flex gap-1 flex-wrap">
                            {section.roles.map((role) => (
                              <Badge key={role} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {role}
                              </Badge>
                            ))}
                          </div>
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
          </CardContent>
        </Card>

        {/* Role Permissions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Role Permissions
            </CardTitle>
            <CardDescription>Understanding what each role can access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Admin</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Full access to all dashboard features including user management, income analytics, audit logs, and system settings. Can assign roles to other users (except Admin role which requires primary admin).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 mb-2">Product Manager</Badge>
                  <p className="text-xs text-muted-foreground">
                    Manage products, categories, images, and downloadable files.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-2">Order Manager</Badge>
                  <p className="text-xs text-muted-foreground">
                    View and manage orders, process refunds, and handle order inquiries.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-2">Support Agent</Badge>
                  <p className="text-xs text-muted-foreground">
                    Access live chat to respond to customer support inquiries in real-time.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 mb-2">Recruiter</Badge>
                  <p className="text-xs text-muted-foreground">
                    Review job applications, contact applicants, and manage hiring pipeline.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border sm:col-span-2">
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 mb-2">Analyst</Badge>
                  <p className="text-xs text-muted-foreground">
                    View analytics and reports for business insights (analytics access only).
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" />
              Getting Started Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">1</div>
                <p className="text-sm">Clock in when you start your shift using the Duty Status card on the Dashboard</p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">2</div>
                <p className="text-sm">Check Live Chat for any waiting customer inquiries that need attention</p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">3</div>
                <p className="text-sm">Review pending orders and process any that need action</p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">4</div>
                <p className="text-sm">Check Staff Messages for any team announcements or updates</p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">5</div>
                <p className="text-sm">Remember to clock out with notes about your session when you finish</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
