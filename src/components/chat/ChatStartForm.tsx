import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, HelpCircle, Ticket } from 'lucide-react';

const ISSUE_CATEGORIES = [
  { value: 'order', label: 'Order Issue' },
  { value: 'product', label: 'Product Question' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'other', label: 'Other' },
];

interface ChatStartFormProps {
  customerProfile: { display_name: string | null; customer_id: string | null } | null;
  userEmail?: string;
  issueCategory: string;
  onIssueCategoryChange: (val: string) => void;
  issueDescription: string;
  onIssueDescriptionChange: (val: string) => void;
  onStart: () => void;
  isSending: boolean;
  isOpen: boolean;
  onCloseChat: () => void;
}

export function ChatStartForm({
  customerProfile,
  userEmail,
  issueCategory,
  onIssueCategoryChange,
  issueDescription,
  onIssueDescriptionChange,
  onStart,
  isSending,
  isOpen,
  onCloseChat,
}: ChatStartFormProps) {
  return (
    <div className="flex-1 overflow-auto p-3 space-y-3">
      {/* Customer Info Card */}
      {customerProfile && (
        <div className="bg-muted/50 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
              {(customerProfile.display_name || userEmail)?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {customerProfile.display_name || userEmail?.split('@')[0] || 'Customer'}
              </p>
              {customerProfile.customer_id && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  {customerProfile.customer_id}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="panel-category" className="text-sm">What can we help you with?</Label>
        <Select value={issueCategory} onValueChange={onIssueCategoryChange}>
          <SelectTrigger id="panel-category" className="h-9">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent className="z-[10000]" position="popper" sideOffset={4}>
            {ISSUE_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="panel-description" className="text-sm">Describe your issue</Label>
        <Textarea
          id="panel-description"
          value={issueDescription}
          onChange={(e) => onIssueDescriptionChange(e.target.value)}
          placeholder="Please describe your issue..."
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      <Button
        onClick={onStart}
        disabled={!issueCategory || !issueDescription.trim() || isSending}
        className="w-full"
        size="sm"
      >
        {isSending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Starting...
          </>
        ) : (
          'Start Conversation'
        )}
      </Button>

      {/* Support info links */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {isOpen
              ? 'Human support available now'
              : 'AI support 24/7 · Human hours Mon–Sat 9AM–7PM'}
          </span>
        </div>
        <div className="flex gap-2">
          <Link
            to="/faq"
            onClick={onCloseChat}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-md hover:bg-muted"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>FAQ</span>
          </Link>
          <Link
            to="/support/tickets"
            onClick={onCloseChat}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-md hover:bg-muted"
          >
            <Ticket className="h-3.5 w-3.5" />
            <span>My Tickets</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
