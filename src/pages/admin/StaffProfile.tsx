import { Navigate, Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Shield, Calendar, User, Clock, Briefcase, Award } from 'lucide-react';
import { StaffDocuments } from '@/components/admin/StaffDocuments';
import { EffectivePermissions } from '@/components/admin/EffectivePermissions';
import { format } from '@/lib/dateUtils';
import { useStaffProfileData } from './staff-profile/useStaffProfileData';
import { StaffNotesSection } from './staff-profile/StaffNotesSection';
import { StaffRoleManagement } from './staff-profile/StaffRoleManagement';

export default function StaffProfile() {
 const { userId } = useParams<{ userId: string }>();
 const data = useStaffProfileData(userId);

 if (data.authLoading || data.profileLoading) {
  return (
   <AdminLayout requiredPermissions={['view_staff_directory']}>
    <div className="flex items-center justify-center h-64">
     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
   </AdminLayout>
  );
 }

 if (!data.isAdmin) {
  return <Navigate to="/admin" replace />;
 }

 if (!data.profile) {
  return (
   <AdminLayout requiredPermissions={['view_staff_directory']}>
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

 const { profile, roles, hireDate, application, activityCount, isPrimaryAdmin } = data;

 return (
  <AdminLayout requiredPermissions={['view_staff_directory']}>
   <div className="space-y-6 max-w-4xl mx-auto pb-8">
    {/* Back Button */}
    <Button variant="ghost" size="sm" asChild>
     <Link to="/admin/staff-directory">
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back to Directory
     </Link>
    </Button>

    {/* Profile Header */}
    <div className="border border-border rounded-xl overflow-hidden">
     <div className="p-4 pt-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
       <Avatar className="h-24 w-24">
        <AvatarImage src={profile.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
         {(profile.display_name || 'U').slice(0, 2).toUpperCase()}
        </AvatarFallback>
       </Avatar>

       <div className="flex-1 text-center sm:text-left">
        <h1 className="text-2xl font-bold">{profile.display_name || 'Unknown User'}</h1>
        {profile.staff_id && (
         <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-mono font-medium text-primary">{profile.staff_id}</span>
         </div>
        )}
        <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
         {roles.map(({ role }) => {
          const roleInfo = data.getRoleInfo(role);
          return (
           <Badge key={role} variant="outline" className={`${roleInfo.color} text-foreground border-transparent`}>
            {roleInfo.displayName}
           </Badge>
          );
         })}
        </div>
       </div>
      </div>
     </div>
    </div>

    {/* Details Grid */}
    <div className="grid gap-4 md:grid-cols-2">
     {/* Account Information */}
     <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
       <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
        <User className="h-5 w-5" />
        Account Information
       </h3>
      </div>
      <div className="p-4 space-y-4">
       <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Customer ID</span>
        <span className="font-mono text-sm">{profile.customer_id || 'N/A'}</span>
       </div>
       <Separator />
       <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Staff ID</span>
        <span className="font-mono text-sm">{profile.staff_id || 'N/A'}</span>
       </div>
       {!isPrimaryAdmin && (
        <>
         <Separator />
         <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Email</span>
          <span className="text-sm">{profile.email}</span>
         </div>
        </>
       )}
       <Separator />
       <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Account Created</span>
        <span className="text-sm">{format(new Date(profile.created_at), 'MMM d, yyyy')}</span>
       </div>
      </div>
     </div>

     {/* Employment Details */}
     <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
       <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
        <Briefcase className="h-5 w-5" />
        Employment Details
       </h3>
      </div>
      <div className="p-4 space-y-4">
       <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Calendar className="h-4 w-4" />Hired On</span>
        <span className="text-sm font-medium">{hireDate ? format(new Date(hireDate), 'MMM d, yyyy') : 'N/A'}</span>
       </div>
       <Separator />
       <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock className="h-4 w-4" />Last Active</span>
        <span className="text-sm">{profile.last_seen ? format(new Date(profile.last_seen), 'MMM d, yyyy h:mm a') : 'Never'}</span>
       </div>
       <Separator />
       <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Award className="h-4 w-4" />Activities Logged</span>
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
      </div>
     </div>
    </div>

    {/* Role Management */}
    <StaffRoleManagement
     userId={userId!}
     profileDisplayName={profile.display_name || 'this staff member'}
     roles={roles}
     newRole={data.newRole}
     setNewRole={data.setNewRole}
     roleToRemove={data.roleToRemove}
     setRoleToRemove={data.setRoleToRemove}
     availableRoles={data.availableRoles}
     getRoleInfo={data.getRoleInfo}
     canRemoveRole={data.canRemoveRole}
     addRoleMutation={data.addRoleMutation}
     removeRoleMutation={data.removeRoleMutation}
    />

    {/* Internal Notes */}
    <StaffNotesSection
     staffNotes={data.staffNotes}
     notesLoading={data.notesLoading}
     currentUserId={data.user?.id}
     addNoteMutation={data.addNoteMutation}
     deleteNoteMutation={data.deleteNoteMutation}
    />

    {/* Effective Permissions Viewer */}
    <EffectivePermissions userId={userId!} />

    {/* Staff Documents Section */}
    <StaffDocuments staffUserId={userId!} currentUserId={data.user?.id || ''} isAdmin={data.isAdmin} />
   </div>
  </AdminLayout>
 );
}
