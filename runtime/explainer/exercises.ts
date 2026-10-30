// The exercises of an explainer page at build time: a block of one of the question types, rendered through
// the per-question exports of the shared runtime (shared/questions) (its controls, and a <details> "Lösung" with the right answer, the
// background of every option, the explanation and the links); and a generated exercise: its templates rendered once
// per language (restricted Markdown, formulas as MathML, the placeholders as tokens), the place of the live task, and
// three worked tasks, the task numbers 1 to 3 (taskSeeds), each with its task number and a <details> "Lösung" (with JavaScript they show
// once the live task is solved). Each exercise carries the data its live part
// needs in the browser (explainer.ts): the question, or the exercise with its templates and data files.
import { questionIn, type Question } from "../shared/questions/question.ts";
import { renderMaterial, type MaterialContext } from "../shared/blocks/index.ts";
import { answerText, questionMessagesIn, renderQuestion, renderSolution } from "../shared/questions/render.ts";
import { inLanguage, type Text } from "../shared/languages.ts";
import type { DataRecord, Exercise, OpenTask, QuestionBlock } from "./content.ts";
import { hintOf, stepsOf, taskText, tokenize } from "./generated/texts.ts";
import { generate } from "./generated/values.ts";
import { questionFor, taskKey } from "./generated/question.ts";
import { WORKED_TASKS } from "./tasks.ts";
import { type Data, type Generated, type LanguageTemplates, type Templates } from "./generated/types.ts";
import { plain, renderInline, renderMarkdown, renderWithFormulas } from "../shared/text/markdown.ts";
import { distinctSeeds } from "./tasks.ts";
import { message } from "./messages.ts";

/** What the browser reads from an exercise (script.explainer-exercise-data). */
export type ExerciseData =
  | {
      kind: "question";
      lang: string;
      question: Question;
      /** The texts of the question that hold a formula, as HTML (the feedback quotes them); the others are plain. */
      rendered: Record<string, string>;
    }
  | {
      kind: "generated";
      lang: string;
      spec: Generated;
      templates: Templates;
      data: Data;
      /** The seed of each task number, from 1 (taskSeeds). */
      seeds: number[];
      texts: { newTask: string; practice: string; hint: string; solution: string; taskNumber: string };
    }
  | OpenTaskData;

/** What the browser reads from an open task: its texts as HTML, its points, how the learner may answer. */
export interface OpenTaskData {
  kind: "open";
  lang: string;
  id: string;
  /** The task as HTML. */
  task: string;
  answer: readonly ("text" | "photo")[];
  /** Each point as plain text, its kind, and the address of its source on this page's tree. */
  points: { text: string; kind: "content" | "form"; href?: string }[];
  /** The model answer as HTML. */
  solution: string;
  /** The hint as HTML. */
  hint?: string;
}

/** The templates of a generated exercise in each of `languages`; links inside them through `resolve`. */
export function templatesOf(
  spec: Generated,
  languages: readonly string[],
  resolve: (href: string) => string = (href) => href,
): Templates {
  const templates: Record<string, LanguageTemplates> = {};
  for (const lang of languages) {
    const inline = (text: Text) => renderInline(tokenize(inLanguage(text, lang)), resolve);
    templates[lang] = {
      task: inline(spec.task.text),
      steps: (spec.steps ?? []).map(inline),
      hint: spec.hint === undefined ? undefined : inline(spec.hint),
      messages: (spec.mistakes ?? []).map((mistake) => tokenize(inLanguage(mistake.message, lang))),
    };
  }
  return templates;
}

/** The data files a generated exercise draws from, by name. */
export function dataOf(spec: Generated, all: Readonly<Record<string, readonly DataRecord[]>>): Data {
  const names = Object.values(spec.given).flatMap((arbitrary) =>
    arbitrary.from !== undefined && !Array.isArray(arbitrary.from) ? [(arbitrary.from as { data: string }).data] : [],
  );
  return Object.fromEntries(names.filter((name) => all[name] !== undefined).map((name) => [name, all[name] ?? []]));
}

const seedCache = new WeakMap<Generated, number[]>();

/**
 * The seed of each task number of a generated exercise, from 1: the seeds of its distinct tasks (what the learner sees
 * of a task, in German), up to MAX_TASKS (tasks.ts); once per exercise.
 */
export function taskSeeds(spec: Generated, data: Data): number[] {
  let seeds = seedCache.get(spec);
  if (seeds === undefined) {
    const templates = templatesOf(spec, ["de"]);
    seeds = distinctSeeds((seed) => {
      try {
        return taskKey(spec, generate(spec, seed, data), "de", templates);
      } catch {
        return undefined;
      }
    });
    seedCache.set(spec, seeds);
  }
  return seeds;
}

/** One worked task of a generated exercise: what the page shows without JavaScript, and what the tests expect. */
export interface Worked {
  /** Its task number. */
  number: number;
  seed: number;
  /** The task as HTML. */
  task: string;
  question: Question;
  hint?: string;
  steps: string[];
  /** The right answer as the solution states it. */
  answer: string;
}

/** The worked tasks of a generated exercise in `lang`. */
export function workedTasks(spec: Generated, data: Data, templates: Templates, lang: string): Worked[] {
  return taskSeeds(spec, data)
    .slice(0, WORKED_TASKS)
    .map((seed, index) => {
      const task = generate(spec, seed, data);
      const question = questionFor(spec, task, lang, templates);
      const hint = hintOf(spec, task, lang, templates);
      return {
        number: index + 1,
        seed,
        task: taskText(spec, task, lang, templates),
        question,
        steps: stepsOf(spec, task, lang, templates),
        answer: answerText(question, lang),
        ...(hint === undefined ? {} : { hint }),
      };
    });
}

const json = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/** The texts of a question that hold a formula, $…$. */
function formulaTexts(value: unknown): string[] {
  if (typeof value === "string") return value.includes("$") && /\$[^$\n]+\$/.test(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(formulaTexts);
  if (typeof value === "object" && value !== null) return Object.values(value).flatMap(formulaTexts);
  return [];
}

/** What the browser reads from a question of the question types in `lang`: the question, its formulas as HTML. */
function questionData(block: QuestionBlock, lang: string): Extract<ExerciseData, { kind: "question" }> {
  const question = questionIn(block, lang);
  const rendered: Record<string, string> = {};
  for (const text of formulaTexts(question)) rendered[text] = renderWithFormulas(text);
  return { kind: "question", lang, question, rendered };
}

function questionExercise(block: QuestionBlock, lang: string, material: MaterialContext): string {
  const data = questionData(block, lang);
  const { question } = data;
  return [
    `<div class="explainer-exercise explainer-question" id="${block.id}">`,
    `<p class="explainer-exercise-label">${plain(message(lang, "exerciseLabel"))}</p>`,
    renderQuestion(question, {
      lang,
      format: renderWithFormulas,
      ...(question.material === undefined ? {} : { materialHtml: renderMaterial(question.material, material) }),
    }),
    `<details class="explainer-solution"><summary>${plain(questionMessagesIn(lang).solution)}</summary>`,
    renderSolution(question, { lang, format: renderWithFormulas }),
    `</details>`,
    `<script type="application/json" class="explainer-exercise-data">${json(data)}</script>`,
    `</div>`,
  ].join("\n");
}

/** What the browser reads from a generated exercise in `lang`: the exercise, its templates, data files and seeds. */
function generatedData(
  spec: Generated,
  lang: string,
  all: Readonly<Record<string, readonly DataRecord[]>>,
  resolve: (href: string) => string,
): Extract<ExerciseData, { kind: "generated" }> {
  const data = dataOf(spec, all);
  // the examples are test cases for the build: not shipped
  const { examples: _examples, ...shipped } = spec;
  return {
    kind: "generated",
    lang,
    spec: shipped,
    templates: templatesOf(spec, [lang], resolve),
    data,
    seeds: taskSeeds(spec, data),
    texts: {
      newTask: message(lang, "newTask"),
      practice: spec.practice === undefined ? message(lang, "practice") : inLanguage(spec.practice, lang),
      hint: message(lang, "hint"),
      solution: questionMessagesIn(lang).solution,
      // with {n} kept for the client module
      taskNumber: message(lang, "taskNumber"),
    },
  };
}

/** What the browser reads from an open task in `lang`; links and sources through `resolve`. */
export function openTaskData(block: OpenTask, lang: string, resolve: (href: string) => string): OpenTaskData {
  return {
    kind: "open",
    lang,
    id: block.id,
    task: renderMarkdown(inLanguage(block.task, lang), resolve),
    answer: block.answer ?? ["text", "photo"],
    points: block.points.map((point) => ({
      text: inLanguage(point.text, lang),
      kind: point.kind ?? "content",
      ...(point.source === undefined ? {} : { href: resolve(point.source) }),
    })),
    solution: renderMarkdown(inLanguage(block.solution, lang), resolve),
    ...(block.hint === undefined ? {} : { hint: renderMarkdown(inLanguage(block.hint, lang), resolve) }),
  };
}

/** What the browser reads from an exercise in `lang` (script.explainer-exercise-data). */
export function exerciseData(
  block: Exercise,
  lang: string,
  all: Readonly<Record<string, readonly DataRecord[]>>,
  resolve: (href: string) => string,
): ExerciseData {
  if (block.type === "generated") return generatedData(block, lang, all, resolve);
  if (block.type === "open-task") return openTaskData(block, lang, resolve);
  return questionData(block, lang);
}

/**
 * An open task in `lang`: the task, the points of a good answer with a link to each one's source, and the model answer
 * under "Lösung", which is all the page shows without JavaScript; with JavaScript the learner answers first (explainer.ts).
 */
function openTaskExercise(block: OpenTask, lang: string, resolve: (href: string) => string, storage: string): string {
  const data = openTaskData(block, lang, resolve);
  const points = data.points.map((point) => {
    const where =
      point.href === undefined
        ? ` <span class="explainer-open-kind">(${plain(message(lang, "openTaskForm"))})</span>`
        : ` <a class="explainer-open-source" href="${plain(point.href)}">${plain(message(lang, "openTaskSource"))}</a>`;
    return `<li>${plain(point.text)}${where}</li>`;
  });
  return [
    `<div class="explainer-exercise explainer-open-task" id="${block.id}" data-storage="${plain(storage)}">`,
    `<p class="explainer-exercise-label">${plain(message(lang, "openTaskLabel"))}</p>`,
    `<div class="explainer-open-task-text">${data.task}</div>`,
    data.hint === undefined
      ? ""
      : `<details class="explainer-hint"><summary>${plain(message(lang, "hint"))}</summary>${data.hint}</details>`,
    `<div class="explainer-open-live" hidden></div>`,
    `<div class="explainer-open-points">`,
    `<p class="explainer-open-points-intro">${plain(message(lang, "openTaskPoints"))}</p>`,
    `<ul>${points.join("")}</ul>`,
    `</div>`,
    `<details class="explainer-solution"><summary>${plain(questionMessagesIn(lang).solution)}</summary>`,
    `<div class="explainer-open-solution">${data.solution}</div>`,
    `</details>`,
    `<script type="application/json" class="explainer-exercise-data">${json(data)}</script>`,
    `</div>`,
  ]
    .filter((part) => part !== "")
    .join("\n");
}

function generatedExercise(
  spec: Generated,
  lang: string,
  all: Readonly<Record<string, readonly DataRecord[]>>,
  resolve: (href: string) => string,
): string {
  const templates = templatesOf(spec, [lang], resolve);
  const data = dataOf(spec, all);
  const solution = questionMessagesIn(lang).solution;
  const worked = workedTasks(spec, data, templates, lang).map((item) =>
    [
      `<li class="explainer-worked-task">`,
      `<p class="explainer-task-number">${plain(message(lang, "taskNumber", { n: String(item.number) }))}</p>`,
      `<p class="explainer-task">${item.task}</p>`,
      item.hint === undefined
        ? ""
        : `<details class="explainer-hint"><summary>${plain(message(lang, "hint"))}</summary><p>${item.hint}</p></details>`,
      `<details class="explainer-solution"><summary>${plain(solution)}</summary>`,
      item.steps.length === 0
        ? ""
        : `<ol class="explainer-steps">${item.steps.map((step) => `<li>${step}</li>`).join("")}</ol>`,
      `<p><strong>${plain(questionMessagesIn(lang).rightAnswer)}</strong> ${item.answer}</p>`,
      `</details>`,
      `</li>`,
    ]
      .filter((part) => part !== "")
      .join(""),
  );
  const exerciseData = generatedData(spec, lang, all, resolve);
  return [
    `<div class="explainer-exercise explainer-generated" id="${spec.id}">`,
    `<p class="explainer-exercise-label">${plain(message(lang, "exerciseLabel"))}</p>`,
    `<div class="explainer-live" hidden></div>`,
    `<p class="explainer-worked-intro">${plain(message(lang, "workedTasks"))}</p>`,
    `<ol class="explainer-worked">${worked.join("\n")}</ol>`,
    `<script type="application/json" class="explainer-exercise-data">${json(exerciseData)}</script>`,
    `</div>`,
  ].join("\n");
}

/** An exercise of a page in `lang`; an open task keeps its answer while the tab is open under the app's `storage`. */
export function renderExercise(
  block: Exercise,
  lang: string,
  data: Readonly<Record<string, readonly DataRecord[]>>,
  resolve: (href: string) => string,
  material: MaterialContext,
  storage = "explainer",
): string {
  if (block.type === "generated") return generatedExercise(block, lang, data, resolve);
  if (block.type === "open-task") return openTaskExercise(block, lang, resolve, storage);
  return questionExercise(block, lang, material);
}
