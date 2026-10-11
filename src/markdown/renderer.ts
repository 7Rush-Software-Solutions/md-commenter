import { createRenderer } from "./sourceMap";

/** Single shared markdown-it instance: configured once, reused by preview and comment bodies. */
export const md = createRenderer();
