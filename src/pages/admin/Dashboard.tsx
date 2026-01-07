import { useQuery } from '@tanstack/react-query';
import { Package, ShoppingCart, Users, MessageCircle, FileText, BarChart3, ArrowRight } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-quick-stats'],
    queryFn: async () => {
      const [orders, products, users, chats, applications] = await Promise.all([
        supabase.from('orders').select('id, status'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('chat_conversations').select('id, status'),
        supabase.from('job_applications').select('id, status'),
      ]);

      const pendingOrders = orders.data?.filter(o => o.status === 'pending').length ?? 0;
      const activeChats = chats.data?.filter(c => c.status === 'active' || c.status === 'waiting').length ?? 0;
      const pendingApplications = applications.data?.filter(a => a.status === 'pending').length ?? 0;

      return {
        products: products.count ?? 0,
        orders: orders.data?.length ?? 0,
        users: users.count ?? 0,
        pendingOrders,
        activeChats,
        pendingApplications,
      };
    },
  });

  const quickLinks = [
    { title: 'View Analytics', href: '/admin/analytics', icon: BarChart3, description: 'Detailed metrics & charts' },
    { title: 'Manage Products', href: '/admin/products', icon: Package, description: 'Add or edit products' },
    { title: 'View Orders', href: '/admin/orders', icon: ShoppingCart, description: `${stats?.pendingOrders ?? 0} pending` },
    { title: 'Live Chat', href: '/admin/live-chat', icon: MessageCircle, description: `${stats?.activeChats ?? 0} active` },
    { title: 'Applications', href: '/admin/applications', icon: FileText, description: `${stats?.pendingApplications ?? 0} pending` },
    { title: 'Manage Users', href: '/admin/users', icon: Users, description: `${stats?.users ?? 0} total` },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's a quick overview.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.orders ?? 0}</div>
              {stats?.pendingOrders ? (
                <p className="text-xs text-muted-foreground">{stats.pendingOrders} pending</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.products ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Chats</CardTitle>
              <MessageCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeChats ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <link.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{link.title}</p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
