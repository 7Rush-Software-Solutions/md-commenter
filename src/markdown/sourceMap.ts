import MarkdownIt from "markdown-it";

/**
 * Attribute names injected into every rendered block element.
 *  data-sl = first source line (1-based, inclusive)
 *  data-el = last source line  (1-based, inclusive)
 */
export const START_ATTR = "data-sl";
export const END_ATTR = "data-el";

export interface SourceAnchor {
  startLine: number;
  startOffset: number; // 1-based column, as Azure DevOps expects
  endLine: number;
  endOffset: number; // 1-based, exclusive end column
}

/** Token types that are not "open" tokens but still render a block element. */
const LEAF_BLOCKS = new Set(["fence", "code_block", "hr", "html_block"]);

/**
 * Markdown renderer that tags each block element with the source lines it came from,
 * the same technique the VS Code Markdown preview uses for scroll sync.
 */
export function createRenderer(): MarkdownIt {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

  md.core.ruler.push("source_line_map", (state) => {
    const srcLines = splitLines(state.src);
    for (const token of state.tokens) {
      if (!token.map) continue;
      if (token.nesting !== 1 && !LEAF_BLOCKS.has(token.type)) continue;
      // markdown-it map is [start, end) 0-based -> [start+1, end] 1-based inclusive
      const [start, end] = trimRange(srcLines, token.map[0] + 1, Math.max(token.map[0] + 1, token.map[1]));
      token.attrSet(START_ATTR, String(start));
      token.attrSet(END_ATTR, String(end));
    }
  });

  // External links open in a new tab; relative links are marked so the UI can neutralise them.
  const defaultLinkOpen =
    md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet("href") ?? "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      tokens[idx].attrSet("target", "_blank");
      tokens[idx].attrSet("rel", "noopener noreferrer");
    } else {
      tokens[idx].attrSet("data-relative-link", "true");
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  // Repo-relative images need an authenticated fetch; park the path so the browser doesn't 404 on it.
  const defaultImage = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const src = tokens[idx].attrGet("src") ?? "";
    if (src && !/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) {
      tokens[idx].attrSet("data-repo-src", src);
      tokens[idx].attrSet("src", "");
    }
    return defaultImage(tokens, idx, options, env, self);
  };

  return md;
}

/** Splits file text into lines the same way Azure DevOps numbers them. */
export function splitLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

/** Drops trailing blank lines from a block range (lists and quotes sometimes include them). */
export function trimRange(lines: string[], startLine: number, endLine: number): [number, number] {
  let end = Math.min(endLine, lines.length);
  while (end > startLine && lines[end - 1].trim() === "") end--;
  return [startLine, end];
}

function wholeBlock(lines: string[], startLine: number, endLine: number): SourceAnchor {
  const [s, e] = trimRange(lines, startLine, endLine);
  const firstIndent = (lines[s - 1] ?? "").search(/\S|$/);
  return { startLine: s, startOffset: firstIndent + 1, endLine: e, endOffset: (lines[e - 1] ?? "").length + 1 };
}

function indexToPosition(blockLines: string[], blockStartLine: number, index: number): { line: number; offset: number } {
  let remaining = index;
  for (let i = 0; i < blockLines.length; i++) {
    if (remaining <= blockLines[i].length) return { line: blockStartLine + i, offset: remaining + 1 };
    remaining -= blockLines[i].length + 1; // +1 for the newline
  }
  const last = blockLines.length - 1;
  return { line: blockStartLine + last, offset: blockLines[last].length + 1 };
}

/**
 * Turns "user clicked block [startLine..endLine] and maybe selected some rendered text"
 * into an exact source anchor.
 *
 * The rendered text has Markdown syntax stripped (`**bold**` -> `bold`), so an exact match
 * is tried first, then a match spanning from the first to the last selected word.
 * If nothing matches, the whole block is anchored.
 */
export function computeAnchor(lines: string[], startLine: number, endLine: number, selectedText?: string): SourceAnchor {
  const [s, e] = trimRange(lines, startLine, endLine);
  const blockLines = lines.slice(s - 1, e);
  const block = blockLines.join("\n");
  const selection = (selectedText ?? "").replace(/\s+/g, " ").trim();
  if (!selection) return wholeBlock(lines, s, e);

  let startIdx = -1;
  let endIdx = -1;

  const exact = block.indexOf(selection);
  if (exact >= 0) {
    startIdx = exact;
    endIdx = exact + selection.length;
  } else {
    const words = selection.split(" ").filter(Boolean);
    const first = words[0];
    const last = words[words.length - 1];
    const firstIdx = block.indexOf(first);
    if (firstIdx >= 0) {
      const lastIdx = words.length > 1 ? block.indexOf(last, firstIdx + first.length) : firstIdx;
      if (lastIdx >= 0) {
        startIdx = firstIdx;
        endIdx = lastIdx + last.length;
      }
    }
  }

  if (startIdx < 0) return wholeBlock(lines, s, e);

  const start = indexToPosition(blockLines, s, startIdx);
  const end = indexToPosition(blockLines, s, endIdx);
  return { startLine: start.line, startOffset: start.offset, endLine: end.line, endOffset: end.offset };
}

/** Resolves a repo-relative path (e.g. an image src) against the Markdown file's folder. */
export function resolveRepoPath(markdownPath: string, relative: string): string {
  const clean = relative.split(/[?#]/)[0];
  const base = clean.startsWith("/") ? [] : markdownPath.split("/").slice(0, -1);
  for (const part of clean.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") base.pop();
    else base.push(decodeURIComponent(part));
  }
  return "/" + base.filter(Boolean).join("/");
}
