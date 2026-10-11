import { SourceAnchor } from "./markdown/sourceMap";

/** A selected source range in the preview, resolved to exact anchored columns. */
export interface PickState {
  startLine: number;
  endLine: number;
  anchor: SourceAnchor;
}
