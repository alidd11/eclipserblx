import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Shield, 
  Calendar, 
  User, 
  Mail, 
  Clock, 
  Briefcase,
  Award,
  IdCard
} from 'lucide-react';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/useAdminAuth';

type AppRole = 'admin' | 'product_manager' | 'order_manager' | 'support_agent' | 'analyst' | 'recruiter';

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  product_manager: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  order_manager: 'bg-green-500/20 text-green-400 border-green-500/30',
  support_agent: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  analyst: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  recruiter: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  product_manager: 'Product Manager',
  order_manager: 'Order Manager',
  support_agent: 'Support Agent',
  analyst: 'Analyst',
  recruiter: 'Recruiter',
};

export default function StaffProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { hasRole, loading: authLoading } = useAdminAuth();
  const isAdmin = hasRole('admin');

  // Fetch staff profile details
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['staff-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId && isAdmin,
  });

  // Fetch staff roles
  const { data: roles = [] } = useQuery({
    queryKey: ['staff-roles', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as { role: AppRole; created_at: string }[];
    },
    enabled: !!userId && isAdmin,
  });

  // Fetch staff ID assignment log
  const { data: staffIdLog } = useQuery({
    queryKey: ['staff-id-log', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_id_logs')
        .select('*')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!userId && isAdmin,
  });

  // Fetch job application (hire date)
  const { data: application } = useQuery({
    queryKey: ['staff-application', profile?.email],
    queryFn: async () => {
      if (!profile?.email) return null;
      
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('applicant_email', profile.email)
        .eq('status', 'accepted')
        .order('reviewed_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!profile?.email && isAdmin,
  });

  // Fetch staff activity count
  const { data: activityCount = 0 } = useQuery({
    queryKey: ['staff-activity-count', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('staff_activity')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId && isAdmin,
  });

  if (authLoading || profileLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (!profile) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Staff member not found</p>
          <Button asChild className="mt-4">
            <Link to="/admin/staff-directory">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Directory
            </Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const hireDate = application?.reviewed_at || staffIdLog?.assigned_at || roles[0]?.created_at;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back Button */}
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/staff-directory">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Directory
          </Link>
        </Button>

        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                  {(profile.display_name || 'U').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold">
                  {profile.display_name || 'Unknown User'}
                </h1>
                
                {/* Staff ID */}
                {profile.staff_id && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="font-mono font-medium text-primary">
                      {profile.staff_id}
                    </span>
                  </div>
                )}

                {/* Roles */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                  {roles.map(({ role }) => (
                    <Badge
                      key={role}
                      variant="outline"
                      className={`${ROLE_COLORS[role]}`}
                    >
                      {ROLE_LABELS[role]}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Customer ID</span>
                <span className="font-mono text-sm">{profile.customer_id || 'N/A'}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Staff ID</span>
                <span className="font-mono text-sm">{profile.staff_id || 'N/A'}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm">{profile.email}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Account Created</span>
                <span className="text-sm">
                  {format(new Date(profile.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Hired On
                </span>
                <span className="text-sm font-medium">
                  {hireDate ? format(new Date(hireDate), 'MMM d, yyyy') : 'N/A'}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Last Active
                </span>
                <span className="text-sm">
                  {profile.last_seen 
                    ? format(new Date(profile.last_seen), 'MMM d, yyyy h:mm a')
                    : 'Never'
                  }
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Award className="h-4 w-4" />
                  Activities Logged
                </span>
                <span className="text-sm font-medium">{activityCount}</span>
              </div>
              {application && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Position Applied</span>
                    <span className="text-sm">{application.position}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Role History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IdCard className="h-5 w-5" />
              Role History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No roles assigned
              </p>
            ) : (
              <div className="space-y-2">
                {roles.map(({ role, created_at }, index) => (
                  <div
                    key={`${role}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <Badge variant="outline" className={ROLE_COLORS[role]}>
                      {ROLE_LABELS[role]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Assigned {format(new Date(created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
