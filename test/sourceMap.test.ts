import assert from "node:assert/strict";
import { computeAnchor, createRenderer, resolveRepoPath, splitLines } from "../src/markdown/sourceMap.ts";
import { addedLineNumbers, removedSegments } from "../src/markdown/diff.ts";

const md = createRenderer();
const source = [
  "# Título", //            1
  "", //                    2
  "Primer párrafo con **negrita**", // 3
  "que sigue aquí.", //     4
  "", //                    5
  "- item uno", //          6
  "- item dos", //          7
  "", //                    8
  "| A | B |", //           9
  "|---|---|", //          10
  "| 1 | 2 |", //          11
  "", //                   12
  "```js", //              13
  "const x = 1;", //       14
  "```" //                 15
].join("\n");
const lines = splitLines(source);
const html = md.render(source);

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log("  ok -", name);
}

test("heading tagged with line 1", () => assert.match(html, /<h1 data-sl="1" data-el="1">/));
test("paragraph spans lines 3-4", () => assert.match(html, /<p data-sl="3" data-el="4">/));
test("list items tagged individually", () => {
  assert.match(html, /<li data-sl="6" data-el="6">/);
  assert.match(html, /<li data-sl="7" data-el="7">/);
});
test("table rows tagged", () => assert.match(html, /<tr data-sl="11" data-el="11">/));
test("fenced code tagged with full range", () => assert.match(html, /data-sl="13" data-el="15"/));
test("raw HTML is escaped (no injection)", () => assert.doesNotMatch(md.render("<script>x</script>"), /<script>/));
test("external links open in new tab", () => assert.match(md.render("[a](https://x.io)"), /target="_blank"/));

test("relative images parked in data-repo-src, absolute untouched", () => {
  assert.match(md.render("![x](./img/a.png)"), /src="" alt="x" data-repo-src="\.\/img\/a\.png"/);
  assert.match(md.render("![x](https://cdn.io/a.png)"), /src="https:\/\/cdn\.io\/a\.png"/);
});
test("whole block anchor when nothing selected", () => {
  assert.deepEqual(computeAnchor(lines, 3, 4), { startLine: 3, startOffset: 1, endLine: 4, endOffset: 16 });
});
test("exact selection maps to column range", () => {
  assert.deepEqual(computeAnchor(lines, 3, 4, "párrafo"), { startLine: 3, startOffset: 8, endLine: 3, endOffset: 15 });
});
test("selection across markdown syntax (bold) uses first/last word", () => {
  // rendered "con negrita" vs source "con **negrita**"
  assert.deepEqual(computeAnchor(lines, 3, 4, "con negrita"), { startLine: 3, startOffset: 16, endLine: 3, endOffset: 29 });
});
test("selection spanning two lines", () => {
  assert.deepEqual(computeAnchor(lines, 3, 4, "negrita que sigue"), { startLine: 3, startOffset: 22, endLine: 4, endOffset: 10 });
});
test("unmatched selection falls back to whole block", () => {
  assert.deepEqual(computeAnchor(lines, 6, 6, "zzz"), { startLine: 6, startOffset: 1, endLine: 6, endOffset: 11 });
});
test("trailing blank lines trimmed", () => {
  assert.deepEqual(computeAnchor(lines, 6, 8), { startLine: 6, startOffset: 1, endLine: 7, endOffset: 11 });
});
test("relative image paths resolve against the md folder", () => {
  assert.equal(resolveRepoPath("/docs/guide/intro.md", "../img/a%20b.png"), "/docs/img/a b.png");
  assert.equal(resolveRepoPath("/README.md", "./assets/x.svg?raw=1"), "/assets/x.svg");
  assert.equal(resolveRepoPath("/docs/a.md", "/root.png"), "/root.png");
});

test("removedSegments: middle deletion anchored after the preceding kept line", () => {
  const base = ["a", "b", "c", "d"].join("\n");
  const right = ["a", "d"].join("\n");
  assert.deepEqual(removedSegments(base, right), [{ afterRightLine: 1, lines: ["b", "c"] }]);
});
test("removedSegments: top-of-file deletion anchored at 0", () => {
  const base = ["x", "a", "b"].join("\n");
  const right = ["a", "b"].join("\n");
  assert.deepEqual(removedSegments(base, right), [{ afterRightLine: 0, lines: ["x"] }]);
});
test("removedSegments: trailing deletion anchored after the last right line", () => {
  const base = ["a", "b", "c"].join("\n");
  const right = ["a"].join("\n");
  assert.deepEqual(removedSegments(base, right), [{ afterRightLine: 1, lines: ["b", "c"] }]);
});
test("removedSegments: an addition between deletions splits the runs", () => {
  const base = ["a", "b", "d"].join("\n");
  const right = ["a", "c", "d"].join("\n"); // b removed, c added, d kept
  assert.deepEqual(removedSegments(base, right), [{ afterRightLine: 1, lines: ["b"] }]);
  assert.deepEqual([...addedLineNumbers(base, right)], [2]); // c is the addition
});
test("removedSegments: no changes -> empty", () => {
  assert.deepEqual(removedSegments("a\nb", "a\nb"), []);
});

console.log(`\n${passed} tests passed`);
