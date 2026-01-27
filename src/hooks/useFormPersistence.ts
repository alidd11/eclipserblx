import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to persist form data in sessionStorage.
 * Data survives app backgrounding but is cleared when the browser/app is fully closed.
 * 
 * @param key Unique key for this form (e.g., 'community-announcement-form')
 * @param initialValues Default values for the form
 * @returns [values, setValues, clearValues, isDirty]
 */
export function useFormPersistence<T extends Record<string, any>>(
  key: string,
  initialValues: T
): [T, (updates: Partial<T> | ((prev: T) => T)) => void, () => void, boolean] {
  const storageKey = `form-draft-${key}`;
  const initialRef = useRef(initialValues);
  const [isDirty, setIsDirty] = useState(false);

  // Initialize state from sessionStorage or use initial values
  const [values, setValuesInternal] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with initial values to handle new fields
        return { ...initialValues, ...parsed };
      }
    } catch (e) {
      console.warn('[FormPersistence] Failed to load stored values:', e);
    }
    return initialValues;
  });

  // Save to sessionStorage whenever values change
  useEffect(() => {
    try {
      // Check if values differ from initial
      const hasChanges = Object.keys(values).some(
        (k) => values[k] !== initialRef.current[k]
      );
      setIsDirty(hasChanges);

      if (hasChanges) {
        sessionStorage.setItem(storageKey, JSON.stringify(values));
      } else {
        // Clear if back to initial state
        sessionStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn('[FormPersistence] Failed to save values:', e);
    }
  }, [values, storageKey]);

  // Update function that accepts partial updates or updater function
  const setValues = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setValuesInternal((prev) => {
      if (typeof updates === 'function') {
        return updates(prev);
      }
      return { ...prev, ...updates };
    });
  }, []);

  // Clear stored values and reset to initial
  const clearValues = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('[FormPersistence] Failed to clear values:', e);
    }
    setValuesInternal(initialRef.current);
    setIsDirty(false);
  }, [storageKey]);

  return [values, setValues, clearValues, isDirty];
}

/**
 * Simpler hook for persisting a single value
 */
export function useValuePersistence<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void, () => void] {
  const storageKey = `value-draft-${key}`;

  const [value, setValueInternal] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[ValuePersistence] Failed to load stored value:', e);
    }
    return initialValue;
  });

  useEffect(() => {
    try {
      if (value !== initialValue) {
        sessionStorage.setItem(storageKey, JSON.stringify(value));
      } else {
        sessionStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn('[ValuePersistence] Failed to save value:', e);
    }
  }, [value, initialValue, storageKey]);

  const setValue = useCallback((newValue: T) => {
    setValueInternal(newValue);
  }, []);

  const clearValue = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('[ValuePersistence] Failed to clear value:', e);
    }
    setValueInternal(initialValue);
  }, [storageKey, initialValue]);

  return [value, setValue, clearValue];
}
