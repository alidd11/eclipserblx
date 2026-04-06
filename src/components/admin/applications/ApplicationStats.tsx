interface ApplicationStatsProps {
  total: number;
  pending: number;
  reviewing: number;
  accepted: number;
  rejected: number;
}

export function ApplicationStats({ total, pending, reviewing, accepted, rejected }: ApplicationStatsProps) {
  const items = [
    { label: 'Total', value: total, className: '' },
    { label: 'Pending', value: pending, className: 'text-yellow-400' },
    { label: 'Reviewing', value: reviewing, className: 'text-blue-400' },
    { label: 'Accepted', value: accepted, className: 'text-green-400' },
    { label: 'Rejected', value: rejected, className: 'text-red-400' },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible">
      {items.map((item) => (
        <div key={item.label} className="border border-border rounded-xl min-w-[120px] flex-shrink-0 md:min-w-0">
          <div className="p-4 text-center">
            <p className={`text-2xl font-bold ${item.className}`}>{item.value}</p>
            <p className="text-sm text-muted-foreground">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
