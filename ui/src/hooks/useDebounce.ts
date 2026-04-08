import { useEffect, useState } from "react";

// ⚡ Bolt Optimization:
// Provides a standard mechanism to debounce rapidly changing values (like text input).
// When applied to API search terms, it ensures we wait until the user pauses typing
// before executing expensive network or database calls.
export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay ?? 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
