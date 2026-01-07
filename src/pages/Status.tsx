import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Database, 
  Shield, 
  HardDrive, 
  Globe, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Clock,
  Loader2,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface Incident {
  id: string;
  title: string;
  description: string | null;
  status: string;
  severity: string;
  affected_services: string[] | null;
  started_at: string;
  resolved_at: string | null;
  created_at: string;
  incident_updates?: IncidentUpdate[];
}

interface IncidentUpdate {
  id: string;
  incident_id: string;
  message: string;
  status: string;
  created_at: string;
}

type StatusLevel = 'operational' | 'degraded' | 'outage' | 'checking';

interface ServiceStatus {
  name: string;
  status: StatusLevel;
  latency?: number;
  lastChecked: Date;
  description: string;
  icon: React.ReactNode;
}

const statusConfig = {
  operational: { 
    label: 'Operational', 
    color: 'text-green-500', 
    bg: 'bg-green-500/10', 
    border: 'border-green-500/30',
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />
  },
  degraded: { 
    label: 'Degraded', 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-500/10', 
    border: 'border-yellow-500/30',
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />
  },
  outage: { 
    label: 'Outage', 
    color: 'text-red-500', 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/30',
    icon: <XCircle className="h-5 w-5 text-red-500" />
  },
  checking: { 
    label: 'Checking...', 
    color: 'text-muted-foreground', 
    bg: 'bg-muted/50', 
    border: 'border-border',
    icon: <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
  },
};

const incidentStatusConfig = {
  investigating: { label: 'Investigating', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  identified: { label: 'Identified', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  monitoring: { label: 'Monitoring', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  resolved: { label: 'Resolved', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
};

const severityConfig = {
  minor: { label: 'Minor', color: 'text-yellow-500' },
  major: { label: 'Major', color: 'text-orange-500' },
  critical: { label: 'Critical', color: 'text-red-500' },
};

export default function Status() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overallStatus, setOverallStatus] = useState<StatusLevel>('checking');
  const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set());

  // Fetch incidents
  const { data: incidents, isLoading: incidentsLoading, refetch: refetchIncidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*, incident_updates(*)')
        .order('started_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Incident[];
    },
  });

  const toggleIncident = (id: string) => {
    setExpandedIncidents(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const checkServices = async () => {
    setIsRefreshing(true);
    const results: ServiceStatus[] = [];
    const now = new Date();

    // Check Database
    try {
      const start = Date.now();
      const { error } = await supabase.from('categories').select('id').limit(1);
      const latency = Date.now() - start;
      
      results.push({
        name: 'Database',
        status: error ? 'outage' : latency > 2000 ? 'degraded' : 'operational',
        latency,
        lastChecked: now,
        description: 'Primary database for storing all application data',
        icon: <Database className="h-5 w-5" />
      });
    } catch {
      results.push({
        name: 'Database',
        status: 'outage',
        lastChecked: now,
        description: 'Primary database for storing all application data',
        icon: <Database className="h-5 w-5" />
      });
    }

    // Check Authentication
    try {
      const start = Date.now();
      const { error } = await supabase.auth.getSession();
      const latency = Date.now() - start;
      
      results.push({
        name: 'Authentication',
        status: error ? 'outage' : latency > 2000 ? 'degraded' : 'operational',
        latency,
        lastChecked: now,
        description: 'User authentication and session management',
        icon: <Shield className="h-5 w-5" />
      });
    } catch {
      results.push({
        name: 'Authentication',
        status: 'outage',
        lastChecked: now,
        description: 'User authentication and session management',
        icon: <Shield className="h-5 w-5" />
      });
    }

    // Check Storage
    try {
      const start = Date.now();
      const { error } = await supabase.storage.from('product-images').list('', { limit: 1 });
      const latency = Date.now() - start;
      
      results.push({
        name: 'File Storage',
        status: error ? 'outage' : latency > 3000 ? 'degraded' : 'operational',
        latency,
        lastChecked: now,
        description: 'Media and file storage for products and uploads',
        icon: <HardDrive className="h-5 w-5" />
      });
    } catch {
      results.push({
        name: 'File Storage',
        status: 'outage',
        lastChecked: now,
        description: 'Media and file storage for products and uploads',
        icon: <HardDrive className="h-5 w-5" />
      });
    }

    // Check API/Edge Functions (via a simple products query)
    try {
      const start = Date.now();
      const { error } = await supabase.from('products').select('id').limit(1);
      const latency = Date.now() - start;
      
      results.push({
        name: 'API Services',
        status: error ? 'outage' : latency > 2000 ? 'degraded' : 'operational',
        latency,
        lastChecked: now,
        description: 'REST API and serverless functions',
        icon: <Globe className="h-5 w-5" />
      });
    } catch {
      results.push({
        name: 'API Services',
        status: 'outage',
        lastChecked: now,
        description: 'REST API and serverless functions',
        icon: <Globe className="h-5 w-5" />
      });
    }

    setServices(results);

    // Calculate overall status
    const hasOutage = results.some(s => s.status === 'outage');
    const hasDegraded = results.some(s => s.status === 'degraded');
    setOverallStatus(hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational');
    
    setIsRefreshing(false);
  };

  useEffect(() => {
    checkServices();
    const interval = setInterval(checkServices, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const formatLatency = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 100) return `${ms}ms (Excellent)`;
    if (ms < 500) return `${ms}ms (Good)`;
    if (ms < 1000) return `${ms}ms (Fair)`;
    if (ms < 2000) return `${ms}ms (Slow)`;
    return `${ms}ms (Very Slow)`;
  };

  const handleRefresh = async () => {
    await checkServices();
    refetchIncidents();
  };

  // Separate active and past incidents
  const activeIncidents = incidents?.filter(i => i.status !== 'resolved') || [];
  const pastIncidents = incidents?.filter(i => i.status === 'resolved') || [];

  return (
    <MainLayout>
      <div className="container py-8 space-y-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">System Status</h1>
            <p className="text-muted-foreground mt-1">
              Real-time health monitoring of all services
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Overall Status Banner */}
        <Card className={cn(
          'border-2',
          statusConfig[overallStatus].border,
          statusConfig[overallStatus].bg
        )}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {statusConfig[overallStatus].icon}
                <div>
                  <h2 className="text-xl font-semibold">
                    {overallStatus === 'operational' && 'All Systems Operational'}
                    {overallStatus === 'degraded' && 'Degraded Performance'}
                    {overallStatus === 'outage' && 'Service Disruption'}
                    {overallStatus === 'checking' && 'Checking Status...'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Last updated: {services[0]?.lastChecked.toLocaleTimeString() || 'Checking...'}
                  </p>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  'text-sm px-3 py-1',
                  statusConfig[overallStatus].color,
                  statusConfig[overallStatus].border
                )}
              >
                {statusConfig[overallStatus].label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Service Cards */}
        <div className="grid gap-4">
          {services.map((service) => (
            <Card 
              key={service.name} 
              className={cn(
                'transition-all',
                statusConfig[service.status].border
              )}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'p-2 rounded-lg',
                      statusConfig[service.status].bg
                    )}>
                      <span className={statusConfig[service.status].color}>
                        {service.icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        statusConfig[service.status].color,
                        statusConfig[service.status].border
                      )}
                    >
                      {statusConfig[service.status].label}
                    </Badge>
                    {service.latency !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {formatLatency(service.latency)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Incidents */}
        {activeIncidents.length > 0 && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                Active Incidents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeIncidents.map((incident) => {
                const statusConf = incidentStatusConfig[incident.status as keyof typeof incidentStatusConfig] || incidentStatusConfig.investigating;
                const sevConf = severityConfig[incident.severity as keyof typeof severityConfig] || severityConfig.minor;
                const isExpanded = expandedIncidents.has(incident.id);
                const updates = incident.incident_updates?.sort((a, b) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ) || [];

                return (
                  <div key={incident.id} className="rounded-lg border border-red-500/20 bg-background p-4">
                    <div 
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => toggleIncident(incident.id)}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{incident.title}</h3>
                          <Badge variant="outline" className={cn(statusConf.color, statusConf.border)}>
                            {statusConf.label}
                          </Badge>
                          <Badge variant="outline" className={cn(sevConf.color, 'border-current/30')}>
                            {sevConf.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Started {formatDistanceToNow(new Date(incident.started_at), { addSuffix: true })}
                        </p>
                        {incident.affected_services && incident.affected_services.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-2">
                            {incident.affected_services.map(service => (
                              <Badge key={service} variant="secondary" className="text-xs">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        {incident.description && (
                          <p className="text-sm text-muted-foreground">{incident.description}</p>
                        )}
                        {updates.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Updates</p>
                            {updates.map((update) => {
                              const updateStatus = incidentStatusConfig[update.status as keyof typeof incidentStatusConfig] || incidentStatusConfig.investigating;
                              return (
                                <div key={update.id} className="flex gap-3 text-sm">
                                  <div className="text-xs text-muted-foreground shrink-0 w-24">
                                    {format(new Date(update.created_at), 'MMM d, HH:mm')}
                                  </div>
                                  <div className="flex-1">
                                    <span className={cn('font-medium', updateStatus.color)}>{updateStatus.label}:</span>{' '}
                                    {update.message}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Incident History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Incident History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incidentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pastIncidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500/50" />
                <p className="font-medium">No past incidents</p>
                <p className="text-sm">All systems have been running smoothly!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastIncidents.map((incident) => {
                  const sevConf = severityConfig[incident.severity as keyof typeof severityConfig] || severityConfig.minor;
                  const isExpanded = expandedIncidents.has(incident.id);
                  const updates = incident.incident_updates?.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  ) || [];
                  const duration = incident.resolved_at 
                    ? Math.round((new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime()) / 60000)
                    : null;

                  return (
                    <div 
                      key={incident.id} 
                      className="rounded-lg border border-border bg-muted/30 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div 
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => toggleIncident(incident.id)}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <h3 className="font-medium">{incident.title}</h3>
                            <Badge variant="outline" className={cn(sevConf.color, 'border-current/30')}>
                              {sevConf.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{format(new Date(incident.started_at), 'MMM d, yyyy')}</span>
                            {duration !== null && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {duration < 60 ? `${duration}m` : `${Math.round(duration / 60)}h ${duration % 60}m`} to resolve
                              </span>
                            )}
                          </div>
                          {incident.affected_services && incident.affected_services.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-2">
                              {incident.affected_services.map(service => (
                                <Badge key={service} variant="secondary" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="shrink-0">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border space-y-3">
                          {incident.description && (
                            <p className="text-sm text-muted-foreground">{incident.description}</p>
                          )}
                          {updates.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase">Timeline</p>
                              {updates.map((update) => {
                                const updateStatus = incidentStatusConfig[update.status as keyof typeof incidentStatusConfig] || incidentStatusConfig.investigating;
                                return (
                                  <div key={update.id} className="flex gap-3 text-sm">
                                    <div className="text-xs text-muted-foreground shrink-0 w-24">
                                      {format(new Date(update.created_at), 'MMM d, HH:mm')}
                                    </div>
                                    <div className="flex-1">
                                      <span className={cn('font-medium', updateStatus.color)}>{updateStatus.label}:</span>{' '}
                                      {update.message}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Status Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  <span className="font-medium text-green-500">Operational</span>
                  {' - '}
                  <span className="text-muted-foreground">Working normally</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">
                  <span className="font-medium text-yellow-500">Degraded</span>
                  {' - '}
                  <span className="text-muted-foreground">Slower than usual</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">
                  <span className="font-medium text-red-500">Outage</span>
                  {' - '}
                  <span className="text-muted-foreground">Service unavailable</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Time Thresholds */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Response Time Thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-green-500 font-medium">&lt; 100ms</span>
                <p className="text-muted-foreground">Excellent</p>
              </div>
              <div>
                <span className="text-green-400 font-medium">100-500ms</span>
                <p className="text-muted-foreground">Good</p>
              </div>
              <div>
                <span className="text-yellow-500 font-medium">500ms-1s</span>
                <p className="text-muted-foreground">Fair</p>
              </div>
              <div>
                <span className="text-orange-500 font-medium">1-2s</span>
                <p className="text-muted-foreground">Slow</p>
              </div>
              <div>
                <span className="text-red-500 font-medium">&gt; 2s</span>
                <p className="text-muted-foreground">Very Slow</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
