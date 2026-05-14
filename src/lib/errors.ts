/**
 * Normalize unknown error values into displayable strings.
 * Use in catch blocks once `useUnknownInCatchVariables` is enabled.
 */
export const errMsg = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === 'string') return m;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return 'Unknown error';
  }
};

/** Type guard: narrows `unknown` to `Error`. */
export const isError = (e: unknown): e is Error => e instanceof Error;
