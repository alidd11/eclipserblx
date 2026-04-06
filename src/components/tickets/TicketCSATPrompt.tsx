import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TicketCSATPromptProps {
  ticketId: string;
  ticketType?: 'customer' | 'seller';
}

export function TicketCSATPrompt({ ticketId, ticketType = 'customer' }: TicketCSATPromptProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');

  const { data: existingRating } = useQuery({
    queryKey: ['ticket-satisfaction', ticketId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ticket_satisfaction')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('ticket_type', ticketType)
        .maybeSingle();
      return data;
    },
    enabled: !!ticketId && !!user,
  });

  const submitRating = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('ticket_satisfaction').insert({
        ticket_id: ticketId,
        ticket_type: ticketType,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Thanks for your feedback!'),
    onError: () => toast.error('Failed to submit rating'),
  });

  if (existingRating) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 px-4 bg-muted/30 rounded-lg">
        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
        <span>You rated this ticket {existingRating.rating}/5</span>
        <div className="flex gap-0.5 ml-1">
          {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} className={cn('h-3.5 w-3.5', s <= existingRating.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30')} />
          ))}
        </div>
      </div>
    );
  }

  if (submitRating.isSuccess) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 px-4 bg-muted/30 rounded-lg">
        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
        Thank you for your feedback!
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-card">
      <p className="text-sm font-medium">How was your support experience?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHoveredStar(s)}
            onMouseLeave={() => setHoveredStar(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star className={cn(
              'h-6 w-6 transition-colors',
              s <= (hoveredStar || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
            )} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Any additional feedback? (optional)"
            className="min-h-[60px] resize-none text-sm"
          />
          <Button
            size="sm"
            onClick={() => submitRating.mutate()}
            disabled={submitRating.isPending}
            className="gradient-button"
          >
            Submit Feedback
          </Button>
        </>
      )}
    </div>
  );
}
