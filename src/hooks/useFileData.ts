import { useCallback, useEffect, useState } from "react";
import { getFileBaseText, getFileText, getFileThreads, MdFile, PrContext, ReviewThread } from "../services/adoClient";
import { addedLineNumbers, removedSegments, RemovedSegment } from "../markdown/diff";
import { errorText } from "../util";

const NO_ADDED: Set<number> = new Set();
const NO_REMOVED: RemovedSegment[] = [];

interface FileData {
  text: string;
  threads: ReviewThread[];
  /** Right-side source lines added in this PR (empty for brand-new files). */
  addedLines: Set<number>;
  /** Contiguous runs of base lines deleted in this PR (empty for brand-new files). */
  removedLines: RemovedSegment[];
  loading: boolean;
  error?: string;
  /** Re-fetch only the threads for the current file (after posting/replying/status changes). */
  reload: () => Promise<void>;
}

/** Loads the selected file's content and threads, re-running whenever the context or file changes. */
export function useFileData(ctx: PrContext | undefined, file: MdFile | undefined): FileData {
  const [text, setText] = useState("");
  const [threads, setThreads] = useState<ReviewThread[]>([]);
  const [addedLines, setAddedLines] = useState<Set<number>>(NO_ADDED);
  const [removedLines, setRemovedLines] = useState<RemovedSegment[]>(NO_REMOVED);
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
    // Brand-new files: everything is new, so there's nothing worth highlighting.
    // Modified files: diff against the merge base to find the added lines; if the
    // base can't be fetched, fall back to no highlight rather than a false all-green.
    const base = file.isNew ? Promise.resolve<string | null>(null) : getFileBaseText(ctx, file.path).catch(() => null);
    Promise.all([getFileText(ctx, file.path), getFileThreads(ctx, file.path), base])
      .then(([txt, th, baseTxt]) => {
        if (cancelled) return;
        setText(txt);
        setThreads(th);
        setAddedLines(baseTxt == null ? NO_ADDED : addedLineNumbers(baseTxt, txt));
        setRemovedLines(baseTxt == null ? NO_REMOVED : removedSegments(baseTxt, txt));
      })
      .catch((e) => !cancelled && setError(errorText(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ctx, file]);

  return { text, threads, addedLines, removedLines, loading, error, reload };
}
