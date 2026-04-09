import { useEffect, useState, useCallback } from "react";

/**
 * Adaptive polling interval hook.
 *
 * Returns a dynamically adjusted polling interval that:
 * 1. Uses the base interval when the tab is visible and active
 * 2. Slows to 4× the base interval when the tab is hidden (saves CPU/network)
 * 3. Can be further slowed when server reports memory pressure
 *
 * Usage:
 *   const interval = useAdaptiveInterval(5000);
 *   useQuery({ ..., refetchInterval: interval });
 */
export function useAdaptiveInterval(
  baseMs: number,
  opts?: {
    /** Multiplier when tab is hidden. Default: 4 */
    hiddenMultiplier?: number;
    /** Disable adaptive behavior entirely. Default: false */
    disabled?: boolean;
  },
): number | false {
  const hiddenMultiplier = opts?.hiddenMultiplier ?? 4;
  const disabled = opts?.disabled ?? false;

  const [isVisible, setIsVisible] = useState(() =>
    typeof document !== "undefined" ? document.visibilityState === "visible" : true,
  );

  useEffect(() => {
    if (disabled) return;

    const handler = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [disabled]);

  if (disabled) return baseMs;

  return isVisible ? baseMs : baseMs * hiddenMultiplier;
}

/**
 * Returns false when tab is hidden, baseMs when visible.
 * Use for queries that should completely stop polling when hidden.
 */
export function useVisibleInterval(baseMs: number): number | false {
  const [isVisible, setIsVisible] = useState(() =>
    typeof document !== "undefined" ? document.visibilityState === "visible" : true,
  );

  useEffect(() => {
    const handler = () => {
      setIsVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return isVisible ? baseMs : false;
}

/* ---- Idle detection for expensive pages ---- */

/**
 * Returns true when the user has been idle (no mouse/keyboard) for `idleMs`.
 * Useful for pausing expensive dashboard charts or live-feed polling.
 */
export function useIsIdle(idleMs = 60_000): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), idleMs);
    };

    reset();

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    for (const event of events) {
      window.addEventListener(event, reset, { passive: true });
    }

    return () => {
      clearTimeout(timer);
      for (const event of events) {
        window.removeEventListener(event, reset);
      }
    };
  }, [idleMs]);

  return idle;
}
