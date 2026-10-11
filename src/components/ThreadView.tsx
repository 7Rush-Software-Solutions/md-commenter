import React, { useState } from "react";
import { CommentThreadStatus } from "azure-devops-extension-api/Git/Git";
import { ReviewThread } from "../services/adoClient";
import { md } from "../markdown/renderer";
import { I18nKey, t } from "../i18n";

const STATUS_KEY: Record<number, I18nKey> = {
  [CommentThreadStatus.Unknown]: "statusUnknown",
  [CommentThreadStatus.Active]: "statusActive",
  [CommentThreadStatus.Fixed]: "statusFixed",
  [CommentThreadStatus.WontFix]: "statusWontFix",
  [CommentThreadStatus.Closed]: "statusClosed",
  [CommentThreadStatus.ByDesign]: "statusByDesign",
  [CommentThreadStatus.Pending]: "statusPending"
};

/** Localized label for a thread status, with a dash fallback for unmapped values. */
export const statusLabel = (status: CommentThreadStatus): string =>
  STATUS_KEY[status] ? t(STATUS_KEY[status]) : t("statusFallback");

export const isOpen = (s: CommentThreadStatus) => s === CommentThreadStatus.Active || s === CommentThreadStatus.Pending;

interface Props {
  thread: ReviewThread;
  onReply(threadId: number, parentCommentId: number, text: string): Promise<void>;
  onStatus(threadId: number, status: CommentThreadStatus): Promise<void>;
  onFocus?(thread: ReviewThread): void;
}

export function ThreadView({ thread, onReply, onStatus, onFocus }: Props) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const open = isOpen(thread.status);
  const lines = thread.startLine === thread.endLine ? `L${thread.startLine}` : `L${thread.startLine}–${thread.endLine}`;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const sendReply = () =>
    run(async () => {
      if (!text.trim()) return;
      await onReply(thread.id, thread.comments[thread.comments.length - 1].id, text.trim());
      setText("");
      setReplying(false);
    });

  return (
    <div className={`mdr-thread ${open ? "is-open" : "is-closed"}`}>
      <div className="mdr-thread-head">
        <button className="mdr-link" onClick={() => onFocus?.(thread)} title={t("goToBlock")}>
          {lines}
        </button>
        <span className={`mdr-pill ${open ? "pill-open" : "pill-closed"}`}>{statusLabel(thread.status)}</span>
      </div>

      {thread.comments.map((c) => (
        <div key={c.id} className="mdr-comment">
          <div className="mdr-comment-meta">
            <strong>{c.author?.displayName}</strong>
            <span>{c.publishedDate ? new Date(c.publishedDate).toLocaleString() : ""}</span>
          </div>
          <div className="mdr-comment-body markdown-body" dangerouslySetInnerHTML={{ __html: md.render(c.content ?? "") }} />
        </div>
      ))}

      {replying ? (
        <div className="mdr-reply">
          <textarea
            autoFocus
            value={text}
            placeholder={t("replyPlaceholder")}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply();
              if (e.key === "Escape") setReplying(false);
            }}
          />
          <div className="mdr-actions">
            <button className="mdr-btn" onClick={() => setReplying(false)} disabled={busy}>{t("cancel")}</button>
            <button className="mdr-btn primary" onClick={sendReply} disabled={busy || !text.trim()}>{t("reply")}</button>
          </div>
        </div>
      ) : (
        <div className="mdr-actions">
          <button className="mdr-btn" onClick={() => setReplying(true)} disabled={busy}>{t("reply")}</button>
          {open ? (
            <button className="mdr-btn" onClick={() => run(() => onStatus(thread.id, CommentThreadStatus.Fixed))} disabled={busy}>{t("resolve")}</button>
          ) : (
            <button className="mdr-btn" onClick={() => run(() => onStatus(thread.id, CommentThreadStatus.Active))} disabled={busy}>{t("reactivate")}</button>
          )}
        </div>
      )}
    </div>
  );
}
