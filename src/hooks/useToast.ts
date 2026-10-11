import { useCallback, useRef, useState } from "react";

/** A transient status message that clears itself after 3s. */
export function useToast() {
  const [toast, setToast] = useState<string>();
  const timer = useRef<number>();

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(undefined), 3000);
  }, []);

  return { toast, flash };
}
