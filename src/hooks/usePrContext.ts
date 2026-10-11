import { useEffect, useState } from "react";
import { listMarkdownFiles, MdFile, PrContext, resolvePrContext } from "../services/adoClient";
import { t } from "../i18n";
import { errorText } from "../util";

interface PrState {
  ctx?: PrContext;
  files: MdFile[];
  /** Human-readable progress line shown until the context resolves. */
  stage: string;
  /** Set when PR resolution fails or the watchdog fires; the app shows this instead of the UI. */
  error?: string;
}

/**
 * Resolves the PR and its Markdown files once on mount. Each step is reported into `stage`,
 * and a watchdog turns a silent hang into a visible error naming the step that never finished.
 */
export function usePrContext(): PrState {
  const [ctx, setCtx] = useState<PrContext>();
  const [files, setFiles] = useState<MdFile[]>([]);
  const [stage, setStage] = useState(`${t("stageConnecting")}…`);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let current = t("stageConnecting");
    let done = false;
    const report = (s: string) => {
      current = s;
      setStage(`${s}…`);
    };
    const watchdog = window.setTimeout(() => {
      if (!done) setError(t("watchdog", { step: current }));
    }, 20000);
    (async () => {
      try {
        const c = await resolvePrContext(report);
        report(t("stageListingFiles", { id: c.pullRequestId }));
        const mdFiles = await listMarkdownFiles(c);
        done = true;
        setCtx(c);
        setFiles(mdFiles);
      } catch (e) {
        done = true;
        console.error("[MD Commenter]", current, e);
        setError(t("stepError", { step: current, message: errorText(e) }));
      } finally {
        window.clearTimeout(watchdog);
      }
    })();
    return () => window.clearTimeout(watchdog);
  }, []);

  return { ctx, files, stage, error };
}
