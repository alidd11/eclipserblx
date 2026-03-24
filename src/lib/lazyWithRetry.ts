import { lazy, ComponentType } from 'react';
import { isChunkError } from './chunkRecovery';

type ModuleDefault<T> = { default: T };

/**
 * Wraps React.lazy with automatic retry logic for failed chunk imports.
 * On failure, waits with exponential backoff and retries up to `maxRetries` times.
 * Only retries on chunk/module load errors — other errors are re-thrown immediately.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<ModuleDefault<T>>,
  maxRetries = 3,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await importFn();
      } catch (error) {
        const isLast = attempt === maxRetries;
        const isChunk = error instanceof Error && isChunkError(error);

        // Non-chunk errors should not be retried
        if (!isChunk || isLast) throw error;

        console.warn(
          `[lazyWithRetry] Chunk load failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`,
          (error as Error).message?.slice(0, 120),
        );

        // Exponential backoff: 1s, 2s, 3s
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    // TypeScript: unreachable, but satisfy the compiler
    return importFn();
  });
}
