// The self-assessment of an explainer (selfAssessment in a chapter.yaml): before learning, the learner may answer
// exercises of the content pages, a few on each of its own pages, without the page around them and without a check of
// any single one. A chapter declares its own; the app's is every chapter's in the order of the chapters, offered on the
// start page, and a chapter's is offered on its page (in an app with one chapter, the app's is the chapter's). Only at the end are they checked, all together, and the result says for each content page
// in its scope (the whole app, or one chapter) whether the learner probably knows it already, should look at it again
// or should read it; a page with no exercise in the self-assessment is not asked. It runs with JavaScript only
// (assessment-client.ts); without it the offer stays hidden. The last result stays on the device, one per
// self-assessment (@lernapps/tooling/storage), and a new start replaces it. The app sends nothing: the learner may take
// the result to a KI tutor with a click, as the address of the self-assessment's tutor page (assessment-page.ts) with
// the result in its query, ?a1=17-falsch-F1&a2=richtig, and the lines of the prompt. Pure and without Node: the client
// module calls it too.
import { allBlocks, inLanguage, isExercise, type Chapter, type Exercise, type Page, type Site } from "./content.ts";
import { message } from "./messages.ts";

/** The folder of a self-assessment: einschaetzung/ for the app, <chapter>/einschaetzung/ for a chapter. */
export const ASSESSMENT = "einschaetzung";

/** The address of a self-assessment within its language tree: of the app, or of the chapter `chapter`. */
export const assessmentPathOf = (chapter?: string): string =>
  chapter === undefined ? `${ASSESSMENT}/` : `${chapter}/${ASSESSMENT}/`;

/** The key its last result is kept under on the device. */
export const assessmentKeyOf = (chapter?: string): string =>
  chapter === undefined ? "self-assessment" : `self-assessment:${chapter}`;

/** An exercise of a self-assessment, where it comes from and on which of its pages it is. */
export interface AssessmentItem {
  /** Its name in the result and on the tutor page: a1, a2, … in order. */
  key: string;
  /** /<chapter>/<page>/#<exercise>, as the content names it. */
  ref: string;
  page: Page;
  block: Exercise;
  /** The index of its page in the self-assessment, from 0. */
  step: number;
}

/** A self-assessment of the app or of one chapter, with its exercises resolved. */
export interface Assessment {
  /** The chapter it belongs to; none for the app's. */
  chapter?: Chapter;
  /** Its address within the language tree. */
  local: string;
  /** The key its last result is kept under on the device. */
  key: string;
  /** The content pages it says something about, in order: the app's, or the chapter's. */
  pages: readonly Page[];
  items: readonly AssessmentItem[];
  /** How many pages it has. */
  steps: number;
}

/** The parts of an exercise's reference /<chapter>/<page>/#<exercise>, if it has that shape. */
export function parseRef(ref: string): { chapter: string; page: string; exercise: string } | undefined {
  const match = /^\/([a-z0-9-]+)\/([a-z0-9-]+)\/#([a-z0-9-]+)$/.exec(ref);
  return match === null ? undefined : { chapter: match[1] ?? "", page: match[2] ?? "", exercise: match[3] ?? "" };
}

/** The exercise of `page` with the id `id`: a question of the question types, or generated; none for anything else. */
export function exerciseOf(page: Page, id: string): Exercise | undefined {
  for (const block of allBlocks(page.blocks)) {
    if (isExercise(block) && block.id === id) return block;
  }
  return undefined;
}

/** The self-assessments of a valid site, the app's first, then each chapter's in order. */
export function assessments(site: Site): Assessment[] {
  const of = (
    source: { pages: readonly { exercises: readonly string[] }[] },
    pages: readonly Page[],
    chapter?: Chapter,
  ): Assessment => {
    const items: AssessmentItem[] = [];
    source.pages.forEach((step, index) => {
      for (const ref of step.exercises) {
        const parts = parseRef(ref);
        const page = pages.find((candidate) => candidate.chapter === parts?.chapter && candidate.id === parts.page);
        const block = page === undefined || parts === undefined ? undefined : exerciseOf(page, parts.exercise);
        // the build checked every reference
        if (page === undefined || block === undefined) continue;
        items.push({ key: `a${items.length + 1}`, ref, page, block, step: index });
      }
    });
    return {
      ...(chapter === undefined ? {} : { chapter }),
      local: assessmentPathOf(chapter?.id),
      key: assessmentKeyOf(chapter?.id),
      pages,
      items,
      steps: source.pages.length,
    };
  };
  // the app's: the pages of every chapter's, in the order of the chapters
  const steps = site.chapters.flatMap((chapter) => chapter.selfAssessment?.pages ?? []);
  if (steps.length === 0) return [];
  const all = site.chapters.flatMap((chapter) => chapter.pages);
  // a chapter's of its own only where the app shows its chapters: with one chapter, the app's is the chapter's
  const own = site.chapters.length === 1 ? [] : site.chapters;
  return [
    of({ pages: steps }, all),
    ...own.flatMap((chapter) =>
      chapter.selfAssessment === undefined ? [] : [of(chapter.selfAssessment, chapter.pages, chapter)],
    ),
  ];
}

/** The self-assessment of the app (no chapter) or of the chapter `chapter`, if it has one. */
export const assessmentOf = (site: Site, chapter?: string): Assessment | undefined =>
  assessments(site).find((assessment) => assessment.chapter?.id === chapter);

/** The fewest and the most exercises a page of a self-assessment should show. */
export const STEP_SIZE = { min: 2, max: 5 } as const;

/**
 * The note of the build on the pages of the chapters' self-assessments with fewer or more exercises than STEP_SIZE,
 * each by its file and place, or none: a hint, no problem.
 */
export function stepHint(site: Site): string | undefined {
  const off = site.chapters.flatMap((chapter) =>
    (chapter.selfAssessment?.pages ?? []).flatMap((step, index) => {
      const count = step.exercises.length;
      return count < STEP_SIZE.min || count > STEP_SIZE.max
        ? [`src/${chapter.id}/chapter.yaml: selfAssessment.pages[${index}] (${count})`]
        : [];
    }),
  );
  if (off.length === 0) return undefined;
  return `lernapps explainer: ${off.length} page${off.length === 1 ? "" : "s"} of a self-assessment show${off.length === 1 ? "s" : ""} fewer than ${STEP_SIZE.min} or more than ${STEP_SIZE.max} exercises: ${off.join(", ")}`;
}

// What the browser keeps and shows of one run.

/** What became of one exercise of a run: its task number, right, wrong or open (not answered), the input and the mistake. */
export interface ItemResult {
  key: string;
  /** The exercise it was, /<chapter>/<page>/#<exercise>: a kept result whose exercise moved does not count. */
  ref: string;
  /** The task number of a generated exercise. */
  number?: number;
  state: "richtig" | "falsch" | "offen";
  /** The input as text, for a wrong answer. */
  input?: string;
  /** The typical mistake it matches, from 1 (F1), for a wrong answer of a generated exercise. */
  mistake?: number;
}

/** The last run of a self-assessment, as it stays on the device. */
export interface StoredResult {
  version: 1;
  items: ItemResult[];
}

const STATES: readonly string[] = ["richtig", "falsch", "offen"];

/** Whether `value` is a result as the device keeps it. */
export function isStoredResult(value: unknown): value is StoredResult {
  if (typeof value !== "object" || value === null) return false;
  const { version, items } = value as Partial<StoredResult>;
  return (
    version === 1 &&
    Array.isArray(items) &&
    items.every(
      (item: Partial<ItemResult>) =>
        typeof item === "object" &&
        typeof item.key === "string" &&
        typeof item.ref === "string" &&
        STATES.includes(String(item.state)) &&
        (item.number === undefined || Number.isInteger(item.number)) &&
        (item.input === undefined || typeof item.input === "string") &&
        (item.mistake === undefined || Number.isInteger(item.mistake)),
    )
  );
}

/** How a content page did: known, partly, to read; not asked when no exercise of it was in the self-assessment. */
export type Band = "known" | "partly" | "read" | "unasked";

/** A content page in the result: the exercises of it that were asked, and how many of them were right. */
export interface PageResult {
  /** <chapter>/<page>/, within the language tree. */
  page: string;
  right: number;
  total: number;
  band: Band;
}

/** The words of each band, as the result shows them. */
export const BAND_MESSAGES = {
  known: "assessmentKnown",
  partly: "assessmentPartly",
  read: "assessmentRead",
  unasked: "assessmentUnasked",
} as const;

/**
 * The band of `right` of `total`: all right of two or more, at least half, less; not asked for none. One task alone is
 * too little to say a page is known: right, it is "partly".
 */
export function bandOf(right: number, total: number): Band {
  if (total === 0) return "unasked";
  if (right === total && total >= 2) return "known";
  return right * 2 >= total ? "partly" : "read";
}

/**
 * The result of each content page in `pages` (each <chapter>/<page>/, in order), from the results of a run and the page
 * each exercise is from (`pageOf`, by key); an exercise the content no longer has does not count.
 */
export function pageResults(
  pages: readonly string[],
  pageOf: Readonly<Record<string, string>>,
  results: readonly ItemResult[],
): PageResult[] {
  return pages.map((page) => {
    const asked = results.filter((result) => pageOf[result.key] === page);
    const right = asked.filter((result) => result.state === "richtig").length;
    return { page, right, total: asked.length, band: bandOf(right, asked.length) };
  });
}

/** The value of one exercise in the query of the tutor page: 17-falsch-F1, richtig, 3-offen. */
export function resultValue(result: ItemResult): string {
  return [
    ...(result.number === undefined ? [] : [String(result.number)]),
    result.state,
    ...(result.state === "falsch" && result.mistake !== undefined ? [`F${result.mistake}`] : []),
  ].join("-");
}

/** The query of the tutor page with a run's results: ?a1=17-falsch-F1&a2=richtig. */
export function resultQuery(results: readonly ItemResult[]): string {
  const query = new URLSearchParams();
  for (const result of results) query.set(result.key, resultValue(result));
  const text = query.toString();
  return text === "" ? "" : `?${text}`;
}

/** What the prompt of a run says about one exercise: its key, its page's title, its id and its task number. */
export interface PromptItem {
  key: string;
  page: string;
  exercise: string;
}

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * The prompt that takes a run to a tutor, in `lang`, in the learner's voice: the tutor page with the results in its
 * address first, then the result of each content page as the learner saw it (its title in `pages`), so that the tutor
 * works nothing out, then one line per exercise (its page, the exercise, its task number, how it went, the input of a
 * wrong one). The solution is never in it. `back`: for a chat that runs already (von=tutor), the lines with the tutor
 * page last, which "Zurück zum Tutor" copies.
 */
export function assessmentPrompt(
  tutor: string,
  items: readonly PromptItem[],
  results: readonly ItemResult[],
  lang: string,
  pages: readonly (PageResult & { title: string })[] = [],
  opening: "ask" | "back" = "ask",
): string {
  const bands = pages.map((page) =>
    page.band === "unasked"
      ? `- ${message(lang, "assessmentPageUnasked", { page: oneLine(page.title) })}`
      : `- ${message(lang, "assessmentPageLine", {
          page: oneLine(page.title),
          band: message(lang, BAND_MESSAGES[page.band]),
          right: String(page.right),
          total: String(page.total),
        })}`,
  );
  const lines = results.map((result) => {
    const item = items.find((candidate) => candidate.key === result.key);
    const state = message(
      lang,
      result.state === "richtig" ? "assessmentRight" : result.state === "falsch" ? "assessmentWrong" : "assessmentOpen",
    );
    const input =
      result.state === "falsch" && result.input !== undefined
        ? ` ${message(lang, "assessmentInput", { input: oneLine(result.input) })}`
        : "";
    return `- ${message(lang, "assessmentLine", {
      key: result.key.toUpperCase(),
      page: oneLine(item?.page ?? ""),
      exercise: item?.exercise ?? "",
      number: result.number === undefined ? "" : message(lang, "resultNumber", { n: String(result.number) }),
      state,
    })}${input}`;
  });
  // back to a running chat: the result first, the tutor page last, as the result line of a page has it
  if (opening === "back") {
    return [
      message(lang, "assessmentBackLine"),
      ...bands,
      message(lang, "assessmentTasks"),
      ...lines,
      `${message(lang, "resultTutor")} ${tutor}`,
    ].join("\n");
  }
  return [
    message(lang, "assessmentAsk", { url: tutor }),
    ...bands,
    ...(bands.length === 0 ? [] : [message(lang, "assessmentTasks")]),
    ...lines,
  ].join("\n");
}

/** The title of a content page in `lang`, on one line. */
export const titleOf = (page: Page, lang: string): string => oneLine(inLanguage(page.title, lang));
