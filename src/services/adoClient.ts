import * as SDK from "azure-devops-extension-sdk";
import { getClient } from "azure-devops-extension-api";
import { CommonServiceIds, IHostNavigationService, ILocationService, IProjectPageService } from "azure-devops-extension-api/Common/CommonServices";
import { GitServiceIds, IVersionControlRepositoryService } from "azure-devops-extension-api/Git/GitServices";
import { GitRestClient } from "azure-devops-extension-api/Git/GitClient";
import {
  Comment,
  CommentThreadStatus,
  CommentType,
  GitPullRequest,
  GitPullRequestCommentThread,
  GitVersionOptions,
  GitVersionType,
  VersionControlChangeType
} from "azure-devops-extension-api/Git/Git";
import { SourceAnchor } from "../markdown/sourceMap";
import { buildLineThread } from "./threadPayload";

export interface PrContext {
  project: string;
  repositoryId: string;
  pullRequestId: number;
  pullRequest: GitPullRequest;
  /** Latest iteration: the "right side" of the full PR diff. */
  iterationId: number;
  commitId: string;
}

export interface MdFile {
  path: string;
  changeTrackingId: number;
  isNew: boolean;
}

export interface ReviewThread {
  id: number;
  status: CommentThreadStatus;
  startLine: number;
  endLine: number;
  comments: Comment[];
}

const MD_EXT = /\.(md|markdown|mdx)$/i;

let client: GitRestClient | undefined;
const git = () => (client ??= getClient(GitRestClient));

function toNumber(value: unknown): number | undefined {
  const n = parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Finds out which PR the tab is showing. The PR-tab configuration has varied between
 * host versions, so we try the configuration first and fall back to the page route
 * and the host's repository service.
 */
export async function resolvePrContext(report: (stage: string) => void = () => undefined): Promise<PrContext> {
  report("Leyendo la configuración de la pestaña");
  const config = (SDK.getConfiguration() ?? {}) as any;
  console.info("[MD Commenter] tab configuration keys:", Object.keys(config));

  let pullRequestId = toNumber(config.pullRequest?.pullRequestId ?? config.pullRequestId);
  let repositoryId: string | undefined = config.pullRequest?.repository?.id ?? config.repositoryId;
  let project: string | undefined = config.pullRequest?.repository?.project?.id ?? config.projectId;

  if (!pullRequestId) {
    report("Obteniendo el ID del PR desde la URL");
    const nav = await SDK.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService);
    const route = await nav.getPageRoute();
    const rv = route.routeValues ?? {};
    console.info("[MD Commenter] page route:", route.id, rv);
    pullRequestId = toNumber(rv.pullRequestId ?? rv.parameters);
  }
  if (!repositoryId) {
    report("Obteniendo el repositorio actual");
    const repoService = await SDK.getService<IVersionControlRepositoryService>(GitServiceIds.VersionControlRepositoryService);
    const repo = await repoService.getCurrentGitRepository();
    repositoryId = repo?.id;
    project ??= repo?.project?.id;
  }
  if (!project) {
    report("Obteniendo el proyecto actual");
    const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
    project = (await projectService.getProject())?.id;
  }
  if (!pullRequestId || !repositoryId || !project) {
    throw new Error("No se pudo identificar el Pull Request actual (PR, repositorio o proyecto).");
  }

  console.info("[MD Commenter] resolved:", { pullRequestId, repositoryId, project });
  report(`Cargando el PR #${pullRequestId}`);
  const pullRequest = await git().getPullRequest(repositoryId, pullRequestId, project);
  report(`Cargando las iteraciones del PR #${pullRequestId}`);
  const iterations = await git().getPullRequestIterations(repositoryId, pullRequestId, project);
  const latest = iterations[iterations.length - 1];

  return {
    project,
    repositoryId,
    pullRequestId,
    pullRequest,
    iterationId: latest.id,
    commitId: latest.sourceRefCommit?.commitId ?? pullRequest.lastMergeSourceCommit.commitId
  };
}

/** Markdown files changed in the PR (full diff: base → latest iteration). Deleted files are skipped. */
export async function listMarkdownFiles(ctx: PrContext): Promise<MdFile[]> {
  const files: MdFile[] = [];
  let skip = 0;
  for (;;) {
    const page = await git().getPullRequestIterationChanges(ctx.repositoryId, ctx.pullRequestId, ctx.iterationId, ctx.project, 1000, skip, 0);
    for (const change of page.changeEntries ?? []) {
      const path = change.item?.path;
      if (!path || !MD_EXT.test(path)) continue;
      if (change.changeType & VersionControlChangeType.Delete) continue;
      files.push({
        path,
        changeTrackingId: change.changeTrackingId,
        isNew: Boolean(change.changeType & VersionControlChangeType.Add)
      });
    }
    if (!page.nextSkip) break;
    skip = page.nextSkip;
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

const atCommit = (commitId: string) => ({
  version: commitId,
  versionType: GitVersionType.Commit,
  versionOptions: GitVersionOptions.None
});

/** File text at the PR's latest source commit (the right side of the diff). */
export function getFileText(ctx: PrContext, path: string): Promise<string> {
  return git().getItemText(ctx.repositoryId, path, ctx.project, undefined, undefined, false, false, false, atCommit(ctx.commitId), true);
}

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  svg: "image/svg+xml", webp: "image/webp", bmp: "image/bmp", ico: "image/x-icon"
};

/** Repo images need auth, so <img src> can't load them directly; fetch and hand back a blob URL. */
export async function getImageObjectUrl(ctx: PrContext, path: string): Promise<string> {
  const buffer = await git().getItemContent(ctx.repositoryId, path, ctx.project, undefined, undefined, false, false, false, atCommit(ctx.commitId), true);
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return URL.createObjectURL(new Blob([buffer], { type: MIME[ext] ?? "application/octet-stream" }));
}

/** Line-anchored threads on a file, positions tracked to the latest iteration. */
export async function getFileThreads(ctx: PrContext, path: string): Promise<ReviewThread[]> {
  const threads = await git().getThreads(ctx.repositoryId, ctx.pullRequestId, ctx.project, ctx.iterationId);
  return threads
    .filter((t) => !t.isDeleted && t.threadContext?.filePath === path && t.threadContext.rightFileStart)
    .map((t) => ({
      id: t.id,
      status: t.status,
      startLine: t.threadContext.rightFileStart.line,
      endLine: t.threadContext.rightFileEnd?.line ?? t.threadContext.rightFileStart.line,
      comments: (t.comments ?? []).filter((c) => !c.isDeleted && c.commentType !== CommentType.System)
    }))
    .filter((t) => t.comments.length > 0);
}

/** Creates a thread anchored to the source lines/columns, exactly like commenting in the diff view. */
export async function createLineThread(ctx: PrContext, file: MdFile, anchor: SourceAnchor, content: string): Promise<GitPullRequestCommentThread> {
  const thread = buildLineThread(file.path, file.changeTrackingId, ctx.iterationId, anchor, content);
  return git().createThread(thread, ctx.repositoryId, ctx.pullRequestId, ctx.project);
}

export function replyToThread(ctx: PrContext, threadId: number, parentCommentId: number, content: string): Promise<Comment> {
  const comment = { parentCommentId, content, commentType: CommentType.Text } as Comment;
  return git().createComment(comment, ctx.repositoryId, ctx.pullRequestId, threadId, ctx.project);
}

export async function setThreadStatus(ctx: PrContext, threadId: number, status: CommentThreadStatus): Promise<void> {
  await git().updateThread({ status } as GitPullRequestCommentThread, ctx.repositoryId, ctx.pullRequestId, threadId, ctx.project);
}

/**
 * Opens the same file in the PR's native "Files" tab so the reviewer can cross-check a comment.
 * Uses the collection URL from the host, so it works on dev.azure.com, *.visualstudio.com and Azure DevOps Server.
 */
export async function openInFilesTab(ctx: PrContext, path: string): Promise<void> {
  const location = await SDK.getService<ILocationService>(CommonServiceIds.LocationService);
  const base = (await location.getServiceLocation()).replace(/\/$/, "");
  const repoName = encodeURIComponent(ctx.pullRequest.repository.name);
  const projectName = encodeURIComponent(ctx.pullRequest.repository.project.name);
  const url = `${base}/${projectName}/_git/${repoName}/pullrequest/${ctx.pullRequestId}?_a=files&path=${encodeURIComponent(path)}`;
  const nav = await SDK.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService);
  nav.navigate(url);
}
