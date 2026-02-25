import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IPStaffLayout } from '@/components/ip-staff/IPStaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Gavel, Users, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function IPStaffOverview() {
  const { data: stats } = useQuery({
    queryKey: ['ip-staff-stats'],
    queryFn: async () => {
      const [takedowns, customPlans, messages] = await Promise.all([
        supabase.from('takedown_requests').select('id, status', { count: 'exact', head: true }),
        supabase.from('ip_shield_custom_plans' as any).select('id', { count: 'exact', head: true }),
        supabase.from('ip_shield_contact_messages' as any).select('id, status', { count: 'exact', head: false }),
      ]);
      
      const openMessages = ((messages.data || []) as any[]).filter((m: any) => m.status === 'open').length;
      
      return {
        totalTakedowns: takedowns.count || 0,
        totalCustomPlans: customPlans.count || 0,
        totalMessages: messages.count || 0,
        openMessages,
      };
    },
  });

  const cards = [
    { title: 'Takedown Requests', value: stats?.totalTakedowns ?? '—', icon: Gavel, href: '/ip-staff/takedowns', color: 'text-orange-500' },
    { title: 'Custom Plans', value: stats?.totalCustomPlans ?? '—', icon: Users, href: '/ip-staff/custom-plans', color: 'text-blue-500' },
    { title: 'Open Messages', value: stats?.openMessages ?? '—', icon: MessageSquare, href: '/ip-staff/inbox', color: 'text-green-500' },
  ];

  return (
    <IPStaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-500" /> IP Shield Staff Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage takedown requests, custom plans, and contact messages</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map(card => (
            <Link key={card.href} to={card.href}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </IPStaffLayout>
  );
}
