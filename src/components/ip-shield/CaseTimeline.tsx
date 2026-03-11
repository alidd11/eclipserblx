import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';

export function CaseTimeline({ caseData }: { caseData: any }) {
  const steps = [
    { key: 'submitted', label: 'Submitted', date: caseData.created_at },
    { key: 'notice_sent', label: 'Notice Sent', date: caseData.dmca_sent_at || caseData.notice_sent_at },
    { key: 'reviewing', label: 'Under Review', date: caseData.status === 'reviewing' ? caseData.updated_at : null },
    { key: 'resolved', label: 'Resolved', date: caseData.resolved_at },
  ];
  
  const currentIdx = steps.findIndex(s => s.key === caseData.status);
  const progressPct = caseData.status === 'resolved' ? 100 : caseData.status === 'rejected' ? 100 : Math.max(((currentIdx + 1) / steps.length) * 100, 25);

  return (
    <div className="space-y-2">
      <Progress value={progressPct} className="h-1.5" />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {steps.map((step, i) => (
          <div key={step.key} className={`text-center ${i <= currentIdx ? 'text-primary font-medium' : ''}`}>
            <div>{step.label}</div>
            {step.date && <div>{format(new Date(step.date), 'MMM d')}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
