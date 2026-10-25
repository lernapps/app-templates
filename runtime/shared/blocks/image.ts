// A bundled image at build time, in Node: whether it has no size of its own. Not part of index.ts, which the browser
// may import.
import { readFileSync } from "node:fs";

const TYPES: Readonly<Record<string, string>> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

/** The media type of a bundled image, by its file name. */
export const imageType = (name: string): string =>
  TYPES[name.slice(name.lastIndexOf(".") + 1)] ?? "application/octet-stream";

/**
 * Whether the SVG file `file` has no size of its own: its root has neither a width nor a height (only a viewBox, or
 * percentages). In a box as wide as its content, as the image of a labelled figure is, the browser draws such an image
 * with zero width. Another kind of image has a size.
 */
export function isSizeless(file: string): boolean {
  if (!file.endsWith(".svg")) return false;
  const root = /<svg\b[^>]*>/i.exec(readFileSync(file, "utf8"))?.[0] ?? "";
  return !/\s(?:width|height)\s*=\s*["']?\s*\d*\.?\d+\s*(?:px|pt|pc|mm|cm|in|em|ex|rem)?\s*["'\s/>]/i.test(root);
}
