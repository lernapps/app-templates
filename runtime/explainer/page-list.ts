// The list of an explainer's pages for the catalog of lernapps.net (lernapps-pages.json): only an app of format 2
// (`format: 2` in src/app.yaml) has it. The build writes it at the root of the bundle, beside index.html; the catalog
// reads it instead of hand-written topics, to place the app and its pages on the learning map. It holds the version of
// the list itself (format 1), the app's strand (<subject>/<strand>, or none), and the content pages in the order of the
// app, each with its address relative to the app's root as the app links it, its title as a text (a string, or by
// language) and, unless the strand is none, the competencies it practises; a recap page names instead the competency
// of another strand it repeats (recap: <subject>/<competency>), with any strand.
import { contentPages } from "./routes.ts";
import type { Site, Text } from "./content.ts";

/** The file's name, at the root of the bundle. */
export const PAGE_LIST = "lernapps-pages.json";

export interface PageList {
  /** The version of this list's own format. */
  format: 1;
  strand: string;
  pages: { path: string; title: Text; competencies?: readonly string[]; recap?: string }[];
}

/** The list of the pages of `site`; undefined for an app of format 1, which has none. */
export function pageList(site: Site): PageList | undefined {
  const { format, strand } = site.app;
  if (format !== 2 || strand === undefined) return undefined;
  return {
    format: 1,
    strand,
    pages: contentPages(site).map((page) => ({
      path: `${page.chapter}/${page.id}/`,
      title: page.title,
      ...(page.recap !== undefined
        ? { recap: page.recap }
        : strand === "none" || page.competencies === undefined
          ? {}
          : { competencies: page.competencies }),
    })),
  };
}
