import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface WishlistButtonProps {
  productId: string;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function WishlistButton({ 
  productId, 
  variant = 'icon',
  size = 'default',
  className 
}: WishlistButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist, isToggling } = useWishlist(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Sign in to save products');
      navigate('/auth');
      return;
    }
    
    toggleWishlist();
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isToggling}
        className={cn(
          "p-2 rounded-full transition-all duration-200",
          "hover:scale-110 active:scale-95",
          isInWishlist 
            ? "bg-red-500/20 text-red-500" 
            : "bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground",
          "backdrop-blur-sm",
          className
        )}
        aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart 
          className={cn(
            "h-5 w-5 transition-all",
            isInWishlist && "fill-current"
          )} 
        />
      </button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isToggling}
      variant={isInWishlist ? "secondary" : "outline"}
      size={size}
      className={cn(
        "gap-2",
        isInWishlist && "text-red-500",
        className
      )}
    >
      <Heart className={cn("h-4 w-4", isInWishlist && "fill-current")} />
      {isInWishlist ? 'Saved' : 'Save'}
    </Button>
  );
}
