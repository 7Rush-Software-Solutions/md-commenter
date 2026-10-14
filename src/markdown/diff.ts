import { splitLines } from "./sourceMap";

/**
 * Right-side (1-based) line numbers that are new compared to the base text.
 *
 * Classic LCS line diff: lines present on the right but not part of the longest
 * common subsequence are the additions. Markdown files are small, so the O(n*m)
 * table is fine.
 */
export function addedLineNumbers(baseText: string, rightText: string): Set<number> {
  const a = splitLines(baseText);
  const b = splitLines(rightText);
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const added = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++; // line only in base -> removed
    } else {
      added.add(j + 1); // line only on right -> added (1-based)
      j++;
    }
  }
  while (j < m) added.add((j++) + 1); // trailing additions
  return added;
}

/** A run of base lines deleted in this PR, anchored to the right-side line it sat after (0 = file top). */
export interface RemovedSegment {
  afterRightLine: number;
  lines: string[];
}

/**
 * Base lines deleted compared to the right text, grouped into contiguous runs.
 *
 * Same LCS backtrack as {@link addedLineNumbers}, but collects the lines present
 * only in the base. Each run records the right-side line it follows so the preview
 * can inject it at the right spot (consecutive deletions share that anchor since the
 * right cursor `j` doesn't advance while we consume base-only lines).
 */
export function removedSegments(baseText: string, rightText: string): RemovedSegment[] {
  const a = splitLines(baseText);
  const b = splitLines(rightText);
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const segments: RemovedSegment[] = [];
  let current: RemovedSegment | null = null;
  const drop = (line: string, afterRightLine: number) => {
    if (current && current.afterRightLine === afterRightLine) current.lines.push(line);
    else segments.push((current = { afterRightLine, lines: [line] }));
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      current = null; // a kept line breaks the run
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      drop(a[i], j); // line only in base -> removed, sits after right line j
      i++;
    } else {
      current = null; // an added line breaks the run
      j++;
    }
  }
  while (i < n) drop(a[i++], m); // trailing deletions after the last right line
  return segments;
}
