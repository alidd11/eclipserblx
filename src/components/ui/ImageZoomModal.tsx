import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageZoomModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageZoomModal({ src, alt, isOpen, onClose }: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;

  useEffect(() => {
    if (!isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, MAX_SCALE));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, MIN_SCALE);
      if (newScale === MIN_SCALE) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale(prev => {
      const newScale = Math.max(MIN_SCALE, Math.min(prev + delta, MAX_SCALE));
      if (newScale === MIN_SCALE) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (distance - lastTouchDistance.current) * 0.01;
      lastTouchDistance.current = distance;
      
      setScale(prev => {
        const newScale = Math.max(MIN_SCALE, Math.min(prev + delta, MAX_SCALE));
        if (newScale === MIN_SCALE) {
          setPosition({ x: 0, y: 0 });
        }
        return newScale;
      });
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    lastTouchDistance.current = null;
    setIsDragging(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (scale > 1) {
      handleReset();
    } else {
      setScale(2.5);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={scale <= MIN_SCALE}
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="text-white text-sm font-medium min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={scale >= MAX_SCALE}
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            disabled={scale === 1 && position.x === 0 && position.y === 0}
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-white/60 text-xs text-center pointer-events-none">
          <span className="hidden md:inline">Scroll to zoom • Drag to pan • Double-click to reset</span>
          <span className="md:hidden">Pinch to zoom • Drag to pan • Double-tap to reset</span>
        </div>

        {/* Image container */}
        <div
          ref={containerRef}
          className={cn(
            "w-full h-full flex items-center justify-center overflow-hidden",
            scale > 1 ? "cursor-grab" : "cursor-zoom-in",
            isDragging && "cursor-grabbing"
          )}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain select-none transition-transform duration-100"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            }}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
