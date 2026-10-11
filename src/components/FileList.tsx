import React from "react";
import { MdFile, PrContext } from "../services/adoClient";
import { t } from "../i18n";

interface Props {
  files: MdFile[];
  current?: MdFile;
  ctx?: PrContext;
  stage: string;
  openCount(file: MdFile): number | undefined;
  onSelect(file: MdFile): void;
}

/** Sidebar listing the PR's Markdown files, each with a new/open-comment badge. */
export function FileList({ files, current, ctx, stage, openCount, onSelect }: Props) {
  return (
    <aside className="mdr-files">
      <div className="mdr-section-title">{t("markdownFiles")} {ctx ? `(${files.length})` : ""}</div>
      {!ctx && <div className="mdr-muted" style={{ margin: "0 4px" }}>{stage}</div>}
      {files.map((f) => {
        const count = openCount(f);
        return (
          <button key={f.path} className={`mdr-file ${f.path === current?.path ? "active" : ""}`} onClick={() => onSelect(f)} title={f.path}>
            <span className="mdr-file-name">{f.path.split("/").pop()}</span>
            <span className="mdr-file-dir">{f.path.split("/").slice(0, -1).join("/") || "/"}</span>
            {f.isNew && <span className="mdr-tag">{t("tagNew")}</span>}
            {count ? <span className="mdr-count">{count}</span> : null}
          </button>
        );
      })}
    </aside>
  );
}
