import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Shield, FileText, Database, Globe, Clock, Users, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

// ─── ROPA: Records of Processing Activities (GDPR Art. 30) ───
const PROCESSING_ACTIVITIES = [
  {
    activity: 'User Registration & Authentication',
    purpose: 'Account creation and access management',
    legalBasis: 'Art. 6(1)(b) – Contract performance',
    dataCategories: 'Email, password hash, display name, IP address',
    dataSubjects: 'Registered users',
    recipients: 'Supabase (hosting), Sentry (error tracking)',
    retention: 'Duration of account + 30 days after deletion',
    transfers: 'US (Supabase – SCCs), US (Sentry – SCCs)',
  },
  {
    activity: 'Order Processing & Payments',
    purpose: 'Fulfil purchase transactions',
    legalBasis: 'Art. 6(1)(b) – Contract performance',
    dataCategories: 'Name, email, billing address, payment method (via Stripe)',
    dataSubjects: 'Customers',
    recipients: 'Stripe (payment processor)',
    retention: '7 years (HMRC legal obligation)',
    transfers: 'US (Stripe – SCCs)',
  },
  {
    activity: 'Customer Support (Live Chat & Tickets)',
    purpose: 'Respond to enquiries and resolve issues',
    legalBasis: 'Art. 6(1)(b) – Contract / Art. 6(1)(f) – Legitimate interest',
    dataCategories: 'Name, email, message content, attachments',
    dataSubjects: 'Users, visitors',
    recipients: 'Internal staff only',
    retention: '2 years after ticket closure',
    transfers: 'N/A',
  },
  {
    activity: 'Analytics & Page Tracking',
    purpose: 'Understand usage patterns, improve service',
    legalBasis: 'Art. 6(1)(a) – Consent',
    dataCategories: 'Anonymised visitor ID, page URL, referrer, device type',
    dataSubjects: 'Website visitors (with consent)',
    recipients: 'Internal only',
    retention: '90 days (auto-deleted)',
    transfers: 'N/A',
  },
  {
    activity: 'Cookie Consent Management',
    purpose: 'Record proof of consent for GDPR/PECR compliance',
    legalBasis: 'Art. 6(1)(c) – Legal obligation',
    dataCategories: 'Visitor ID, consent preferences, user agent, timestamp',
    dataSubjects: 'All visitors',
    recipients: 'Internal only',
    retention: '3 years after last interaction',
    transfers: 'N/A',
  },
  {
    activity: 'Email Communications (Transactional)',
    purpose: 'Order confirmations, password resets, account notifications',
    legalBasis: 'Art. 6(1)(b) – Contract performance',
    dataCategories: 'Email address, name',
    dataSubjects: 'Registered users',
    recipients: 'Resend (email provider)',
    retention: 'Duration of account',
    transfers: 'US (Resend – SCCs)',
  },
  {
    activity: 'Discord Integration',
    purpose: 'Account linking, community features, bot services',
    legalBasis: 'Art. 6(1)(a) – Consent / Art. 6(1)(b) – Contract',
    dataCategories: 'Discord user ID, username, avatar',
    dataSubjects: 'Users who link Discord',
    recipients: 'Discord Inc.',
    retention: 'Until unlinked or account deleted',
    transfers: 'US (Discord – SCCs)',
  },
  {
    activity: 'Seller Store Management',
    purpose: 'Enable sellers to list and sell products',
    legalBasis: 'Art. 6(1)(b) – Contract performance',
    dataCategories: 'Store info, product data, sales records, commission data',
    dataSubjects: 'Sellers',
    recipients: 'Stripe (payouts), Internal staff',
    retention: '7 years (financial records – HMRC)',
    transfers: 'US (Stripe – SCCs)',
  },
  {
    activity: 'IP Protection (IP Shield)',
    purpose: 'DMCA takedown processing, creator IP registry',
    legalBasis: 'Art. 6(1)(c) – Legal obligation / Art. 6(1)(f) – Legitimate interest',
    dataCategories: 'Creator identity, work details, evidence, case correspondence',
    dataSubjects: 'Creators, reported parties',
    recipients: 'Internal IP staff, hosting platforms',
    retention: '5 years after case closure',
    transfers: 'N/A',
  },
  {
    activity: 'Staff Activity Logging',
    purpose: 'Security auditing and accountability',
    legalBasis: 'Art. 6(1)(f) – Legitimate interest',
    dataCategories: 'User ID, activity type, timestamps, roles',
    dataSubjects: 'Staff members',
    recipients: 'Internal (admin only)',
    retention: '2 years',
    transfers: 'N/A',
  },
  {
    activity: 'Error & Performance Monitoring',
    purpose: 'Identify and fix technical issues',
    legalBasis: 'Art. 6(1)(f) – Legitimate interest',
    dataCategories: 'Error traces, browser info (no PII)',
    dataSubjects: 'All users',
    recipients: 'Sentry',
    retention: '90 days',
    transfers: 'US (Sentry – SCCs)',
  },
];

// ─── Sub-processor Registry (GDPR Art. 28) ───
const SUB_PROCESSORS = [
  {
    name: 'Supabase Inc.',
    purpose: 'Database hosting, authentication, file storage, edge functions',
    dataProcessed: 'All user data, files, authentication tokens',
    location: 'United States',
    transferMechanism: 'Standard Contractual Clauses (SCCs)',
    dpaUrl: 'https://supabase.com/legal/dpa',
    lastReviewed: '2026-03-06',
  },
  {
    name: 'Stripe Inc.',
    purpose: 'Payment processing, seller payouts, subscription billing',
    dataProcessed: 'Payment card data, billing addresses, transaction records',
    location: 'United States',
    transferMechanism: 'Standard Contractual Clauses (SCCs)',
    dpaUrl: 'https://stripe.com/legal/dpa',
    lastReviewed: '2026-03-06',
  },
  {
    name: 'Resend Inc.',
    purpose: 'Transactional email delivery',
    dataProcessed: 'Email addresses, email content',
    location: 'United States',
    transferMechanism: 'Standard Contractual Clauses (SCCs)',
    dpaUrl: 'https://resend.com/legal/dpa',
    lastReviewed: '2026-03-06',
  },
  {
    name: 'Sentry (Functional Software Inc.)',
    purpose: 'Error monitoring and performance tracking',
    dataProcessed: 'Error traces, browser metadata (PII excluded by config)',
    location: 'United States',
    transferMechanism: 'Standard Contractual Clauses (SCCs)',
    dpaUrl: 'https://sentry.io/legal/dpa/',
    lastReviewed: '2026-03-06',
  },
  {
    name: 'Discord Inc.',
    purpose: 'Account linking, community bot services, OAuth',
    dataProcessed: 'Discord user ID, username, avatar URL',
    location: 'United States',
    transferMechanism: 'Standard Contractual Clauses (SCCs)',
    dpaUrl: 'https://discord.com/privacy',
    lastReviewed: '2026-03-06',
  },
  {
    name: 'Roblox Corporation',
    purpose: 'Account linking, game platform integration',
    dataProcessed: 'Roblox user ID, username',
    location: 'United States',
    transferMechanism: 'Standard Contractual Clauses (SCCs)',
    dpaUrl: 'https://en.help.roblox.com/hc/en-us/articles/115004630823',
    lastReviewed: '2026-03-06',
  },
];

// ─── Data Retention Schedule ───
const RETENTION_SCHEDULE = [
  { dataType: 'Page visits / analytics', retention: '90 days', method: 'Auto-deleted by cleanup_expired_tracking_data', legal: 'PECR / Consent' },
  { dataType: 'Search logs', retention: '60 days', method: 'Auto-deleted by cleanup_expired_tracking_data', legal: 'Legitimate interest' },
  { dataType: 'IP address hashes', retention: '30–90 days', method: 'Anonymised then purged', legal: 'Legitimate interest' },
  { dataType: 'Orders & transactions', retention: '7 years', method: 'Retained (HMRC requirement)', legal: 'Art. 6(1)(c) – Legal obligation' },
  { dataType: 'Consent records', retention: '3 years after last interaction', method: 'Manual review', legal: 'Art. 6(1)(c) – Legal obligation' },
  { dataType: 'Audit logs', retention: '2 years', method: 'Auto-purged', legal: 'Legitimate interest' },
  { dataType: 'Support tickets (customer)', retention: '2 years after closure', method: 'Soft delete', legal: 'Contract / Legitimate interest' },
  { dataType: 'Staff activity logs', retention: '2 years', method: 'Auto-purged', legal: 'Legitimate interest' },
  { dataType: 'User accounts (inactive)', retention: '2 years of inactivity', method: 'Deactivation notice sent', legal: 'Storage limitation' },
  { dataType: 'Rate limit records', retention: '24 hours', method: 'Probabilistic cleanup', legal: 'Legitimate interest' },
];

export default function GDPRCompliance() {
  const { user, loading: authLoading } = useAuth();
  const [consentSearch, setConsentSearch] = useState('');

  // Strict access: only primary admin
  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!user || user.email !== 'alicanimir1@gmail.com') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">GDPR Compliance Registry</h1>
            <p className="text-muted-foreground text-sm">
              Records of Processing Activities (Art. 30) · Sub-Processor Registry (Art. 28) · Retention Schedule
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Data Controller: Eclipse (alicanimir1@gmail.com)
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Globe className="h-3 w-3 mr-1" />
            Jurisdiction: UK / EU (GDPR + UK GDPR + PECR)
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Last Reviewed: {format(new Date(), 'dd MMM yyyy')}
          </Badge>
        </div>

        <Tabs defaultValue="ropa">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="ropa">ROPA</TabsTrigger>
            <TabsTrigger value="processors">Sub-Processors</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
            <TabsTrigger value="consent-log">Consent Log</TabsTrigger>
          </TabsList>

          {/* ─── Tab 1: ROPA ─── */}
          <TabsContent value="ropa" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Records of Processing Activities
                </CardTitle>
                <CardDescription>
                  Required under GDPR Article 30. Documents every processing activity, its legal basis, and data flows.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Processing Activity</TableHead>
                        <TableHead className="min-w-[150px]">Purpose</TableHead>
                        <TableHead className="min-w-[180px]">Legal Basis</TableHead>
                        <TableHead className="min-w-[180px]">Data Categories</TableHead>
                        <TableHead className="min-w-[100px]">Data Subjects</TableHead>
                        <TableHead className="min-w-[150px]">Recipients</TableHead>
                        <TableHead className="min-w-[150px]">Retention</TableHead>
                        <TableHead className="min-w-[150px]">Int'l Transfers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PROCESSING_ACTIVITIES.map((activity, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{activity.activity}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{activity.purpose}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs whitespace-nowrap">
                              {activity.legalBasis}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{activity.dataCategories}</TableCell>
                          <TableCell className="text-sm">{activity.dataSubjects}</TableCell>
                          <TableCell className="text-sm">{activity.recipients}</TableCell>
                          <TableCell className="text-sm">{activity.retention}</TableCell>
                          <TableCell className="text-sm">{activity.transfers}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Tab 2: Sub-Processors ─── */}
          <TabsContent value="processors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Sub-Processor Registry
                </CardTitle>
                <CardDescription>
                  Required under GDPR Article 28. All third-party processors with access to personal data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Processor</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Data Processed</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Transfer Mechanism</TableHead>
                        <TableHead>DPA Link</TableHead>
                        <TableHead>Last Reviewed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SUB_PROCESSORS.map((proc, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{proc.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{proc.purpose}</TableCell>
                          <TableCell className="text-sm">{proc.dataProcessed}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{proc.location}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{proc.transferMechanism}</TableCell>
                          <TableCell>
                            <a
                              href={proc.dpaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline text-xs"
                            >
                              View DPA
                            </a>
                          </TableCell>
                          <TableCell className="text-sm">{proc.lastReviewed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Tab 3: Retention Schedule ─── */}
          <TabsContent value="retention" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Data Retention Schedule
                </CardTitle>
                <CardDescription>
                  GDPR principle of storage limitation (Art. 5(1)(e)). Data must not be kept longer than necessary.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Type</TableHead>
                      <TableHead>Retention Period</TableHead>
                      <TableHead>Deletion Method</TableHead>
                      <TableHead>Legal Basis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RETENTION_SCHEDULE.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{item.dataType}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{item.retention}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.method}</TableCell>
                        <TableCell className="text-sm">{item.legal}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Tab 4: Consent Records (Live from DB) ─── */}
          <TabsContent value="consent-log" className="space-y-4">
            <ConsentRecordsTab search={consentSearch} onSearchChange={setConsentSearch} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function ConsentRecordsTab({ search, onSearchChange }: { search: string; onSearchChange: (v: string) => void }) {
  const { data: records, isLoading } = useQuery({
    queryKey: ['consent-records', search],
    queryFn: async () => {
      let query = supabase
        .from('consent_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (search) {
        query = query.or(`visitor_id.ilike.%${search}%,action.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Consent Records
        </CardTitle>
        <CardDescription>
          Live proof-of-consent log from the database (GDPR Art. 7 — Conditions for consent).
          Each record captures the visitor's consent decision with timestamp and version.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search by visitor ID or action..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !records?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No consent records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Visitor ID</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Preferences</TableHead>
                  <TableHead>User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(record.created_at), 'dd MMM yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-xs">
                      {record.visitor_id?.slice(0, 12)}...
                    </TableCell>
                    <TableCell className="text-sm font-mono text-xs">
                      {record.user_id ? `${record.user_id.slice(0, 8)}...` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={record.action === 'granted' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {record.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{record.consent_version}</TableCell>
                    <TableCell className="text-xs font-mono max-w-[200px] truncate">
                      {JSON.stringify(record.preferences)}
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate text-muted-foreground">
                      {record.user_agent || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
