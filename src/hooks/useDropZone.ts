import { useState, useCallback, DragEvent } from 'react';

interface UseDropZoneOptions {
  onDrop: (files: File[]) => void;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
}

interface UseDropZoneReturn {
  isDragOver: boolean;
  dragProps: {
    onDragEnter: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
}

export function useDropZone({
  onDrop,
  accept,
  maxSize,
  maxFiles = 1,
  disabled = false,
}: UseDropZoneOptions): UseDropZoneReturn {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const validateFile = useCallback((file: File): boolean => {
    // Check file type if accept is specified
    if (accept && accept.length > 0) {
      const fileType = file.type;
      const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;
      
      const isAccepted = accept.some(type => {
        if (type.startsWith('.')) {
          // Extension check
          return fileExt === type.toLowerCase();
        } else if (type.endsWith('/*')) {
          // Mime type wildcard (e.g., image/*)
          return fileType.startsWith(type.replace('/*', '/'));
        } else {
          // Exact mime type
          return fileType === type;
        }
      });

      if (!isAccepted) return false;
    }

    // Check file size if maxSize is specified
    if (maxSize && file.size > maxSize) {
      return false;
    }

    return true;
  }, [accept, maxSize]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    // Set the drop effect
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, [disabled]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);
    
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    
    if (droppedFiles.length === 0) return;

    // Filter valid files
    const validFiles = droppedFiles.filter(validateFile);
    
    // Limit number of files
    const filesToProcess = validFiles.slice(0, maxFiles);

    if (filesToProcess.length > 0) {
      onDrop(filesToProcess);
    }
  }, [disabled, validateFile, maxFiles, onDrop]);

  return {
    isDragOver,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
