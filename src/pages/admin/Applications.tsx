import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { type JobApplication } from '@/components/admin/applications/types';
import { ApplicationStats } from '@/components/admin/applications/ApplicationStats';
import { ApplicationTable } from '@/components/admin/applications/ApplicationTable';
import { ApplicationDetailDialog } from '@/components/admin/applications/ApplicationDetailDialog';
import { MassMessageDialog } from '@/components/admin/applications/MassMessageDialog';

export default function AdminApplications() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [showMassMessage, setShowMassMessage] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['job-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as JobApplication[];
    },
  });

  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    reviewing: applications.filter(a => a.status === 'reviewing').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAllFiltered = () => {
    const allIds = filteredApplications.map(a => a.id);
    const allSelected = allIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  return (
    <AdminLayout requiredPermissions={['view_applications']}>
      <div className="space-y-5">
        {/* Header */}
        <AdminPageHeader
          title="Job Applications"
          description="Review and manage job applications"
          actions={
            <Button onClick={() => setShowMassMessage(true)} variant="outline" className="gap-2 h-12">
              <Megaphone className="h-4 w-4" />
              Mass Message
            </Button>
          }
        />

        <ApplicationStats {...stats} />

        <ApplicationTable
          applications={filteredApplications}
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAllFiltered}
          onView={(app) => setSelectedApplication(app)}
        />

        <ApplicationDetailDialog
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
        />

        <MassMessageDialog
          open={showMassMessage}
          onClose={() => setShowMassMessage(false)}
          applications={applications}
          stats={stats}
        />
      </div>
    </AdminLayout>
  );
}
