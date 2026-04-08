import { useEffect, useState } from "react";

/**
 * ⚡ Bolt Optimization:
 * A custom hook to debounce a value, delaying its update until after a specified
 * delay has passed without further changes.
 * This is primarily used to reduce the number of API calls during rapid state
 * updates (e.g., typing in a search bar).
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
