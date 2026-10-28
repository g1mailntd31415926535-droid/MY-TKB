import { useRef } from "react";
import type { TouchEvent } from "react";

/**
 * Nhận cử chỉ vuốt ngang. Trả về handler gắn thẳng vào phần tử:
 * `<div {...useSwipe({ onLeft, onRight })}>`.
 * Chỉ tính khi vuốt ngang ≥ 50px và rõ ràng hơn vuốt dọc, để không
 * nhầm với chạm chọn hay cuộn trang.
 */
export function useSwipe({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0];
      start.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
    },
    onTouchEnd: (e: TouchEvent) => {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - from.x;
      const dy = t.clientY - from.y;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) onLeft();
      else onRight();
    },
    onTouchCancel: () => {
      start.current = null;
    },
  };
}
