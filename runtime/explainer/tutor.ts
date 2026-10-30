// What a KI tutor reads of an explainer's content, shared by the tutor page of each content page (tutorpage.ts), the
// one source of what the tutor gets: the page's content as Markdown lines (contentLines), each exercise by its id,
// type and what the learner does, answers and is told (exercisePart), the words of both, and the check of their
// links against the pages and anchors the build writes (linkProblems). A chat assistant that fetches a URL runs no
// JavaScript, and a static host serves the same file for any query string: so all of it is static text. The app
// itself collects nothing and sends nothing: the tutor page only helps a tutor guide.
import { markerOf } from "../shared/blocks/block.ts";
import { questionIn, type Question } from "../shared/questions/question.ts";
import { answerText } from "../shared/questions/render.ts";
import {
  inLanguage,
  timelineEvents,
  type Block,
  type BlockOf,
  type ComponentDescription,
  type Page,
  type Site,
  type Text,
  type Descriptions,
  type OpenTask,
} from "./content.ts";
import { plainText } from "./generated/texts.ts";
import { kindOf } from "./generated/comparator.ts";
import { type Generated } from "./generated/types.ts";
import { allBlocks } from "./routes.ts";
import { videoLine } from "./video.ts";

interface Words {
  task: string;
  answerFormat: string;
  solution: string;
  explanation: string;
  hint: string;
  mistakes: string;
  /** The typical mistakes of an exercise component: descriptions for the tutor, not the app's messages. */
  componentMistakes: string;
  options: string;
  right: string;
  wrong: string;
  component: string;
  does: string;
  correct: string;
  example: string;
  note: string;
  figure: string;
  caption: string;
  labels: string;
  interactive: string;
  video: string;
  exerciseHere: string;
  /** An open task: its points, the model answer, the ways to answer, how to help. */
  points: string;
  pointContent: string;
  pointForm: string;
  source: string;
  modelAnswer: string;
  answerWays: Record<"text" | "photo" | "both", string>;
  openGuide: string;
  formats: Record<string, string>;
}

const WORDS: Readonly<Record<string, Words>> = {
  de: {
    task: "Aufgabe",
    answerFormat: "Antwortformat",
    solution: "Lösung",
    explanation: "Erklärung",
    hint: "Tipp der App",
    mistakes: "Typische Fehler und was die App sagt",
    componentMistakes: "Typische Fehler (die Meldung der App passt zu einem davon)",
    options: "Antworten zur Wahl (✓ richtig, ✗ falsch, mit der Meldung der App)",
    right: "✓",
    wrong: "✗",
    component: "interaktive Übung",
    does: "Was zu tun ist",
    correct: "Was als richtig zählt",
    example: "Beispiel",
    note: "Merke",
    figure: "Bild",
    caption: "Bildunterschrift",
    labels: "Beschriftungen",
    interactive: "Interaktiv",
    video: "Video",
    exerciseHere: "Übung `{id}` (unten)",
    points: "Eine gute Antwort enthält (P1, P2 … wie die App sie nennt)",
    pointContent: "Inhalt",
    pointForm: "Form",
    source: "Quelle",
    modelAnswer: "Musterantwort",
    answerWays: {
      text: "in eigenen Worten eintippen",
      photo: "in eigenen Worten auf Papier schreiben und das Blatt fotografieren",
      both: "in eigenen Worten eintippen oder auf Papier schreiben und das Blatt fotografieren",
    },
    openGuide:
      "So hilfst du: Die App zeigt die Punkte erst nach der Antwort; das Kind hakt selbst ab, welche seine Antwort enthält, und „es fehlen P2, P4“ nennt die anderen. Fehlt dir die Antwort, bitte das Kind, sie einzufügen oder das Foto seines Blatts anzuhängen. Prüf Punkt für Punkt, auch die abgehakten, und sag zuerst, was gelungen ist. Zu einem fehlenden Punkt stell eine Frage, die dorthin führt, und nenn seine Quelle. Verrate die Musterantwort nicht, bevor das Kind es noch einmal versucht hat. Zu einem Punkt der Form zeig an einem Satz des Kindes, wie es besser geht.",
    formats: {
      "single-choice": "eine Antwort wählen",
      "multiple-choice": "alle richtigen Antworten wählen",
      "true-false": "„Stimmt“ oder „Stimmt nicht“ wählen",
      number: "eine Zahl eintippen",
      ordering: "die Einträge in die richtige Reihenfolge bringen (die App zeigt sie gemischt)",
      matching: "jedem Eintrag links den passenden rechts zuordnen",
      choice: "eine Antwort wählen",
      set: "alle richtigen Antworten wählen",
      order: "die Einträge in die richtige Reihenfolge bringen (die App zeigt sie gemischt)",
      pairs: "jedem Eintrag links den passenden rechts zuordnen",
    },
  },
  en: {
    task: "Task",
    answerFormat: "Answer format",
    solution: "Solution",
    explanation: "Explanation",
    hint: "The app's hint",
    mistakes: "Typical mistakes and what the app says",
    componentMistakes: "Typical mistakes (the app's message fits one of them)",
    options: "Choices (✓ right, ✗ wrong, with the app's message)",
    right: "✓",
    wrong: "✗",
    component: "interactive exercise",
    does: "What to do",
    correct: "What counts as right",
    example: "Example",
    note: "Remember",
    figure: "Picture",
    caption: "Caption",
    labels: "Labels",
    interactive: "Interactive",
    video: "Video",
    exerciseHere: "Exercise `{id}` (below)",
    points: "A good answer has (P1, P2 … as the app names them)",
    pointContent: "content",
    pointForm: "form",
    source: "Source",
    modelAnswer: "Model answer",
    answerWays: {
      text: "type it in their own words",
      photo: "write it in their own words on paper and take a photo of the sheet",
      both: "type it in their own words, or write it on paper and take a photo of the sheet",
    },
    openGuide:
      "How to help: the app shows the points only after the answer; the child ticks which ones the answer has, and “missing P2, P4” names the others. If you lack the answer, ask the child to paste it or to attach the photo of the sheet. Check point by point, the ticked ones too, and say first what went well. For a missing point, ask a question that leads to it and name its source. Do not give away the model answer before the child has tried again. For a point of form, show with one of the child's sentences how it gets better.",
    formats: {
      "single-choice": "choose one answer",
      "multiple-choice": "choose all right answers",
      "true-false": "choose “true” or “false”",
      number: "type a number",
      ordering: "put the items in the right order (the app shows them shuffled)",
      matching: "match each item on the left with one on the right",
      choice: "choose one answer",
      set: "choose all right answers",
      order: "put the items in the right order (the app shows them shuffled)",
      pairs: "match each item on the left with one on the right",
    },
  },
};

const wordsIn = (lang: string): Words => WORDS[lang] ?? (WORDS["de"] as Words);

/** The words of what a tutor reads in `lang`, which the tutor page shares (tutorpage.ts). */
export const tutorWords = (lang: string): Readonly<Words> => wordsIn(lang);
export type { Words as TutorWords };

/** A text on one line, as a list item holds it. */
const line = (text: string) => text.replace(/\s+/g, " ").trim();

/** The folder of a page's tutor page, in the page's folder: <chapter>/<page>/tutor/ (tutorpage.ts). */
export const TUTOR_PAGE = "tutor";

/** The address of a page's tutor page within its language tree. */
export const tutorPageOf = (page: Pick<Page, "chapter" | "id">): string => `${page.chapter}/${page.id}/${TUTOR_PAGE}/`;

/** The answer format of a question of the question types, in `lang`. */
function questionFormat(question: Question, words: Words): string {
  const format = words.formats[question.type] ?? "";
  return question.type === "number" && question.unit !== undefined ? `${format} (${question.unit})` : format;
}

/** A question of the question types, in `lang`: its text, format, options, solution, explanation, hint, mistakes. */
function questionPart(question: Question, lang: string, words: Words): string[] {
  const lines = [
    `- ${words.task}: ${line(question.text)}`,
    `- ${words.answerFormat}: ${questionFormat(question, words)}`,
  ];
  if (question.type === "single-choice" || question.type === "multiple-choice") {
    lines.push(`- ${words.options}:`);
    for (const option of question.options) {
      const info = option.info.trim() === "" ? "" : ` – ${line(option.info)}`;
      lines.push(`  - ${option.correct ? words.right : words.wrong} ${line(option.text)}${info}`);
    }
  }
  lines.push(`- ${words.solution}: ${line(plainText(answerText(question, lang)))}`);
  if (question.explanation.trim() !== "") lines.push(`- ${words.explanation}: ${line(question.explanation)}`);
  if (question.hint !== undefined) lines.push(`- ${words.hint}: ${line(question.hint)}`);
  if (question.type === "number" && (question.mistakes ?? []).length > 0) {
    lines.push(`- ${words.mistakes}:`);
    for (const mistake of question.mistakes ?? []) lines.push(`  - ${mistake.answer}: ${line(mistake.message)}`);
  }
  return lines;
}

/** A generated exercise's answer format, in `lang`; the tutor page gives the rest (tutorpage.ts). */
function generatedPart(spec: Generated, lang: string, words: Words): string[] {
  const kind = kindOf(spec.answer.compare);
  const unit = kind.kind === "number" && kind.unit !== undefined ? ` (${inLanguage(kind.unit, lang)})` : "";
  return [`- ${words.answerFormat}: ${words.formats[kind.kind === "number" ? "number" : kind.kind]}${unit}`];
}

/**
 * An open task in `lang`: the task, how the learner answers, the points of a good answer as P1, P2 … (each with its
 * kind and, for content, a link to its source from the tutor page, `base` up to the language tree), the model answer,
 * the hint (their Markdown as written, formulas $…$ kept), and how to help.
 */
function openTaskPart(block: OpenTask, lang: string, words: Words, base: string): string[] {
  const ways = block.answer ?? ["text", "photo"];
  const way = ways.includes("text") && ways.includes("photo") ? "both" : ways.includes("photo") ? "photo" : "text";
  const lines = [
    `- ${words.task}: ${line(inLanguage(block.task, lang))}`,
    `- ${words.answerFormat}: ${words.answerWays[way]}`,
    `- ${words.points}:`,
    ...block.points.map((point, index) => {
      const kind = point.kind === "form" ? words.pointForm : words.pointContent;
      const source =
        point.source === undefined ? "" : ` ${words.source}: [${point.source}](${base}${point.source.slice(1)})`;
      return `  - P${index + 1} (${kind}) ${line(inLanguage(point.text, lang))}${source}`;
    }),
    `- ${words.modelAnswer}: ${line(inLanguage(block.solution, lang))}`,
  ];
  if (block.hint !== undefined) lines.push(`- ${words.hint}: ${line(inLanguage(block.hint, lang))}`);
  lines.push(`- ${words.openGuide}`);
  return lines;
}

/**
 * An exercise component: what it says about itself (its about), its typical mistakes as F1, F2 …, which the app's
 * message of a wrong answer names one of, and when it declares its exercise also its task once as its template; F1, F2 …
 * are then the columns of its table of tasks. Its tasks by number are the tutor page's.
 */
function componentPart(description: ComponentDescription, lang: string, words: Words): string[] {
  const { about } = description;
  const exercise = description.exercise?.[lang];
  const t = (text: Text) => line(inLanguage(text, lang));
  const lines = [`- ${words.does}: ${t(about.task)}`];
  if (exercise !== undefined) lines.push(`- ${words.task}: „${line(exercise.template)}“`);
  lines.push(`- ${words.answerFormat}: ${t(about.answer)}`, `- ${words.correct}: ${t(about.correct)}`);
  if (about.mistakes.length > 0) {
    lines.push(
      `- ${words.componentMistakes}:`,
      ...about.mistakes.map((mistake, index) => `  - F${index + 1}: ${t(mistake)}`),
    );
  }
  return lines;
}

/** A text of restricted Markdown for a tutor: each link as its words, as its address is the page's (an absolute one stays). */
const unlinked = (text: string) =>
  text.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (whole, words: string, target: string) =>
    /^[a-z][a-z0-9+.-]*:/i.test(target) ? whole : words,
  );

/**
 * What a tutor reads of `blocks` in `lang`, as Markdown lines, the content of a page for its tutor page (tutorpage.ts):
 * each section as the heading `heading` makes,
 * then its content: texts, formulas as $…$, definitions, examples and notes with their kind and title, figures by their
 * alt text and caption, tables row by row, timelines, quotes, code, a video as a link with its title and channel, a
 * component's own nojs text; an exercise by its
 * id, as it follows in full after the page. `inline` turns a text into what the page shows. A text keeps its lines,
 * so that its lists stay lists.
 */
export function contentLines(
  site: Site,
  blocks: readonly Block[],
  lang: string,
  inline: (text: string) => string,
  heading: (title: string, anchor: string, depth: number) => string,
): string[] {
  const words = wordsIn(lang);
  const t = (text: Text) => inline(unlinked(inLanguage(text, lang).trim()));
  const one = (text: Text) => t(text).replace(/\s+/g, " ");
  const sentence = (text: Text) => one(text).replace(/[.!?]?$/, (end) => end || ".");
  const lines: string[] = [];
  const add = (...more: string[]) => lines.push(...more, "");
  const walk = (inner: readonly Block[], anchor: string[], depth: number): void => {
    for (const block of inner) {
      switch (block.type) {
        case "section": {
          const id = [...anchor, block.id];
          add(heading(one(block.title), id.join("/"), depth));
          walk(block.blocks, id, depth + 1);
          break;
        }
        case "example":
        case "note":
          add(`**${block.type === "example" ? words.example : words.note}: ${one(block.title)}**`);
          walk(block.blocks, anchor, depth);
          break;
        case "text":
          add(t(block.text));
          break;
        case "formula":
          add(inline(`$${inLanguage(block.formula, lang).replace(/\s+/g, " ").trim()}$`));
          break;
        case "definition":
          add(`- **${one(block.term)}**: ${one(block.explanation)}`);
          break;
        case "figure":
          add(`${words.figure}: ${sentence(block.alt)} ${words.caption}: ${one(block.caption)}`);
          break;
        case "labelled-figure": {
          const labels = block.labels.map((label, index) => `${markerOf(label, index)} ${one(label.text)}`).join(", ");
          const caption = block.caption === undefined ? "" : ` ${words.caption}: ${one(block.caption)}`;
          add(`${words.figure}: ${sentence(block.alt)}${caption} ${words.labels}: ${labels}`);
          break;
        }
        case "table":
          add(
            `${one(block.caption)}:`,
            ...[...(block.header === undefined ? [] : [block.header]), ...block.rows].map(
              (row) => `- ${row.map(one).join(" | ")}`,
            ),
          );
          break;
        case "timeline":
          add(
            ...timelineEvents(site, block).map((event) => {
              const label = event.label === undefined ? "" : ` (${one(event.label)})`;
              const text = event.text === undefined ? "" : ` – ${one(event.text)}`;
              return `- ${String(event.date)}${label}: ${one(event.title)}${text}`;
            }),
          );
          break;
        case "quote": {
          const { origin } = block;
          const from = [origin.author, origin.work, origin.year]
            .filter((part) => part !== undefined)
            .map((part) => (typeof part === "number" ? String(part) : one(part)));
          add(
            ...t(block.text)
              .split("\n")
              .map((text) => `> ${text}`),
            ">",
            `> – ${from.join(", ")}`,
          );
          break;
        }
        case "code":
          add(
            ...(block.caption === undefined ? [] : [`${one(block.caption)}:`, ""]),
            `\`\`\`${block.language}`,
            block.code.trimEnd(),
            "```",
          );
          break;
        case "video":
          add(videoLine(block, words.video));
          break;
        case "vue-component": {
          const use = site.components.find((candidate) => candidate.block === block);
          if (use?.component.exercise === true && use.id !== undefined) {
            add(`- ${words.exerciseHere.replace("{id}", use.id)}`);
          } else if (block.nojs !== undefined) add(`${words.interactive}: ${one(block.nojs)}`);
          break;
        }
        default:
          if ("id" in block && typeof block.id === "string") add(`- ${words.exerciseHere.replace("{id}", block.id)}`);
      }
    }
  };
  walk(blocks, [], 0);
  return lines;
}

/**
 * An exercise for a tutor in `lang`, or undefined for a block that is none: its id, its type, and its lines (task,
 * answer format, solution, hint, typical mistakes; of a generated exercise and an exercise component what stays the
 * same for each number, the tutor page adds the tasks by number).
 */
export function exercisePart(
  site: Site,
  block: Block,
  lang: string,
  descriptions: Descriptions,
): { id: string; type: string; lines: string[] } | undefined {
  const words = wordsIn(lang);
  switch (block.type) {
    case "generated":
      return {
        id: block.id,
        type: `generated, ${kindOf(block.answer.compare).kind}`,
        lines: generatedPart(block, lang, words),
      };
    case "open-task":
      // from the tutor page, <chapter>/<page>/tutor/, three levels up is the language tree
      return { id: block.id, type: "open-task", lines: openTaskPart(block, lang, words, "../../../") };
    case "vue-component": {
      const use = site.components.find((candidate) => candidate.block === block);
      const description = descriptions.get(block);
      if (use?.id === undefined || description === undefined) return undefined;
      return {
        id: use.id,
        type: `${words.component} ${block.component}`,
        lines: componentPart(description, lang, words),
      };
    }
    case "single-choice":
    case "multiple-choice":
    case "true-false":
    case "number":
    case "ordering":
    case "matching":
      return { id: block.id, type: block.type, lines: questionPart(questionIn(block, lang), lang, words) };
    default:
      return undefined;
  }
}

/** The anchors of a page: its sections (nested as <section>/<subsection>), exercises and components with an id. */
export function anchorsOf(site: Site, page: Page): Set<string> {
  const anchors = new Set<string>();
  const walk = (blocks: readonly Block[], anchor: string[]): void => {
    for (const block of blocks) {
      if (block.type === "section") {
        anchors.add([...anchor, block.id].join("/"));
        walk(block.blocks, [...anchor, block.id]);
      } else if (block.type === "example" || block.type === "note") walk(block.blocks, anchor);
    }
  };
  walk(page.blocks, []);
  for (const block of allBlocks(page.blocks)) {
    if ("id" in block && typeof block.id === "string" && block.type !== "section") anchors.add(block.id);
  }
  for (const use of site.components) {
    if (use.id !== undefined && [...allBlocks(page.blocks)].includes(use.block as BlockOf<"vue-component">)) {
      anchors.add(use.id);
    }
  }
  return anchors;
}

/**
 * The links of a Markdown file at `file` (an address within a language tree, e.g. "prozent/grundwert/tutor/") that
 * lead nowhere: a relative link must name a file the build writes or a page's
 * folder, and its anchor must be on that page. `files` are the files and page folders of the tree, `anchors` each
 * page folder's anchors. One line per broken link.
 */
export function linkProblems(
  file: string,
  text: string,
  files: ReadonlySet<string>,
  anchors: ReadonlyMap<string, ReadonlySet<string>>,
): string[] {
  const problems: string[] = [];
  const base = new URL(file, "https://app.invalid/");
  for (const [, target = ""] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const url = new URL(target, base);
    const path = decodeURIComponent(url.pathname.slice(1));
    if (!files.has(path)) {
      problems.push(`${file}: the link ${target} leads to ${path || "./"}, which the build does not write`);
      continue;
    }
    const id = decodeURIComponent(url.hash.slice(1));
    if (id !== "" && !(anchors.get(path)?.has(id) ?? false)) {
      problems.push(`${file}: the link ${target} names the anchor #${id}, which ${path || "./"} does not have`);
    }
  }
  return problems;
}
