// The scope of an explainer (src/scope.md): the whole learning path for a tutor, written by the creator's assistant
// in its own words from the material, as continuous prose: one part per chapter (## <title> (/<chapter>/)) and per
// content page (### <title> (/<chapter>/<page>/)), each naming its page by its path, then what belongs to the scope and
// what does not (## Gehört dazu, ## Gehört nicht dazu; in English ## In scope, ## Out of scope). The build checks that
// each path names a chapter or page of the app and that each content page has its part, and writes it beside the pages
// at scope/ of each language tree, as its Markdown (index.md) and as a page that no menu links (index.html, noindex);
// every tutor page links it as background, so that a tutor judges an open answer by the material, not by general
// knowledge. The learner never sees it.
import { renderMarkdown } from "../shared/text/markdown.ts";
import { escape } from "../shared/html.ts";
import type { Chapter } from "./content.ts";

/** The scope in src/. */
export const SCOPE_SOURCE = "scope.md";

/** Where the build writes it, within each language tree. */
export const SCOPE_PAGE = "scope/";

/** A part of the scope: the line of its heading, its level and the path it names. */
interface ScopePart {
  line: number;
  level: number;
  path: string;
}

/** The headings that close the scope: what belongs to it and what does not, in German or English. */
const IN_SCOPE = ["Gehört dazu", "In scope"];
const OUT_OF_SCOPE = ["Gehört nicht dazu", "Out of scope"];

/** The parts of `markdown` that name a chapter or a page: `## Title (/chapter/)`, `### Title (/chapter/page/)`. */
function partsOf(markdown: string): ScopePart[] {
  return markdown.split("\n").flatMap((text, index) => {
    const match = /^(#{2,3}) .*\((\/[^)\s]*)\)\s*$/.exec(text);
    return match ? [{ line: index + 1, level: match[1]?.length ?? 0, path: match[2] ?? "" }] : [];
  });
}

/**
 * The problems of the scope `markdown` of an app with `chapters`, each with the file and line: a part that names no
 * chapter or page of the app, a content page without its part, and a missing closing part.
 */
export function scopeProblems(markdown: string, chapters: readonly Chapter[]): string[] {
  const file = `src/${SCOPE_SOURCE}`;
  const problems: string[] = [];
  const parts = partsOf(markdown);
  const chapterPaths = new Set(chapters.map((chapter) => `/${chapter.id}/`));
  const pagePaths = chapters.flatMap((chapter) => chapter.pages.map((page) => `/${chapter.id}/${page.id}/`));
  for (const part of parts) {
    const known = part.level === 2 ? chapterPaths.has(part.path) : pagePaths.includes(part.path);
    if (!known) {
      problems.push(
        `${file}:${part.line}: ${part.path} names no ${part.level === 2 ? "chapter" : "page"} of the app; write ${part.level === 2 ? "## <title> (/<chapter>/)" : "### <title> (/<chapter>/<page>/)"}`,
      );
    }
  }
  const named = new Set(parts.filter((part) => part.level === 3).map((part) => part.path));
  const missing = pagePaths.filter((path) => !named.has(path));
  if (missing.length > 0) {
    problems.push(
      `${file}: has no part for ${missing.join(", ")}; give each content page its part, ### <title> (/<chapter>/<page>/), with what the page teaches in your own words`,
    );
  }
  const headings = markdown.split("\n").flatMap((text) => {
    const match = /^## (.+?)\s*$/.exec(text);
    return match ? [match[1] ?? ""] : [];
  });
  if (
    !headings.some((heading) => IN_SCOPE.includes(heading)) ||
    !headings.some((heading) => OUT_OF_SCOPE.includes(heading))
  ) {
    problems.push(
      `${file}: ends with what belongs to the scope and what does not: ## Gehört dazu and ## Gehört nicht dazu (in English ## In scope and ## Out of scope)`,
    );
  }
  return problems;
}

/** The page of the scope in `lang`: its Markdown rendered, for no menu and no search engine. */
export function scopeDocument(markdown: string, title: string, lang: string): string {
  // a link of the scope to a page leads within the language tree, from scope/
  const body = renderMarkdown(markdown, (href) => (href.startsWith("/") ? `..${href}` : href));
  return [
    "<!doctype html>",
    `<html lang="${escape(lang)}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex">',
    `<title>${escape(title)}</title>`,
    "</head>",
    `<body><main>${body}</main></body>`,
    "</html>",
  ].join("\n");
}
