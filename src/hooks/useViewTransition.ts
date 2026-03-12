import { useCallback } from 'react';
import { useNavigate, NavigateOptions, To } from 'react-router-dom';

/**
 * Wraps react-router `navigate` in the View Transitions API when supported.
 * Falls back to a normal navigation on unsupported browsers (Safari, Firefox).
 *
 * Usage:
 *   const navigate = useViewTransitionNavigate();
 *   navigate('/products');
 */
export function useViewTransitionNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      const doc = document as any;
      if (typeof doc.startViewTransition === 'function') {
        doc.startViewTransition(() => {
          if (typeof to === 'number') {
            navigate(to);
          } else {
            navigate(to, options);
          }
        });
      } else {
        if (typeof to === 'number') {
          navigate(to);
        } else {
          navigate(to, options);
        }
      }
    },
    [navigate],
  );
}
