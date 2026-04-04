const loadedImages = new Set<string>();

export function markImageLoaded(url: string) {
  loadedImages.add(url);
}

export function isImageLoaded(url: string): boolean {
  return loadedImages.has(url);
}

export function prefetchImage(url: string): Promise<void> {
  if (!url || loadedImages.has(url)) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      loadedImages.add(url);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}
