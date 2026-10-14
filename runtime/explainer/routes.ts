// The pages an explainer's build writes, per language, and how they link: the start page, a page per chapter (none
// when the app has one chapter, which the navigation then hides), the content pages in the order of the lists, and
// the glossary when the content defines terms. German is at the root, every other language below /<language>/;
// within a language tree the addresses are the same: <chapter>/<page>/, glossar/.
import {
  inLanguage,
  termId,
  type BlockOf,
  type Block,
  type Chapter,
  type Page,
  type Site,
  type Text,
} from "./content.ts";
import { message } from "./messages.ts";

export interface Route {
  kind: "start" | "chapter" | "page" | "glossary";
  lang: string;
  /** Where the page is, from the app's root: "", "prozent/", "en/prozent/prozentwert/", "glossar/". */
  path: string;
  /** The same page's address within any language tree: "", "prozent/prozentwert/". */
  local: string;
  /** Its title, the h1. */
  title: string;
  chapter?: Chapter;
  page?: Page;
}

/** The root of a language's tree, from the app's root. */
export const languageRoot = (lang: string): string => (lang === "de" ? "" : `${lang}/`);

/** Whether the app's one chapter is hidden in the navigation. */
export const hiddenChapter = (site: Site): boolean => site.chapters.length === 1;

/** A relative URL from the page at `from` to `to` (both from the app's root). */
export function relative(from: string, to: string): string {
  const up = "../".repeat(from.split("/").filter((part) => part !== "").length);
  const url = `${up}${to}`;
  return url === "" ? "./" : url.startsWith("#") ? `./${url}` : url;
}

/** The content pages in order, over all chapters. */
export const contentPages = (site: Site): Page[] => site.chapters.flatMap((chapter) => chapter.pages);

/** A definition of the content, where it is. */
export interface Term {
  id: string;
  term: Text;
  explanation: Text;
  page: Page;
}

/** Every block of `blocks`, depth first, with the blocks inside sections and boxes. */
export function* allBlocks(blocks: readonly Block[]): Generator<Block> {
  for (const block of blocks) {
    yield block;
    if (block.type === "section" || block.type === "example" || block.type === "note") yield* allBlocks(block.blocks);
  }
}

/** The terms the content defines, in the order of the pages. */
export function terms(site: Site): Term[] {
  return contentPages(site).flatMap((page) =>
    [...allBlocks(page.blocks)]
      .filter((block): block is BlockOf<"definition"> => block.type === "definition")
      .map((block) => ({ id: termId(block.term), term: block.term, explanation: block.explanation, page })),
  );
}

/** Every page of the app, in every language. */
export function routes(site: Site): Route[] {
  const hidden = hiddenChapter(site);
  const glossary = terms(site).length > 0;
  return site.app.languages.flatMap((lang) => {
    const root = languageRoot(lang);
    const list: Route[] = [{ kind: "start", lang, path: root, local: "", title: inLanguage(site.app.title, lang) }];
    for (const chapter of site.chapters) {
      if (!hidden) {
        const local = `${chapter.id}/`;
        list.push({
          kind: "chapter",
          lang,
          path: root + local,
          local,
          title: inLanguage(chapter.title, lang),
          chapter,
        });
      }
      for (const page of chapter.pages) {
        const local = `${chapter.id}/${page.id}/`;
        list.push({
          kind: "page",
          lang,
          path: root + local,
          local,
          title: inLanguage(page.title, lang),
          chapter,
          page,
        });
      }
    }
    if (glossary) {
      list.push({
        kind: "glossary",
        lang,
        path: `${root}glossar/`,
        local: "glossar/",
        title: message(lang, "glossary"),
      });
    }
    return list;
  });
}
