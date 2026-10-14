// What the pages of an explainer must show, from its content in src/ (not from the rendered pages), for its end-to-end
// tests: per language, the content pages in order with their headings by nesting (page h1, section h2, subsection h3,
// a box one level below the heading it is under), their sections with their anchors, the number of formulas and the
// name of every figure; and the other pages (start, chapters, glossary) with their titles.
import { inLanguage, timelineEvents, type Block, type Site, type Text } from "./content.ts";
import { loadSite } from "./load.ts";
import { inspect } from "./markdown.ts";
import { routes } from "./routes.ts";

export interface PageOutline {
  /** Where the page is, from the app's root: "prozent/prozentwert/", "en/prozent/prozentwert/". */
  url: string;
  lang: string;
  title: string;
  headings: { level: number; text: string }[];
  sections: { id: string; title: string }[];
  formulas: number;
  figures: string[];
}

export interface Outline {
  languages: readonly string[];
  /** The content pages of each language, in the order of the lists. */
  pages: Readonly<Record<string, PageOutline[]>>;
  /** The start page, the chapter pages and the glossary of each language. */
  others: Readonly<Record<string, PageOutline[]>>;
}

/** The headings, sections, formulas and figures of `blocks` in `lang`, under a heading of level `level`. */
function walk(
  site: Site,
  blocks: readonly Block[],
  lang: string,
  level: number,
  anchor: string[],
  into: PageOutline,
): void {
  const text = (value: Text) => inLanguage(value, lang);
  const formulas = (value: Text | undefined) => {
    if (value !== undefined) into.formulas += inspect(text(value)).formulas.length;
  };
  for (const block of blocks) {
    switch (block.type) {
      case "section": {
        const id = [...anchor, block.id].join("/");
        into.headings.push({ level: level + 1, text: text(block.title) });
        into.sections.push({ id, title: text(block.title) });
        walk(site, block.blocks, lang, level + 1, [...anchor, block.id], into);
        break;
      }
      case "example":
      case "note":
        into.headings.push({ level: level + 1, text: text(block.title) });
        walk(site, block.blocks, lang, level + 1, anchor, into);
        break;
      case "text":
        formulas(block.text);
        break;
      case "formula":
        into.formulas += 1;
        break;
      case "figure":
        into.figures.push(text(block.alt));
        formulas(block.caption);
        break;
      case "labelled-figure":
        into.figures.push(text(block.alt));
        formulas(block.caption);
        break;
      case "table":
        for (const cell of [...(block.header ?? []), ...block.rows.flat()]) formulas(cell);
        break;
      case "timeline":
        for (const event of timelineEvents(site, block)) formulas(event.text);
        break;
      case "definition":
        formulas(block.explanation);
        break;
      case "quote":
        formulas(block.text);
        break;
      case "code":
        break;
    }
  }
}

/** The outline of the explainer whose content is in `root`/src. */
export function outline(root = "."): Outline {
  const site = loadSite(root);
  const pages: Record<string, PageOutline[]> = {};
  const others: Record<string, PageOutline[]> = {};
  for (const route of routes(site)) {
    const item: PageOutline = {
      url: route.path,
      lang: route.lang,
      title: route.title,
      headings: [{ level: 1, text: route.title }],
      sections: [],
      formulas: 0,
      figures: [],
    };
    if (route.page === undefined) (others[route.lang] ??= []).push(item);
    else {
      walk(site, route.page.blocks, route.lang, 1, [], item);
      (pages[route.lang] ??= []).push(item);
    }
  }
  return { languages: site.app.languages, pages, others };
}
