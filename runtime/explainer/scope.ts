// The scope of an explainer (src/scope.md): the whole learning path for a tutor, written by the creator's assistant
// in its own words from the material, as continuous prose: one part per chapter (## <title> (/<chapter>/)) and per
// content page (### <title> (/<chapter>/<page>/)), each naming its page by its path, then what belongs to the scope and
// what does not (## Gehört dazu, ## Gehört nicht dazu; in English ## In scope, ## Out of scope). The build checks that
// each path names a chapter or page of the app and that each content page has its part. It writes a scope beside each
// content page, <chapter>/<page>/scope/: the page's part and the closing parts, with a link to its chapter's; beside
// each chapter, <chapter>/scope/: its part and its pages', with a link to the app's; and the whole at scope/. Each as
// its Markdown (index.md) and a page that no menu links (index.html, noindex). Each tutor page links its page's scope
// (../scope/), so that a tutor judges an open answer by the material, not by general knowledge, and goes up to the
// chapter or the app when a point's source is on another page. The learner never sees it.
import { renderMarkdown } from "../shared/text/markdown.ts";
import { escape } from "../shared/html.ts";
import type { Chapter } from "./content.ts";

/** The scope in src/. */
export const SCOPE_SOURCE = "scope.md";

/** The folder of a scope, below the app's root, a chapter's folder or a page's folder in each language tree. */
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

/** The scope split into its parts: what comes before the first chapter, each chapter with its pages, the closing parts. */
interface Split {
  intro: string[];
  chapters: { path: string; lines: string[]; pages: { path: string; lines: string[] }[] }[];
  closing: string[];
}

function split(markdown: string): Split {
  const result: Split = { intro: [], chapters: [], closing: [] };
  let into = result.intro;
  for (const text of markdown.split("\n")) {
    const part = /^(#{2,3}) .*\((\/[^)\s]*)\)\s*$/.exec(text);
    const closing = /^## (.+?)\s*$/.exec(text);
    if (part?.[1] === "##") {
      const chapter = { path: part[2] ?? "", lines: [text], pages: [] };
      result.chapters.push(chapter);
      into = chapter.lines;
    } else if (part?.[1] === "###") {
      const page = { path: part[2] ?? "", lines: [text] };
      result.chapters.at(-1)?.pages.push(page);
      into = page.lines;
    } else if (closing && [...IN_SCOPE, ...OUT_OF_SCOPE].includes(closing[1] ?? "")) {
      into = result.closing;
      into.push(text);
    } else into.push(text);
  }
  return result;
}

/** The words of the links to the scope one level up, by the language the closing parts are written in. */
const UP = {
  de: {
    chapter: "Alle Seiten des Kapitels: [Scope des Kapitels](../../scope/)",
    app: "Die ganze App: [Scope der App](../../scope/)",
  },
  en: {
    chapter: "All pages of the chapter: [scope of the chapter](../../scope/)",
    app: "The whole app: [scope of the app](../../scope/)",
  },
} as const;

/** A part as the top of its own scope: its heading one level up, as # heading. */
const asTop = (lines: readonly string[]) =>
  lines.map((text, index) => (index === 0 ? text.replace(/^#{2,3} /, "# ") : text));

/**
 * The scopes the build writes from `markdown`, by their folder within a language tree: "" the whole, "<chapter>/" a
 * chapter's with its pages, "<chapter>/<page>/" a page's; each but the whole with the closing parts and a link one
 * level up. A chapter's goes up to the whole, a page's to its chapter's.
 */
export function scopeFiles(markdown: string): Map<string, string> {
  const { chapters, closing } = split(markdown);
  const up = closing.some((text) => /^## In scope\s*$/.test(text)) ? UP.en : UP.de;
  const join = (...parts: (readonly string[])[]) =>
    parts
      .map((lines) => lines.join("\n").trim())
      .filter((text) => text !== "")
      .join("\n\n") + "\n";
  const files = new Map<string, string>([["", markdown]]);
  for (const chapter of chapters) {
    const folder = chapter.path.slice(1);
    // its pages one level up, under the chapter as # heading, beside the closing parts
    const pages = chapter.pages.map((page) =>
      page.lines.map((text, index) => (index === 0 ? text.replace(/^### /, "## ") : text)),
    );
    files.set(folder, join(asTop(chapter.lines), ...pages, closing, [up.app]));
    for (const page of chapter.pages) files.set(page.path.slice(1), join(asTop(page.lines), closing, [up.chapter]));
  }
  return files;
}

/** The page of the scope in `folder` (as scopeFiles names it) in `lang`: its Markdown rendered, for no menu and no search engine. */
export function scopeDocument(markdown: string, title: string, lang: string, folder = ""): string {
  // a link of the scope to a page leads within the language tree, from <folder>scope/
  const depth = folder.split("/").filter((segment) => segment !== "").length + 1;
  const body = renderMarkdown(markdown, (href) =>
    href.startsWith("/") ? `${"../".repeat(depth)}${href.slice(1)}` : href,
  );
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
