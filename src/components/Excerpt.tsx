import React from "react";
import { SourceAnchor } from "../markdown/sourceMap";

/** Source excerpt for the comment panel, with the exact anchored columns highlighted. */
export function Excerpt({ lines, anchor }: { lines: string[]; anchor: SourceAnchor }) {
  const rows = [];
  for (let n = anchor.startLine; n <= anchor.endLine; n++) {
    const text = lines[n - 1] ?? "";
    const from = n === anchor.startLine ? anchor.startOffset - 1 : 0;
    const to = n === anchor.endLine ? anchor.endOffset - 1 : text.length;
    rows.push(
      <div key={n} className="mdr-src-line">
        <span className="mdr-src-num">{n}</span>
        <span className="mdr-src-text">
          {text.slice(0, from)}
          <mark>{text.slice(from, to) || " "}</mark>
          {text.slice(to)}
        </span>
      </div>
    );
  }
  return <pre className="mdr-src">{rows}</pre>;
}
