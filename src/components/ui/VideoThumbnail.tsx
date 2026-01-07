import { useVideoThumbnail } from '@/hooks/useVideoThumbnail';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoThumbnailProps {
  src: string;
  alt?: string;
  className?: string;
  showPlayIcon?: boolean;
}

export function VideoThumbnail({ src, alt = '', className, showPlayIcon = true }: VideoThumbnailProps) {
  const { thumbnail, isLoading } = useVideoThumbnail(src);

  return (
    <div className={cn("relative w-full h-full bg-muted", className)}>
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center animate-pulse">
          <div className="w-8 h-8 rounded-full bg-muted-foreground/20" />
        </div>
      ) : thumbnail ? (
        <img src={thumbnail} alt={alt} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black/20">
          <span className="text-xs text-muted-foreground">Video</span>
        </div>
      )}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="h-4 w-4 text-white fill-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}
