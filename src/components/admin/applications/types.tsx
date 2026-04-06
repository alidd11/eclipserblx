import { Badge } from '@/components/ui/badge';
import { Clock, Eye, CheckCircle, XCircle } from 'lucide-react';

export function getApplicationStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case 'reviewing':
      return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400"><Eye className="h-3 w-3 mr-1" />Reviewing</Badge>;
    case 'accepted':
      return <Badge variant="secondary" className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
    case 'rejected':
      return <Badge variant="secondary" className="bg-red-500/20 text-red-400"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    case 'closed':
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Closed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export interface JobApplication {
  id: string;
  position: string;
  applicant_name: string;
  applicant_email: string;
  discord_username: string | null;
  portfolio_url: string | null;
  experience: string | null;
  message: string;
  status: string;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  access_token: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicantMessage {
  id: string;
  application_id: string;
  subject: string;
  message: string;
  sent_by: string | null;
  is_read: boolean;
  created_at: string;
}
