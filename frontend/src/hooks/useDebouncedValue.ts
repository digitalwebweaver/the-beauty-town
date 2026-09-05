import { useEffect, useState } from 'react';

/**
 * Returns `value`, but delayed by `delayMs` after the last change — so a
 * search box can update on every keystroke while the thing that actually
 * triggers a network request (a query param, a filter) only updates once
 * typing pauses. Used anywhere a search input drives a server-side query
 * against a large list (Services admin/public pages).
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
