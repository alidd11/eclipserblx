import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, Clock, Mail, Store, PartyPopper, ArrowRight,
} from 'lucide-react';

export function ApplicationSubmittedView() {
  return (
    <div className="text-center space-y-8 py-8">
      <div className="space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <PartyPopper className="h-8 w-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold">Application Submitted!</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          We're reviewing your application. Here's what happens next:
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-0">
        {[
          { step: 'Application Received', desc: 'Your application is in our queue', done: true, icon: CheckCircle2 },
          { step: 'Under Review', desc: 'Our team reviews within 24-48 hours', done: false, icon: Clock },
          { step: 'Decision', desc: "You'll receive a notification", done: false, icon: Mail },
          { step: 'Store Setup', desc: 'Customize your store, import products, and start listing', done: false, icon: Store },
        ].map((item, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center', item.done ? 'bg-green-500/10' : 'bg-muted')}>
                <item.icon className={cn('h-4 w-4', item.done ? 'text-green-500' : 'text-muted-foreground')} />
              </div>
              {i < 3 && <div className="w-px h-8 bg-border" />}
            </div>
            <div className="pb-8 text-left">
              <p className={cn('text-sm font-medium', item.done && 'text-green-600 dark:text-green-400')}>{item.step}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild variant="outline">
          <Link to="/account">Back to Account</Link>
        </Button>
        <Button asChild>
          <Link to="/">
            Browse Marketplace
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function PendingApplicationView({ application }: { application: { store_name?: string; created_at?: string } }) {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
        <Clock className="h-8 w-8 text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold">Application Under Review</h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        Your application for <strong>{application?.store_name}</strong> is being reviewed.
        We typically respond within 24-48 hours.
      </p>
      <p className="text-xs text-muted-foreground">
        Submitted {application?.created_at ? new Date(application.created_at).toLocaleDateString() : ''}
      </p>
      <Button asChild variant="outline">
        <Link to="/account">Back to Account</Link>
      </Button>
    </div>
  );
}

export function SuccessRedirect() {
  return (
    <div className="text-center space-y-4 py-8">
      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
      <h1 className="text-2xl font-bold">You're already a seller!</h1>
      <Button asChild>
        <a href="/seller" target="_blank" rel="noopener noreferrer">Go to Seller Dashboard</a>
      </Button>
    </div>
  );
}
