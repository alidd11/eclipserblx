import { Button } from '@/components/ui/button';
import { Heart, HeartOff, Loader2 } from 'lucide-react';
import { useStoreFollow } from '@/hooks/useStoreFollow';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  storeId: string;
  accentColor?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showText?: boolean;
}

export const FollowButton = ({
  storeId,
  accentColor,
  variant = 'outline',
  size = 'default',
  className,
  showText = true,
}: FollowButtonProps) => {
  const { isFollowing, isLoading, toggleFollow, isToggling } = useStoreFollow(storeId);

  if (isLoading) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? 'default' : variant}
      size={size}
      onClick={toggleFollow}
      disabled={isToggling}
      className={cn(className)}
      style={isFollowing && accentColor ? { backgroundColor: accentColor } : undefined}
    >
      {isToggling ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <Heart className="h-4 w-4 fill-current" />
          {showText && <span className="ml-1.5">Following</span>}
        </>
      ) : (
        <>
          <Heart className="h-4 w-4" />
          {showText && <span className="ml-1.5">Follow</span>}
        </>
      )}
    </Button>
  );
};
