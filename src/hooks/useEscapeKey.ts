import { useEffect } from "react";

/** Calls `onEscape` on the Escape key, unless a textarea is focused (so drafts aren't lost). */
export function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.activeElement?.tagName !== "TEXTAREA") onEscape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEscape]);
}
