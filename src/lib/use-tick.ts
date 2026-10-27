import { useEffect, useState } from "react";

/** Re-render định kỳ để "bây giờ" luôn đúng. */
export function useTick(ms = 30_000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}
