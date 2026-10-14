// Minimal runtime i18n for the MD Commenter tab (English + Spanish).
// The language is picked once from the host/browser; strings are looked up by key
// and support {name} placeholders filled from the params object.

export type Lang = "en" | "es";

type Params = Record<string, string | number>;

const en = {
  // App — loading / errors
  stageConnecting: "Connecting to Azure DevOps",
  stageListingFiles: "Listing the Markdown files of PR #{id}",
  watchdog:
    'No response after 20 s at step: "{step}". Check the browser console (MD Commenter tab) and share the error.',
  stepError: 'Error at step "{step}": {message}',
  linkNotInPr: "That link points to a file that is not part of this PR.",
  commentPosted: "Comment published on line {line}.",
  postFailed: "Could not publish: {message}",
  replyFailed: "Could not reply: {message}",
  statusFailed: "Could not update the status: {message}",
  noMarkdownFiles: "This Pull Request does not modify any Markdown files.",
  // App — layout
  markdownFiles: "Markdown files",
  tagNew: "new",
  showResolved: "Show resolved",
  refresh: "Refresh",
  viewInFiles: "View in Files",
  collapse: "Collapse",
  expand: "Expand",
  railFiles: "Files",
  railComments: "Comments",
  pickHint: "Click any block, or select a fragment of text, to comment on those lines.",
  loadingFile: "Loading file…",
  line: "Line {line}",
  lines: "Lines {start}–{end}",
  close: "Close (Esc)",
  draftPlaceholder: "Write your comment (Markdown). Ctrl+Enter to publish.",
  posting: "Publishing…",
  comment: "Comment",
  fileComments: "Comments on this file ({count})",
  noComments: "No {scope}comments yet.",
  scopeActive: "active ",
  // ThreadView
  goToBlock: "Go to block",
  replyPlaceholder: "Reply…",
  cancel: "Cancel",
  reply: "Reply",
  resolve: "Resolve",
  reactivate: "Reactivate",
  statusFallback: "—",
  statusUnknown: "Unknown",
  statusActive: "Active",
  statusFixed: "Resolved",
  statusWontFix: "Won't fix",
  statusClosed: "Closed",
  statusByDesign: "By design",
  statusPending: "Pending"
};

const es: typeof en = {
  stageConnecting: "Conectando con Azure DevOps",
  stageListingFiles: "Listando archivos Markdown del PR #{id}",
  watchdog:
    'No hubo respuesta después de 20 s en el paso: "{step}". Revisa la consola del navegador (pestaña MD Commenter) y comparte el error.',
  stepError: 'Error en el paso "{step}": {message}',
  linkNotInPr: "Ese enlace apunta a un archivo que no forma parte de este PR.",
  commentPosted: "Comentario publicado en la línea {line}.",
  postFailed: "No se pudo publicar: {message}",
  replyFailed: "No se pudo responder: {message}",
  statusFailed: "No se pudo actualizar el estado: {message}",
  noMarkdownFiles: "Este Pull Request no modifica archivos Markdown.",
  markdownFiles: "Archivos Markdown",
  tagNew: "nuevo",
  showResolved: "Mostrar resueltos",
  refresh: "Actualizar",
  viewInFiles: "Ver en Files",
  collapse: "Contraer",
  expand: "Expandir",
  railFiles: "Archivos",
  railComments: "Comentarios",
  pickHint: "Haz clic en cualquier bloque, o selecciona un fragmento de texto, para comentar esas líneas.",
  loadingFile: "Cargando archivo…",
  line: "Línea {line}",
  lines: "Líneas {start}–{end}",
  close: "Cerrar (Esc)",
  draftPlaceholder: "Escribe tu comentario (Markdown). Ctrl+Enter para publicar.",
  posting: "Publicando…",
  comment: "Comentar",
  fileComments: "Comentarios en este archivo ({count})",
  noComments: "Sin comentarios {scope}todavía.",
  scopeActive: "activos ",
  goToBlock: "Ir al bloque",
  replyPlaceholder: "Responder…",
  cancel: "Cancelar",
  reply: "Responder",
  resolve: "Resolver",
  reactivate: "Reactivar",
  statusFallback: "—",
  statusUnknown: "Desconocido",
  statusActive: "Activo",
  statusFixed: "Resuelto",
  statusWontFix: "No se corregirá",
  statusClosed: "Cerrado",
  statusByDesign: "Por diseño",
  statusPending: "Pendiente"
};

export type I18nKey = keyof typeof en;

const DICTS: Record<Lang, typeof en> = { en, es };

function detectLang(): Lang {
  const nav = typeof navigator !== "undefined" ? navigator.language : "en";
  return /^es\b/i.test(nav || "") ? "es" : "en";
}

let lang: Lang = detectLang();

/** Override the detected language (e.g. from the Azure DevOps host culture). */
export function setLang(l: Lang): void {
  lang = l;
}

export function getLang(): Lang {
  return lang;
}

/** Translate a key, filling {name} placeholders from params. Falls back to English, then the key. */
export function t(key: I18nKey, params?: Params): string {
  const template = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  return params ? template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`)) : template;
}
