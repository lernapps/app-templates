// The exercises of an explainer page at build time: a block of one of the quiz's question types, rendered through
// the quiz runtime's per-question exports (its controls, and a <details> "Lösung" with the right answer, the
// background of every option, the explanation and the links); and a generated exercise: its templates rendered once
// per language (restricted Markdown, formulas as MathML, the placeholders as tokens), the place of the live task, and
// three worked tasks from fixed seeds each with a <details> "Lösung" (with JavaScript they show once the live task is
// solved). Each exercise carries the data its live part
// needs in the browser (explainer.ts): the question, or the exercise with its templates and data files.
import { questionIn, type Question } from "../quiz/quiz.ts";
import { answerText, messagesIn, renderQuestion, renderSolution } from "../quiz/render.ts";
import { inLanguage, type Text } from "../shared/languages.ts";
import type { DataRecord, Exercise, QuestionBlock } from "./content.ts";
import {
  figureOf,
  generate,
  hintOf,
  questionFor,
  stepsOf,
  taskText,
  tokenize,
  WORKED_SEEDS,
  type Data,
  type Generated,
  type LanguageTemplates,
  type Templates,
} from "./generated.ts";
import { plain, renderInline } from "./markdown.ts";
import { message } from "./messages.ts";

/** What the browser reads from an exercise (script.explainer-exercise-data). */
export type ExerciseData =
  | { kind: "question"; lang: string; question: Question }
  | {
      kind: "generated";
      lang: string;
      spec: Generated;
      templates: Templates;
      data: Data;
      texts: { newTask: string; practice: string; hint: string; solution: string };
    };

/** The templates of a generated exercise in each of `languages`; links inside them through `resolve`. */
export function templatesOf(
  spec: Generated,
  languages: readonly string[],
  resolve: (href: string) => string = (href) => href,
): Templates {
  const templates: Record<string, LanguageTemplates> = {};
  for (const lang of languages) {
    const inline = (text: Text) => renderInline(tokenize(inLanguage(text, lang)), resolve);
    const figure = spec.task.figure;
    const alt =
      figure === undefined
        ? undefined
        : figure.alt !== undefined
          ? inLanguage(figure.alt, lang)
          : message(lang, figure.kind === "hundred-grid" ? "gridAlt" : "barAlt");
    templates[lang] = {
      task: inline(spec.task.text),
      steps: (spec.steps ?? []).map(inline),
      hint: spec.hint === undefined ? undefined : inline(spec.hint),
      messages: (spec.mistakes ?? []).map((mistake) => tokenize(inLanguage(mistake.message, lang))),
      alt: alt === undefined ? undefined : tokenize(alt),
    };
  }
  return templates;
}

/** The data files a generated exercise draws from, by name. */
export function dataOf(spec: Generated, all: Readonly<Record<string, readonly DataRecord[]>>): Data {
  const names = Object.values(spec.given).flatMap((arbitrary) =>
    [arbitrary.from, arbitrary.shuffle].flatMap((source) =>
      source !== undefined && !Array.isArray(source) ? [(source as { data: string }).data] : [],
    ),
  );
  return Object.fromEntries(names.filter((name) => all[name] !== undefined).map((name) => [name, all[name] ?? []]));
}

/** One worked task of a generated exercise: what the page shows without JavaScript, and what the tests expect. */
export interface Worked {
  seed: number;
  /** The task as HTML. */
  task: string;
  question: Question;
  figure?: string;
  hint?: string;
  steps: string[];
  /** The right answer as the solution states it. */
  answer: string;
}

/** The worked tasks of a generated exercise in `lang`. */
export function workedTasks(spec: Generated, data: Data, templates: Templates, lang: string): Worked[] {
  return WORKED_SEEDS.map((seed) => {
    const task = generate(spec, seed, data);
    const question = questionFor(spec, task, lang, templates);
    const figure = figureOf(spec, task, lang, templates);
    const hint = hintOf(spec, task, lang, templates);
    return {
      seed,
      task: taskText(spec, task, lang, templates),
      question,
      steps: stepsOf(spec, task, lang, templates),
      answer: answerText(question, lang),
      ...(figure === undefined ? {} : { figure }),
      ...(hint === undefined ? {} : { hint }),
    };
  });
}

const json = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

function questionExercise(block: QuestionBlock, lang: string): string {
  const question = questionIn(block, lang);
  const data: ExerciseData = { kind: "question", lang, question };
  return [
    `<div class="explainer-exercise explainer-question" id="${block.id}">`,
    renderQuestion(question, { lang }),
    `<details class="explainer-solution"><summary>${plain(messagesIn(lang).solution)}</summary>`,
    renderSolution(question, { lang }),
    `</details>`,
    `<script type="application/json" class="explainer-exercise-data">${json(data)}</script>`,
    `</div>`,
  ].join("\n");
}

function generatedExercise(
  spec: Generated,
  lang: string,
  all: Readonly<Record<string, readonly DataRecord[]>>,
  resolve: (href: string) => string,
): string {
  const templates = templatesOf(spec, [lang], resolve);
  const data = dataOf(spec, all);
  const solution = messagesIn(lang).solution;
  const worked = workedTasks(spec, data, templates, lang).map((item) =>
    [
      `<li class="explainer-worked-task">`,
      `<p class="explainer-task">${item.task}</p>`,
      item.figure === undefined ? "" : `<div class="explainer-task-figure">${item.figure}</div>`,
      item.hint === undefined
        ? ""
        : `<details class="explainer-hint"><summary>${plain(message(lang, "hint"))}</summary><p>${item.hint}</p></details>`,
      `<details class="explainer-solution"><summary>${plain(solution)}</summary>`,
      item.steps.length === 0
        ? ""
        : `<ol class="explainer-steps">${item.steps.map((step) => `<li>${step}</li>`).join("")}</ol>`,
      `<p><strong>${plain(messagesIn(lang).rightAnswer)}</strong> ${item.answer}</p>`,
      `</details>`,
      `</li>`,
    ]
      .filter((part) => part !== "")
      .join(""),
  );
  // the examples are test cases for the build: not shipped
  const { examples: _examples, ...shipped } = spec;
  const exerciseData: ExerciseData = {
    kind: "generated",
    lang,
    spec: shipped,
    templates,
    data,
    texts: {
      newTask: message(lang, "newTask"),
      practice: message(lang, "practice"),
      hint: message(lang, "hint"),
      solution,
    },
  };
  return [
    `<div class="explainer-exercise explainer-generated" id="${spec.id}">`,
    `<div class="explainer-live" hidden></div>`,
    `<p class="explainer-worked-intro">${plain(message(lang, "workedTasks"))}</p>`,
    `<ol class="explainer-worked">${worked.join("\n")}</ol>`,
    `<script type="application/json" class="explainer-exercise-data">${json(exerciseData)}</script>`,
    `</div>`,
  ].join("\n");
}

/** An exercise of a page in `lang`. */
export function renderExercise(
  block: Exercise,
  lang: string,
  data: Readonly<Record<string, readonly DataRecord[]>>,
  resolve: (href: string) => string,
): string {
  return block.type === "generated" ? generatedExercise(block, lang, data, resolve) : questionExercise(block, lang);
}
