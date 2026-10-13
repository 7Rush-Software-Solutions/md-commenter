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
