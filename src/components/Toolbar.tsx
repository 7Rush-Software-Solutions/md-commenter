import React from "react";
import { MdFile, PrContext } from "../services/adoClient";
import { t } from "../i18n";

interface Props {
  file?: MdFile;
  ctx?: PrContext;
  showResolved: boolean;
  loading: boolean;
  onToggleResolved(value: boolean): void;
  onRefresh(): void;
  onOpenInFiles(): void;
}

/** File path, resolved-threads toggle, and refresh / open-in-Files actions. */
export function Toolbar({ file, ctx, showResolved, loading, onToggleResolved, onRefresh, onOpenInFiles }: Props) {
  return (
    <div className="mdr-toolbar">
      <span className="mdr-path">{file?.path}</span>
      <label className="mdr-check">
        <input type="checkbox" checked={showResolved} onChange={(e) => onToggleResolved(e.target.checked)} />
        {t("showResolved")}
      </label>
      <button className="mdr-btn" onClick={onRefresh} disabled={loading}>{t("refresh")}</button>
      {ctx && file && (
        <button className="mdr-btn" onClick={onOpenInFiles}>{t("viewInFiles")}</button>
      )}
    </div>
  );
}
