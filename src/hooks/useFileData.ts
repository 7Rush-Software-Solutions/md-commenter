import { useCallback, useEffect, useState } from "react";
import { getFileText, getFileThreads, MdFile, PrContext, ReviewThread } from "../services/adoClient";
import { errorText } from "../util";

interface FileData {
  text: string;
  threads: ReviewThread[];
  loading: boolean;
  error?: string;
  /** Re-fetch only the threads for the current file (after posting/replying/status changes). */
  reload: () => Promise<void>;
}

/** Loads the selected file's content and threads, re-running whenever the context or file changes. */
export function useFileData(ctx: PrContext | undefined, file: MdFile | undefined): FileData {
  const [text, setText] = useState("");
  const [threads, setThreads] = useState<ReviewThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    if (!ctx || !file) return;
    setThreads(await getFileThreads(ctx, file.path));
  }, [ctx, file]);

  useEffect(() => {
    if (!ctx || !file) return;
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    Promise.all([getFileText(ctx, file.path), getFileThreads(ctx, file.path)])
      .then(([txt, th]) => {
        if (cancelled) return;
        setText(txt);
        setThreads(th);
      })
      .catch((e) => !cancelled && setError(errorText(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ctx, file]);

  return { text, threads, loading, error, reload };
}
