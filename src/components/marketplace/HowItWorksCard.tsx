import { Store, Upload, DollarSign, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
  {
    icon: Store,
    title: 'Apply',
    description: 'Submit your seller application',
  },
  {
    icon: Upload,
    title: 'List',
    description: 'Upload your products',
  },
  {
    icon: DollarSign,
    title: 'Earn',
    description: 'Get paid for every sale',
  },
];

export function HowItWorksCard() {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardContent className="p-6">
        <h3 className="font-semibold text-lg mb-4 text-center">How It Works</h3>
        
        <div className="flex flex-col items-center space-y-2">
          {steps.map((step, index) => (
            <div key={step.title} className="w-full">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-lg bg-primary/10">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                  {index + 1}
                </span>
              </div>
              
              {index < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ChevronDown className="h-5 w-5 text-muted-foreground animate-bounce" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
