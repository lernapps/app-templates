// What the pages of an explainer must show, from its content in src/ (not from the rendered pages), for its end-to-end
// tests: per language, the content pages in order with their headings by nesting (page h1, section h2, subsection h3,
// a box one level below the heading it is under), their sections with their anchors, the number of formulas and the
// name of every figure, its videos, its exercises with what each must accept, and its components with their nojs text; and the
// other pages (start, chapters, glossary, self-assessments) with their titles.
import { questionIn, type Question } from "../shared/questions/question.ts";
import { answerText } from "../shared/questions/render.ts";
import { inLanguage, timelineEvents, type Block, type ComponentExample, type Site, type Text } from "./content.ts";
import { dataOf, renderExercise, templatesOf, workedTasks } from "./exercises.ts";
import { kindOf } from "./generated/comparator.ts";
import { plainText } from "./generated/texts.ts";
import { type Data, type Generated, type Templates } from "./generated/types.ts";
import { loadSite } from "./load.ts";
import { inspect, renderMarkdown } from "../shared/text/markdown.ts";
import { routes } from "./routes.ts";
import { assessments, titleOf } from "./assessment.ts";

export interface PageOutline {
  /** What page it is: the start page, a chapter, a content page, the glossary, a self-assessment. */
  kind: "start" | "chapter" | "page" | "glossary" | "assessment";
  /** Where the page is, from the app's root: "prozent/prozentwert/", "en/prozent/prozentwert/". */
  url: string;
  lang: string;
  title: string;
  headings: { level: number; text: string }[];
  sections: { id: string; title: string }[];
  formulas: number;
  figures: string[];
  /** The videos, in order: each shows its title, channel and link without JavaScript, its player only after a click. */
  videos: { youtube: string; title: string; channel: string }[];
  exercises: ExerciseOutline[];
  /** The vue-component blocks, in order. */
  components: ComponentOutline[];
}

/** A vue-component block of a page, in the page's language. */
export interface ComponentOutline {
  name: string;
  /** Its anchor, for an exercise component. */
  id?: string;
  /** Its own nojs text, as plain text; empty when it has none (an exercise component's no-JS task comes from describe). */
  nojs: string;
  /** Whether it emits answer, an exercise. */
  exercise: boolean;
  /** Whether it keeps its nojs text, folded as a text description, once it runs. */
  caption: boolean;
  /** For an exercise component: its block's first accepted and first rejected example, for "Prüfen". */
  examples?: { accepted?: ComponentExample; rejected?: ComponentExample };
}

/** An exercise of a page, in the page's language: what it shows and what it accepts. */
export type ExerciseOutline =
  | {
      kind: "question";
      id: string;
      /** The exercise's type, one per kind of controls: the question type. */
      type: string;
      question: Question;
      /** The right answer as its "Lösung" states it: each right option, or the answer. */
      answers: string[];
    }
  | {
      kind: "generated";
      id: string;
      /** generated, with the comparator's kind: generated:number, generated:order, … */
      type: string;
      spec: Generated;
      data: Data;
      templates: Templates;
      /** The worked tasks without JavaScript: the task's text and the right answer as its "Lösung" states it. */
      worked: { task: string; answer: string }[];
    }
  | {
      kind: "open";
      id: string;
      type: "open-task";
      /** The task as plain text. */
      task: string;
      /** How the learner may answer. */
      answer: readonly ("text" | "photo")[];
      /** The points of a good answer, as plain text, and whether each has a source to read up. */
      points: { text: string; source: boolean }[];
      /** The model answer as plain text, in the pieces between its formulas (which a reader reads otherwise). */
      solution: string[];
    };

/** A self-assessment (assessment.ts), in German: where it is offered, and its exercises by the content pages' outline. */
export interface AssessmentOutline {
  /** Its page and the page that offers it, from the app's root: "einschaetzung/" and "", "formen/einschaetzung/" and "formen/". */
  url: string;
  offer: string;
  /** The key its last result is kept under on the device, without the app's prefix. */
  key: string;
  steps: number;
  /** Its exercises in order: the key, its page of the self-assessment, the content page and the exercise's id there. */
  items: { key: string; step: number; page: string; id: string }[];
  /** The content pages it says something about, in order, each with its title and how many of its exercises it asks. */
  pages: { url: string; title: string; asked: number }[];
}

export interface Outline {
  languages: readonly string[];
  /** The content pages of each language, in the order of the lists. */
  pages: Readonly<Record<string, PageOutline[]>>;
  /** The start page, the chapter pages, the glossary and the self-assessments of each language. */
  others: Readonly<Record<string, PageOutline[]>>;
  /** The self-assessments, in German. */
  assessments: AssessmentOutline[];
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
      case "video":
        into.videos.push({ youtube: block.youtube, title: block.title, channel: block.channel });
        break;
      case "vue-component": {
        const use = site.components.find((candidate) => candidate.block === block);
        const nojs = block.nojs === undefined ? "" : text(block.nojs);
        into.formulas += inspect(nojs).formulas.length;
        into.components.push({
          name: block.component,
          ...(use?.id === undefined ? {} : { id: use.id }),
          nojs: plainText(renderMarkdown(nojs, (href) => href)),
          exercise: use?.component.exercise ?? false,
          caption: use?.component.caption ?? false,
          ...(use?.component.exercise && block.examples !== undefined
            ? {
                examples: {
                  ...(block.examples.accepted?.[0] === undefined ? {} : { accepted: block.examples.accepted[0] }),
                  ...(block.examples.rejected?.[0] === undefined ? {} : { rejected: block.examples.rejected[0] }),
                },
              }
            : {}),
        });
        break;
      }
      case "generated": {
        const data = dataOf(block, site.data);
        const templates = templatesOf(block, [lang]);
        const worked = workedTasks(block, data, templates, lang);
        for (const item of worked) {
          for (const html of [item.task, item.hint ?? "", ...item.steps])
            into.formulas += html.split("<math").length - 1;
        }
        into.exercises.push({
          kind: "generated",
          id: block.id,
          type: `generated:${kindOf(block.answer.compare).kind}`,
          spec: block,
          data,
          templates,
          worked: worked.map((item) => ({ task: plainText(item.task), answer: plainText(item.answer) })),
        });
        break;
      }
      case "open-task": {
        // the formulas of its task, hint and model answer, as the page renders them
        const html = renderExercise(block, lang, site.data, (href) => href, { lang, href: (image) => image });
        into.formulas += (html.split('<script type="application/json"')[0] ?? "").split("<math").length - 1;
        into.exercises.push({
          kind: "open",
          id: block.id,
          type: "open-task",
          task: plainText(renderMarkdown(inLanguage(block.task, lang), (href) => href)),
          answer: block.answer ?? ["text", "photo"],
          points: block.points.map((point) => ({
            text: inLanguage(point.text, lang),
            source: point.source !== undefined,
          })),
          solution: inLanguage(block.solution, lang)
            .split(/\$[^$]+\$/)
            .map((piece) =>
              plainText(renderMarkdown(piece, (href) => href))
                .replace(/\s+/g, " ")
                .trim(),
            )
            .filter((piece) => piece !== ""),
        });
        break;
      }
      default: {
        // the formulas in the texts of a question (question, options, background, explanation) are rendered, and the
        // page shows some of them more than once: count what the renderer writes, not the texts
        const html = renderExercise(block, lang, site.data, (href) => href, { lang, href: (image) => image });
        into.formulas += (html.split('<script type="application/json"')[0] ?? "").split("<math").length - 1;
        const question = questionIn(block, lang);
        into.exercises.push({
          kind: "question",
          id: block.id,
          type: block.type,
          question,
          answers:
            question.type === "single-choice" || question.type === "multiple-choice"
              ? question.options.filter((option) => option.correct).map((option) => option.text)
              : [plainText(answerText(question, lang))],
        });
      }
    }
  }
}

/** The outline of the explainer whose content is in `root`/src. */
export function outline(root = "."): Outline {
  // the build has run the property tests of the generated exercises
  const site = loadSite(root, 0);
  const pages: Record<string, PageOutline[]> = {};
  const others: Record<string, PageOutline[]> = {};
  for (const route of routes(site)) {
    const item: PageOutline = {
      kind: route.kind,
      url: route.path,
      lang: route.lang,
      title: route.title,
      headings: [{ level: 1, text: route.title }],
      sections: [],
      formulas: 0,
      figures: [],
      videos: [],
      exercises: [],
      components: [],
    };
    if (route.page === undefined) (others[route.lang] ??= []).push(item);
    else {
      walk(site, route.page.blocks, route.lang, 1, [], item);
      (pages[route.lang] ??= []).push(item);
    }
  }
  const asked = assessments(site).map((assessment) => ({
    url: assessment.local,
    offer: assessment.chapter === undefined ? "" : `${assessment.chapter.id}/`,
    key: assessment.key,
    steps: assessment.steps,
    items: assessment.items.map((item) => ({
      key: item.key,
      step: item.step,
      page: `${item.page.chapter}/${item.page.id}/`,
      id: item.exercise,
    })),
    pages: assessment.pages.map((page) => ({
      url: `${page.chapter}/${page.id}/`,
      title: titleOf(page, "de"),
      asked: assessment.items.filter((item) => item.page === page).length,
    })),
  }));
  return { languages: site.app.languages, pages, others, assessments: asked };
}
