import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Syncs a piece of state to a URL search parameter.
 * Makes filters, tabs, search queries, and pagination
 * fully bookmarkable and shareable — like a traditional website.
 *
 * @example
 * const [search, setSearch] = useURLState('q', '');
 * const [page, setPage] = useURLState('page', '1');
 * const [tab, setTab] = useURLState('tab', 'all');
 */
export function useURLState(
  key: string,
  defaultValue: string = ''
): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(
    () => searchParams.get(key) ?? defaultValue,
    [searchParams, key, defaultValue]
  );

  const setValue = useCallback(
    (newValue: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newValue === defaultValue || newValue === '') {
            next.delete(key);
          } else {
            next.set(key, newValue);
          }
          return next;
        },
        { replace: true }
      );
    },
    [key, defaultValue, setSearchParams]
  );

  return [value, setValue];
}

/**
 * Syncs multiple URL params at once.
 * Useful for filter panels with several controls.
 *
 * @example
 * const [params, setParams] = useURLParams({ sort: 'newest', category: '' });
 */
export function useURLParams<T extends Record<string, string>>(
  defaults: T
): [T, (updates: Partial<T>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const param = searchParams.get(key);
      if (param !== null) {
        (result as any)[key] = param;
      }
    }
    return result;
  }, [searchParams, defaults]);

  const setValues = useCallback(
    (updates: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, val] of Object.entries(updates)) {
            if (val === defaults[key] || val === '' || val === undefined) {
              next.delete(key);
            } else {
              next.set(key, val as string);
            }
          }
          return next;
        },
        { replace: true }
      );
    },
    [defaults, setSearchParams]
  );

  return [values, setValues];
}
