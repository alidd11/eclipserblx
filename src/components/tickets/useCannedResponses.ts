import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CannedResponse {
  id: string;
  title: string;
  body: string;
  category: string | null;
}

// Hardcoded fallbacks used when DB has no entries yet
const FALLBACK_RESPONSES: CannedResponse[] = [
  { id: 'f1', title: 'Greeting', body: "Hi there! Thanks for reaching out. I'd be happy to help you with this.", category: 'general' },
  { id: 'f2', title: 'Need more info', body: 'Thanks for your message. Could you please provide more details about the issue so we can assist you better?', category: 'general' },
  { id: 'f3', title: 'Order lookup', body: "I'm looking into your order now. Please give me a moment to review the details.", category: 'general' },
  { id: 'f4', title: 'Issue resolved', body: 'Great news! The issue has been resolved. Please let us know if you need anything else.', category: 'general' },
  { id: 'f5', title: 'Refund processing', body: 'Your refund has been initiated. It typically takes 5-10 business days to appear in your account.', category: 'general' },
  { id: 'f6', title: 'Escalating', body: "I'm escalating this to our senior support team for further investigation. You'll receive an update shortly.", category: 'general' },
  { id: 'f7', title: 'Follow up', body: "Just checking in \u2014 were you able to resolve the issue? Let us know if you still need help!", category: 'general' },
];

export function useCannedResponses() {
  const { data, isLoading } = useQuery({
    queryKey: ['canned-responses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canned_responses')
        .select('id, title, body, category')
        .order('title');
      if (error) throw error;
      return data as CannedResponse[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const responses = data && data.length > 0 ? data : FALLBACK_RESPONSES;

  return { responses, isLoading };
}
