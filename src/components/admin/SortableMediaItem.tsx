import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical } from 'lucide-react';
import { VideoThumbnail } from '@/components/ui/VideoThumbnail';

interface SortableMediaItemProps {
  id: string;
  url: string;
  index: number;
  onRemove: (index: number) => void;
}

const isVideo = (url: string) => {
  return /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);
};

export function SortableMediaItem({ id, url, index, onRemove }: SortableMediaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted"
    >
      {isVideo(url) ? (
        <VideoThumbnail src={url} showPlayIcon={true} />
      ) : (
        <img src={url} alt="" className="w-full h-full object-cover" />
      )}
      
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0 left-0 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-br"
      >
        <GripVertical className="h-3 w-3 text-white" />
      </div>
      
      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-0 right-0 p-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-bl"
      >
        <X className="h-3 w-3 text-white" />
      </button>
      
      {/* Index badge */}
      <div className="absolute bottom-0 left-0 px-1.5 py-0.5 bg-black/60 text-[10px] text-white rounded-tr">
        {index + 1}
      </div>
    </div>
  );
}
