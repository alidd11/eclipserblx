import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type JobApplication, getApplicationStatusBadge } from './types';

interface ApplicationTableProps {
  applications: JobApplication[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onView: (app: JobApplication) => void;
}

export function ApplicationTable({
  applications,
  isLoading,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onView,
}: ApplicationTableProps) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or position..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm">Applications ({applications.length})</h3>
        </div>
        <div className="p-4">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading applications...</p>
          ) : applications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No applications found</p>
          ) : (
            <>
              {/* Mobile */}
              <div className="block md:hidden space-y-3">
                {applications.map((app) => (
                  <div key={app.id} className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.includes(app.id)}
                        onCheckedChange={() => onToggleSelect(app.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{app.applicant_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{app.applicant_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{app.position}</span>
                      {getApplicationStatusBadge(app.status)}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</span>
                      <Button variant="outline" size="sm" onClick={() => onView(app)}>
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={applications.length > 0 && applications.every(app => selectedIds.includes(app.id))}
                          onCheckedChange={onSelectAll}
                        />
                      </TableHead>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(app.id)}
                            onCheckedChange={() => onToggleSelect(app.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.applicant_name}</p>
                            <p className="text-sm text-muted-foreground">{app.applicant_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{app.position}</TableCell>
                        <TableCell>{getApplicationStatusBadge(app.status)}</TableCell>
                        <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => onView(app)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
