import { useCallback, useRef, useState } from "react";

export interface Panel {
  width: number;
  open: boolean;
  toggle(): void;
  handlers: {
    onPointerDown(e: React.PointerEvent): void;
    onPointerMove(e: React.PointerEvent): void;
    onPointerUp(e: React.PointerEvent): void;
  };
}

const num = (key: string, fallback: number) => {
  const v = Number(localStorage.getItem(key));
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

/**
 * A resizable, collapsible side column. Width and open state persist to
 * localStorage. `side` tells the drag math which grid edge the column hugs.
 */
export function usePanel(key: string, initial: number, min: number, max: number, side: "left" | "right"): Panel {
  const [width, setWidth] = useState(() => Math.min(max, Math.max(min, num(`${key}.w`, initial))));
  const [open, setOpen] = useState(() => localStorage.getItem(`${key}.open`) !== "0");
  const dragging = useRef(false);

  const toggle = useCallback(() => {
    setOpen((o) => {
      localStorage.setItem(`${key}.open`, o ? "0" : "1");
      return !o;
    });
  }, [key]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const rect = e.currentTarget.parentElement!.getBoundingClientRect();
    const raw = side === "left" ? e.clientX - rect.left : rect.right - e.clientX;
    setWidth(Math.min(max, Math.max(min, raw)));
  }, [min, max, side]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    setWidth((w) => {
      localStorage.setItem(`${key}.w`, String(w));
      return w;
    });
  }, [key]);

  return { width, open, toggle, handlers: { onPointerDown, onPointerMove, onPointerUp } };
}
