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
import { Panel, usePanel } from "../hooks/usePanel";
import { t } from "../i18n";

interface ResizerProps {
  side: "left" | "right";
  panel: Panel;
  label: string;
  badge?: number;
}

/** Drag-to-resize / click-to-collapse strip between two columns. */
function Resizer({ side, panel, label, badge }: ResizerProps) {
  // Collapsed: a full-height edge rail — click anywhere to reopen; shows what's hidden + a count.
  if (!panel.open) {
    return (
      <button type="button" className={`mdr-rail mdr-rail-${side}`} onClick={panel.toggle} title={`${t("expand")} · ${label}`}>
        <span className="mdr-rail-chevron" aria-hidden="true">{side === "left" ? "›" : "‹"}</span>
        <span className="mdr-rail-label">{label}</span>
        {badge ? <span className="mdr-rail-badge">{badge}</span> : null}
      </button>
    );
  }
  // Open: thin drag strip with a small collapse button; chevron points the way it closes.
  const h = panel.handlers;
  return (
    <div className="mdr-resizer" onPointerDown={h.onPointerDown} onPointerMove={h.onPointerMove} onPointerUp={h.onPointerUp}>
      <button
        type="button"
        className="mdr-collapse"
        onClick={panel.toggle}
        onPointerDown={(e) => e.stopPropagation()}
        title={t("collapse")}
      >
        {side === "left" ? "‹" : "›"}
      </button>
    </div>
  );
}

export function App() {
  const { toast, flash } = useToast();
  const { ctx, files, stage, error: prError } = usePrContext();

  const [file, setFile] = useState<MdFile>();
  useEffect(() => setFile(files[0]), [files]);

  const { text, threads, addedLines, removedLines, loading, error: fileError, reload } = useFileData(ctx, file);
  const resolveImage = useImageResolver(ctx, file);
  const { posting, submit, reply, changeStatus } = useThreadActions(ctx, reload, flash);

  const [pick, setPick] = useState<PickState | null>(null);
  const [draft, setDraft] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  // Clear the selection whenever the file (or context) changes.
  useEffect(() => setPick(null), [ctx, file]);
  useEscapeKey(useCallback(() => setPick(null), []));

  const left = usePanel("mdr.left", 230, 150, 480, "left");
  const right = usePanel("mdr.right", 360, 260, 640, "right");

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

  const openThreads = useMemo(() => threads.filter((th) => isOpen(th.status)).length, [threads]);

  const gridVars = {
    "--mdr-left": `${left.open ? left.width : 0}px`,
    "--mdr-right": `${right.open ? right.width : 0}px`,
    "--mdr-grip-l": left.open ? "6px" : "34px",
    "--mdr-grip-r": right.open ? "6px" : "34px",
  } as React.CSSProperties;

  return (
    <div className="mdr-app" style={gridVars}>
      <FileList files={files} current={file} ctx={ctx} stage={stage} openCount={openCount} onSelect={setFile} />

      <Resizer side="left" panel={left} label={t("railFiles")} badge={files.length} />

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
            addedLines={addedLines}
            removedLines={removedLines}
            selected={pick ? { startLine: pick.anchor.startLine, endLine: pick.anchor.endLine } : null}
            onPick={onPick}
            onRelativeLink={onRelativeLink}
            resolveImage={resolveImage}
          />
        )}
      </main>

      <Resizer side="right" panel={right} label={t("railComments")} badge={openThreads} />

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
