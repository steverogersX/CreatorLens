import { useEffect, useRef, useState } from "react";

/**
 * Throttles a rapidly-changing value so it updates at most once per `intervalMs`,
 * always delivering the final value (trailing edge). Pass `intervalMs <= 0` to
 * disable throttling and return the value unchanged.
 *
 * Used to cap how often expensive renders (e.g. full Markdown re-parses) run
 * while text streams in token-by-token.
 */
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const valueRef = useRef(value);
  const lastRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    valueRef.current = value;
    if (intervalMs <= 0) return;

    const commit = () => {
      lastRef.current = Date.now();
      timerRef.current = null;
      setThrottled(valueRef.current);
    };

    const elapsed = Date.now() - lastRef.current;
    if (elapsed >= intervalMs) {
      commit();
    } else if (!timerRef.current) {
      timerRef.current = setTimeout(commit, intervalMs - elapsed);
    }
  }, [value, intervalMs]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return intervalMs <= 0 ? value : throttled;
}
