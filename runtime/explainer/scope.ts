// The scope of an explainer, for the tutor: the whole learning path in the creator's own words, from the material, as
// continuous prose. Each content page says what it teaches (`scope` in its YAML), a chapter may say what it is about as
// a whole, and src/app.yaml says what the app is about and what belongs to the scope and what does not (`scope: { text,
// in, out }`); with the app's, every page has its own (load.ts checks it). The build writes, in each language tree, a
// scope beside each content page, <chapter>/<page>/scope/: the page's text and what belongs to the scope and what does
// not, with a link to its chapter's; beside each chapter, <chapter>/scope/: its text and its pages', with a link to
// the app's; and the whole at scope/. Each as its Markdown (index.md) and a page that no menu links (index.html,
// noindex). Each tutor page links its page's scope (../scope/), so that a tutor judges an open answer by the material,
// not by general knowledge, and goes up to the chapter or the app when a point's source is on another page. The
// learner never sees it.
import { renderMarkdown } from "../shared/text/markdown.ts";
import { escape } from "../shared/html.ts";
import { inLanguage, type Site, type Text } from "./content.ts";

/** The folder of a scope, below the app's root, a chapter's folder or a page's folder in each language tree. */
export const SCOPE_PAGE = "scope/";

/** The words of a scope by language: its closing parts and the links one level up. */
const WORDS = {
  de: {
    in: "Gehört dazu",
    out: "Gehört nicht dazu",
    chapter: "Alle Seiten des Kapitels: [Scope des Kapitels](../../scope/)",
    app: "Die ganze App: [Scope der App](../../scope/)",
  },
  en: {
    in: "In scope",
    out: "Out of scope",
    chapter: "All pages of the chapter: [scope of the chapter](../../scope/)",
    app: "The whole app: [scope of the app](../../scope/)",
  },
} as const;

/**
 * The scopes the build writes for `site` in `lang`, by their folder within the language tree: "" the whole,
 * "<chapter>/" a chapter's with its pages, "<chapter>/<page>/" a page's; each but the whole with a link one level up.
 * None when the app has no scope.
 */
export function scopeFiles(site: Site, lang: string): Map<string, string> {
  const files = new Map<string, string>();
  const { scope } = site.app;
  if (scope === undefined) return files;
  const words = lang === "de" ? WORDS.de : WORDS.en;
  const own = (text: Text | undefined) => (text === undefined ? "" : inLanguage(text, lang).trim());
  const closing = [
    `## ${words.in}`,
    scope.in.map((item) => `- ${own(item)}`).join("\n"),
    `## ${words.out}`,
    scope.out.map((item) => `- ${own(item)}`).join("\n"),
  ];
  const join = (...parts: string[]) => `${parts.filter((part) => part !== "").join("\n\n")}\n`;
  const whole: string[] = [`# ${own(site.app.title)}`, own(scope.text)];
  for (const chapter of site.chapters) {
    const pages = chapter.pages.map((page) => ({ page, title: own(page.title), text: own(page.scope) }));
    whole.push(`## ${own(chapter.title)}`, own(chapter.scope));
    for (const { title, text } of pages) whole.push(`### ${title}`, text);
    files.set(
      `${chapter.id}/`,
      join(
        `# ${own(chapter.title)}`,
        own(chapter.scope),
        ...pages.flatMap(({ title, text }) => [`## ${title}`, text]),
        ...closing,
        words.app,
      ),
    );
    for (const { page, title, text } of pages) {
      files.set(`${chapter.id}/${page.id}/`, join(`# ${title}`, text, ...closing, words.chapter));
    }
  }
  files.set("", join(...whole, ...closing));
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
