import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface RobuxAdPayButtonProps {
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl?: string;
  discordUsername?: string;
  onSuccess?: () => void;
  className?: string;
  disabled?: boolean;
}

export function RobuxAdPayButton({ 
  title, 
  description, 
  imageUrl, 
  linkUrl, 
  discordUsername,
  onSuccess,
  className,
  disabled,
}: RobuxAdPayButtonProps) {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!session?.access_token) {
      toast.error('Please sign in first');
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in the title and description first');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-robux-ad-pending', {
        body: { 
          title, 
          description, 
          imageUrl, 
          linkUrl, 
          discordUsername,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Open Roblox game
      window.open(data.roblox_game_url, '_blank', 'noopener,noreferrer');
      
      toast.success('Opening Roblox... Purchase the gamepass to complete your ad!', {
        description: `Price: ${data.robux_price} Robux`,
        duration: 8000,
      });

      onSuccess?.();
    } catch (error) {
      console.error('Robux ad error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create advertisement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="lg"
      className={`flex-1 h-14 text-lg bg-gradient-to-r from-[#00A67D] to-[#00D9A5] hover:from-[#00B88A] hover:to-[#00E6B0] text-white border-0 ${className}`}
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
      ) : (
        <svg
          className="h-5 w-5 mr-2"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5.164 0L0 18.627 18.836 24 24 5.373 5.164 0zm10.291 14.273l-5.728-1.545 1.545-5.728 5.728 1.545-1.545 5.728z" />
        </svg>
      )}
      Pay with Robux
    </Button>
  );
}
