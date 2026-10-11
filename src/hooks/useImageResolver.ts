import { useCallback, useEffect, useRef } from "react";
import { getImageObjectUrl, MdFile, PrContext } from "../services/adoClient";
import { resolveRepoPath } from "../markdown/sourceMap";

/**
 * Resolves repo-relative image paths to authenticated blob URLs, memoized per repo path.
 * The cache (and its blob URLs) is revoked whenever the context or file changes.
 */
export function useImageResolver(ctx: PrContext | undefined, file: MdFile | undefined) {
  const cache = useRef(new Map<string, Promise<string>>());

  useEffect(() => {
    const current = cache.current;
    return () => {
      current.forEach((p) => p.then(URL.revokeObjectURL, () => undefined));
      current.clear();
    };
  }, [ctx, file]);

  return useCallback(
    (src: string) => {
      if (!ctx || !file) return Promise.reject(new Error("sin contexto"));
      const path = resolveRepoPath(file.path, src);
      let p = cache.current.get(path);
      if (!p) {
        p = getImageObjectUrl(ctx, path);
        cache.current.set(path, p);
      }
      return p;
    },
    [ctx, file]
  );
}
