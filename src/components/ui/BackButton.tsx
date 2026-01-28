import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  showLabel?: boolean;
  label?: string;
  variant?: 'ghost' | 'outline' | 'subtle';
  fallbackPath?: string;
  className?: string;
}

export function BackButton({
  showLabel = false,
  label = 'Back',
  variant = 'ghost',
  fallbackPath,
  className,
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else if (fallbackPath) {
      navigate(fallbackPath);
    } else {
      navigate('/');
    }
  };

  return (
    <Button
      variant={variant === 'subtle' ? 'ghost' : variant}
      size={showLabel ? 'sm' : 'icon'}
      onClick={handleBack}
      className={cn(
        'text-muted-foreground hover:text-foreground',
        variant === 'subtle' && 'hover:bg-transparent',
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {showLabel && <span className="ml-1">{label}</span>}
    </Button>
  );
}
