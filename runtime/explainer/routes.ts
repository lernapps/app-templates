// The pages an explainer's build writes, per language, and how they link: the start page, a page per chapter (none
// when the app has one chapter, which the navigation then hides), the content pages in the order of the lists, the
// glossary when the content defines terms, and the page of each self-assessment (assessment.ts), linked only from
// the start page or its chapter's page. German is at the root, every other language below /<language>/;
// within a language tree the addresses are the same: <chapter>/<page>/, glossar/.
import {
  allBlocks,
  inLanguage,
  termId,
  type BlockOf,
  type Chapter,
  type Page,
  type Site,
  type Text,
} from "./content.ts";
import { languageRoot } from "../shared/pages.ts";
import { message } from "./messages.ts";
import { assessments, type Assessment } from "./assessment.ts";

export interface Route {
  kind: "start" | "chapter" | "page" | "glossary" | "assessment";
  lang: string;
  /** Where the page is, from the app's root: "", "prozent/", "en/prozent/prozentwert/", "glossar/". */
  path: string;
  /** The same page's address within any language tree: "", "prozent/prozentwert/". */
  local: string;
  /** Its title, the h1. */
  title: string;
  chapter?: Chapter;
  page?: Page;
  /** The self-assessment of the page of kind assessment. */
  assessment?: Assessment;
}

/** Whether the app's one chapter is hidden in the navigation. */
export const hiddenChapter = (site: Site): boolean => site.chapters.length === 1;

/** The content pages in order, over all chapters. */
export const contentPages = (site: Site): Page[] => site.chapters.flatMap((chapter) => chapter.pages);

/** A definition of the content, where it is. */
export interface Term {
  id: string;
  term: Text;
  explanation: Text;
  page: Page;
}

export { allBlocks };

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
  const all = assessments(site);
  return site.app.languages.flatMap((lang) => {
    const root = languageRoot(lang);
    const list: Route[] = [{ kind: "start", lang, path: root, local: "", title: inLanguage(site.app.title, lang) }];
    const assessmentRoute = (assessment: Assessment): Route => ({
      kind: "assessment",
      lang,
      path: root + assessment.local,
      local: assessment.local,
      title: message(lang, "assessmentTitle"),
      ...(assessment.chapter === undefined ? {} : { chapter: assessment.chapter }),
      assessment,
    });
    for (const assessment of all.filter((candidate) => candidate.chapter === undefined)) {
      list.push(assessmentRoute(assessment));
    }
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
        for (const assessment of all.filter((candidate) => candidate.chapter === chapter)) {
          list.push(assessmentRoute(assessment));
        }
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
