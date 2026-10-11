import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeAnchor, resolveRepoPath, splitLines } from "../markdown/sourceMap";
import { md } from "../markdown/renderer";
import { MdFile, openInFilesTab, ReviewThread } from "../services/adoClient";
import { BlockPick, MarkdownPreview } from "./MarkdownPreview";
import { isOpen } from "./ThreadView";
import { CommentPanel } from "./CommentPanel";
import { FileList } from "./FileList";
import { Toolbar } from "./Toolbar";
import { PickState } from "../types";
import { useToast } from "../hooks/useToast";
import { usePrContext } from "../hooks/usePrContext";
import { useFileData } from "../hooks/useFileData";
import { useImageResolver } from "../hooks/useImageResolver";
import { useThreadActions } from "../hooks/useThreadActions";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { t } from "../i18n";

export function App() {
  const { toast, flash } = useToast();
  const { ctx, files, stage, error: prError } = usePrContext();

  const [file, setFile] = useState<MdFile>();
  useEffect(() => setFile(files[0]), [files]);

  const { text, threads, loading, error: fileError, reload } = useFileData(ctx, file);
  const resolveImage = useImageResolver(ctx, file);
  const { posting, submit, reply, changeStatus } = useThreadActions(ctx, reload, flash);

  const [pick, setPick] = useState<PickState | null>(null);
  const [draft, setDraft] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  // Clear the selection whenever the file (or context) changes.
  useEffect(() => setPick(null), [ctx, file]);
  useEscapeKey(useCallback(() => setPick(null), []));

  const lines = useMemo(() => splitLines(text), [text]);
  const html = useMemo(() => md.render(text), [text]);
  const visibleThreads = useMemo(
    () => (showResolved ? threads : threads.filter((th) => isOpen(th.status))),
    [threads, showResolved]
  );
  const pickThreads = useMemo(
    () => (pick ? visibleThreads.filter((th) => th.startLine <= pick.anchor.endLine && th.endLine >= pick.anchor.startLine) : []),
    [pick, visibleThreads]
  );
  const openCount = useCallback(
    (f: MdFile) => (f.path === file?.path ? threads.filter((th) => isOpen(th.status)).length : undefined),
    [file, threads]
  );

  const onPick = (p: BlockPick) => {
    const anchor = computeAnchor(lines, p.startLine, p.endLine, p.selectedText);
    setPick({ startLine: p.startLine, endLine: p.endLine, anchor });
    window.setTimeout(() => draftRef.current?.focus(), 0);
  };

  const onRelativeLink = (href: string) => {
    if (!file || !href || href.startsWith("#")) return;
    const target = files.find((f) => f.path === resolveRepoPath(file.path, href));
    if (target) setFile(target);
    else flash(t("linkNotInPr"));
  };

  const focusThread = (th: ReviewThread) =>
    setPick({ startLine: th.startLine, endLine: th.endLine, anchor: computeAnchor(lines, th.startLine, th.endLine) });

  const onSubmit = async () => {
    if (!file || !pick || !draft.trim()) return;
    if (await submit(file, pick.anchor, draft.trim())) setDraft("");
  };

  if (prError && !ctx) return <div className="mdr-empty mdr-error">{prError}</div>;
  if (ctx && !files.length) return <div className="mdr-empty">{t("noMarkdownFiles")}</div>;

  return (
    <div className="mdr-app">
      <FileList files={files} current={file} ctx={ctx} stage={stage} openCount={openCount} onSelect={setFile} />

      <main className="mdr-main">
        <Toolbar
          file={file}
          ctx={ctx}
          showResolved={showResolved}
          loading={loading}
          onToggleResolved={setShowResolved}
          onRefresh={reload}
          onOpenInFiles={() => ctx && file && openInFilesTab(ctx, file.path)}
        />
        <div className="mdr-hint">{t("pickHint")}</div>
        {loading ? (
          <div className="mdr-empty">{ctx ? t("loadingFile") : stage}</div>
        ) : fileError ? (
          <div className="mdr-empty mdr-error">{fileError}</div>
        ) : (
          <MarkdownPreview
            html={html}
            threads={visibleThreads}
            selected={pick ? { startLine: pick.anchor.startLine, endLine: pick.anchor.endLine } : null}
            onPick={onPick}
            onRelativeLink={onRelativeLink}
            resolveImage={resolveImage}
          />
        )}
      </main>

      <CommentPanel
        pick={pick}
        lines={lines}
        pickThreads={pickThreads}
        visibleThreads={visibleThreads}
        showResolved={showResolved}
        draft={draft}
        posting={posting}
        draftRef={draftRef}
        onClosePick={() => setPick(null)}
        onDraftChange={setDraft}
        onSubmit={onSubmit}
        onReply={reply}
        onStatus={changeStatus}
        onFocus={focusThread}
      />

      {toast && <div className="mdr-toast">{toast}</div>}
    </div>
  );
}
