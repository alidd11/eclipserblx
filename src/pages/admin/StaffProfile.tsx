import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Shield, 
  Calendar, 
  User, 
  Clock, 
  Briefcase,
  Award,
  IdCard,
  StickyNote,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'sonner';

interface StaffNote {
  id: string;
  staff_user_id: string;
  author_id: string;
  content: string;
  note_type: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'performance', label: 'Performance' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'warning', label: 'Warning' },
  { value: 'commendation', label: 'Commendation' },
];

const NOTE_TYPE_COLORS: Record<string, string> = {
  general: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  performance: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  feedback: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  warning: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  commendation: 'bg-green-500/20 text-green-400 border-green-500/30',
};

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
  const { hasRole, user, loading: authLoading } = useAdminAuth();
  const isAdmin = hasRole('admin');
  const queryClient = useQueryClient();
  
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState('general');
  const [isAddingNote, setIsAddingNote] = useState(false);

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

  // Fetch staff notes
  const { data: staffNotes = [], isLoading: notesLoading } = useQuery<StaffNote[]>({
    queryKey: ['staff-notes', userId],
    queryFn: async (): Promise<StaffNote[]> => {
      const { data, error } = await supabase
        .from('staff_notes')
        .select('*')
        .eq('staff_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get author names
      const authorIds = [...new Set(data.map(n => n.author_id))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]));

      return data.map(note => ({
        id: note.id,
        staff_user_id: note.staff_user_id,
        author_id: note.author_id,
        content: note.content,
        note_type: note.note_type ?? 'general',
        created_at: note.created_at,
        updated_at: note.updated_at,
        author_name: profileMap.get(note.author_id) || 'Unknown',
      }));
    },
    enabled: !!userId && isAdmin,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ content, noteType }: { content: string; noteType: string }) => {
      const { error } = await supabase
        .from('staff_notes')
        .insert({
          staff_user_id: userId,
          author_id: user?.id,
          content,
          note_type: noteType,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notes', userId] });
      setNewNoteContent('');
      setNewNoteType('general');
      setIsAddingNote(false);
      toast.success('Note added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add note: ' + error.message);
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('staff_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notes', userId] });
      toast.success('Note deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete note: ' + error.message);
    },
  });

  const handleAddNote = () => {
    if (!newNoteContent.trim()) {
      toast.error('Please enter note content');
      return;
    }
    addNoteMutation.mutate({ content: newNoteContent.trim(), noteType: newNoteType });
  };

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
      <div className="space-y-6 max-w-4xl mx-auto pb-8">
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

        {/* Internal Notes Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Internal Notes
            </CardTitle>
            {!isAddingNote && (
              <Button size="sm" onClick={() => setIsAddingNote(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Note Form */}
            {isAddingNote && (
              <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
                <div className="flex gap-2">
                  <Select value={newNoteType} onValueChange={setNewNoteType}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Enter your note..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingNote(false);
                      setNewNoteContent('');
                      setNewNoteType('general');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={addNoteMutation.isPending}
                  >
                    {addNoteMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    )}
                    Save Note
                  </Button>
                </div>
              </div>
            )}

            {/* Notes List */}
            {notesLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse p-4 rounded-lg bg-muted/30">
                    <div className="h-4 w-24 bg-muted rounded mb-2" />
                    <div className="h-3 w-full bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : staffNotes.length === 0 ? (
              <div className="text-center py-8">
                <StickyNote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No notes yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add internal notes for performance tracking
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffNotes.map(note => (
                  <div
                    key={note.id}
                    className="p-4 rounded-lg border border-border/50 bg-muted/20"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${NOTE_TYPE_COLORS[note.note_type] || NOTE_TYPE_COLORS.general}`}
                        >
                          {NOTE_TYPES.find(t => t.value === note.note_type)?.label || 'General'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          by {note.author_name}
                        </span>
                      </div>
                      {note.author_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          disabled={deleteNoteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
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
