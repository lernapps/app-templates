// The exercises of an explainer page at build time: a block of one of the question types, rendered through
// the per-question exports of the shared runtime (shared/questions) (its controls, and a <details> "Lösung" with the right answer, the
// background of every option, the explanation and the links); and a generated exercise: its templates rendered once
// per language (restricted Markdown, formulas as MathML, the placeholders as tokens), the place of the live task, and
// three worked tasks, the task numbers 1 to 3 (taskSeeds), each with its task number and a <details> "Lösung" (with JavaScript they show
// once the live task is solved). Each exercise carries the data its live part
// needs in the browser (explainer.ts): the question, or the exercise with its templates and data files.
import { questionIn, type Question } from "../shared/questions/question.ts";
import { renderMaterial, type AudioRef, type MaterialContext } from "../shared/blocks/index.ts";
import { materialIn } from "../shared/blocks/block.ts";
import { answerText, questionMessagesIn, renderQuestion, renderSolution } from "../shared/questions/render.ts";
import { inLanguage, type Text } from "../shared/languages.ts";
import type { DataRecord, Exercise, LanguageTask, OpenTask, QuestionBlock, SpeakingTask } from "./content.ts";
import {
  answerLanguage,
  answersOf,
  FORM_CLASSES,
  partsOf,
  promptOf,
  solutionOf,
  specialChars,
  unitsOf,
  type Form,
  type Prompt,
  type Unit,
} from "./language.ts";
import { chemPlaceholdersIn, hintOf, label, stepsOf, taskText, tokenize, writtenTemplates } from "./generated/texts.ts";
import { generate, items } from "./generated/values.ts";
import { evaluate, parse, type Value } from "./expression.ts";
import { renderFormula } from "../shared/text/formula.ts";
import { questionFor, taskKey } from "./generated/question.ts";
import { WORKED_TASKS } from "./tasks.ts";
import { type Data, type Generated, type LanguageTemplates, type Templates } from "./generated/types.ts";
import { plain, renderInline, renderMarkdown, renderWithFormulas } from "../shared/text/markdown.ts";
import { formulaAlternative } from "../shared/text/speech.ts";
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
  | OpenTaskData
  | LanguageTaskData
  | SpeakingTaskData;

/** The keys of the texts the browser needs for a speaking task, from the messages. */
const SPEAKING_TEXTS = [
  "speakPrivacy",
  "speakRecord",
  "speakStop",
  "speakRerecord",
  "speakRecording",
  "speakOriginal",
  "speakMine",
  "speakBoth",
  "speakCompare",
  "speakRate",
  "speakSame",
  "speakBumpy",
  "speakAgain",
  "speakNoMic",
  "speakSpoken",
  "speakItem",
  "speakAllRight",
  "speakSomeRight",
  "speakWrong",
  "speakResultRecorded",
  "speakResultNotRecorded",
  "speakResultLine",
] as const;

/** What the browser reads from a speaking task: its models with their players, and its texts. */
export interface SpeakingTaskData {
  kind: "speaking";
  lang: string;
  id: string;
  /** The language of the models. */
  language: string;
  items: { audio: string; player: string; text?: string; spoken?: string }[];
  texts: Record<(typeof SPEAKING_TEXTS)[number], string>;
}

/** What the browser reads from a language task: its units with their inputs, its texts, how it counts form. */
export interface LanguageTaskData {
  kind: "language";
  lang: string;
  id: string;
  mode: "write" | "gap" | "choice" | "table";
  /** The language the learner writes in. */
  answerLang: string;
  form: Form;
  /** Each unit (an item, or a row of a table) with what the page shows of it and the messages of its mistakes. */
  units: (Unit & {
    /** The answer with its gaps as the page shows it: words and the index of each slot; none for write. */
    parts?: (string | number)[];
    /** For a row of a table: each cell so. */
    cellParts?: (string | number)[][];
    /** The messages of its typical mistakes, plain text, in the order of the mistakes. */
    messages: string[];
    /** Its solution as the learner reads it. */
    solution: string;
    /** What the learner starts from, as HTML with its language marked; empty for a row of a table. */
    promptHtml: string;
  })[];
  /** The heads of the columns of a table. */
  columns?: string[];
  /** The characters the bar under a field inserts. */
  chars: string[];
  texts: Record<string, string>;
}

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

/** A value of a placeholder in \ce{{{…}}} whose formula does not parse; the check reports its message as it is. */
export class ChemError extends Error {}

/**
 * The chemical formula of each value of the placeholders in \ce{{{…}}} of an exercise's templates in `lang`, as
 * MathML without <math>, by the value as the learner reads it: each value of the list the placeholder's root is
 * drawn from (oneOf, or pick: 1 from a list or a data file), set by mhchem as \ce{value}. Throws a ChemError for a
 * value that does not parse.
 */
export function chemFormulas(spec: Generated, data: Data, lang: string): Record<string, string> {
  const formulas: Record<string, string> = {};
  const paths = new Set(
    writtenTemplates(spec)
      .filter((written) => written.lang === undefined || written.lang === lang)
      .flatMap((written) => chemPlaceholdersIn(written.text)),
  );
  for (const path of paths) {
    const root = path.split(".")[0] ?? "";
    const arbitrary = spec.given[root];
    if (arbitrary === undefined) continue; // reported by templateProblems
    const source = arbitrary.oneOf ?? (arbitrary.pick === 1 ? arbitrary.from : undefined);
    if (source === undefined) continue; // reported by templateProblems
    let candidates: Value[];
    try {
      candidates = items(source, data);
    } catch {
      continue; // a missing data file is reported on its own
    }
    for (const candidate of candidates) {
      let text: string;
      try {
        text = label(evaluate(parse(path), { [root]: candidate }), lang);
      } catch {
        continue; // a record without the field, reported when a task draws it
      }
      if (text in formulas) continue;
      try {
        // a value with unbalanced braces would end \ce early and leave the rest outside it
        let depth = 0;
        for (const char of text) {
          if (char === "{") depth++;
          else if (char === "}" && --depth < 0) break;
        }
        if (depth !== 0) throw new Error("its braces are not balanced");
        const math = renderFormula(`\\ce{${text}}`, false);
        formulas[text] = /^<math[^>]*>([\s\S]*)<\/math>$/.exec(math)?.[1] ?? math;
      } catch (error) {
        const reason = (error instanceof Error ? error.message : String(error)).split("\n")[0]?.trim() ?? "";
        throw new ChemError(
          `\\ce{{{${path}}}}: the value "${text}" is no chemical formula mhchem can set (${reason}); write it in mhchem's notation, e.g. 2H2 + O2 -> 2H2O`,
        );
      }
    }
  }
  return formulas;
}

/**
 * The templates of a generated exercise in each of `languages`, with the formulas of the values in \ce{{{…}}} drawn
 * from `data`; links inside them through `resolve`.
 */
export function templatesOf(
  spec: Generated,
  languages: readonly string[],
  data: Data,
  resolve: (href: string) => string = (href) => href,
): Templates {
  const templates: Record<string, LanguageTemplates> = {};
  for (const lang of languages) {
    const inline = (text: Text) => renderInline(tokenize(inLanguage(text, lang)), resolve);
    const chem = chemFormulas(spec, data, lang);
    templates[lang] = {
      task: inline(spec.task.text),
      steps: (spec.steps ?? []).map(inline),
      hint: spec.hint === undefined ? undefined : inline(spec.hint),
      messages: (spec.mistakes ?? []).map((mistake) => tokenize(inLanguage(mistake.message, lang))),
      ...(Object.keys(chem).length === 0 ? {} : { chem }),
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
    const templates = templatesOf(spec, ["de"], data);
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
      describe: (text) => formulaAlternative(text, lang),
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
    templates: templatesOf(spec, [lang], data, resolve),
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

/** The name of a language in `lang`, e.g. Französisch for fr in German. */
export const languageName = (code: string, lang: string): string =>
  new Intl.DisplayNames([lang], { type: "language" }).of(code) ?? code;

/** The task of a language task as the learner reads it: its own, or a text by its mode and its first prompt. */
export function languageTaskText(block: LanguageTask, lang: string, resolve: (href: string) => string): string {
  if (block.task !== undefined) return renderMarkdown(inLanguage(block.task, lang), resolve);
  const language = languageName(answerLanguage(block), lang);
  const mode = block.mode ?? "write";
  const first = block.items?.[0];
  const prompt = first === undefined ? undefined : promptOf(block, first);
  const key =
    mode === "table"
      ? "languageTable"
      : mode === "choice"
        ? "languageChoice"
        : mode === "gap"
          ? "languageGap"
          : prompt?.kind === "audio"
            ? block.direction === "to-source"
              ? "languageListen"
              : "languageDictate"
            : prompt?.kind === "cue"
              ? "languageBuild"
              : prompt?.kind === "marker"
                ? "languageLabelFigure"
                : prompt?.kind === "text"
                  ? "languageTranslate"
                  : "languageWrite";
  return `<p>${plain(message(lang, key, { language }))}</p>`;
}

/** What the browser reads from a language task in `lang`. */
export function languageTaskData(
  block: LanguageTask,
  lang: string,
  audio?: MaterialContext["audio"],
): LanguageTaskData {
  const mode = block.mode ?? "write";
  const units = unitsOf(block);
  let slot = 0;
  const texts: Record<string, string> = {};
  for (const key of [
    "languageAnswer",
    "languageGapLabel",
    "languageCellLabel",
    "languageChars",
    "languageCharInsert",
    "languageIncomplete",
    "languageAllRight",
    "languageSomeRight",
    "languagePartly",
    "languageRight",
    "languageWrong",
    "languageOwnVersion",
    "tryAgainOrSolution",
  ] as const)
    texts[key] = key === "tryAgainOrSolution" ? questionMessagesIn(lang).tryAgain : message(lang, key);
  for (const name of FORM_CLASSES) texts[`class_${name}`] = message(lang, `languageClass_${name}`);
  texts["check"] = questionMessagesIn(lang).check;
  texts["showSolution"] = questionMessagesIn(lang).showSolution;
  return {
    kind: "language",
    lang,
    id: block.id,
    mode,
    answerLang: answerLanguage(block),
    form: block.form ?? {},
    units: units.map((unit, index) => {
      const item = block.items?.[index];
      const shown = {
        ...unit,
        messages: (item?.mistakes ?? []).map((mistake) => inLanguage(mistake.message, lang)),
        solution: solutionOf(unit),
        promptHtml: promptHtml(unit.prompt, lang, audio),
      };
      if (mode === "write") return shown;
      if (unit.cells !== undefined) {
        const cellParts = unit.cells.map((cell) => {
          const parts = partsOf(cell, slot);
          slot += parts.filter((part) => typeof part === "number").length;
          return parts;
        });
        slot = 0;
        return { ...shown, cellParts };
      }
      return { ...shown, parts: partsOf(unit.answer) };
    }),
    ...(block.table?.header === undefined ? {} : { columns: [...block.table.header] }),
    // the bar of special characters only for another language than the page's: its own the learner types every day
    chars: answerLanguage(block).split("-")[0] === lang.split("-")[0] ? [] : [...specialChars(answerLanguage(block))],
    texts,
  };
}

/** The tempos of the player, as a factor of the speed of the recording. */
const SPEEDS = [0.75, 1, 1.25] as const;

/**
 * An audio file as the page shows it: the browser's own player (it plays without JavaScript, and loads nothing before
 * the learner presses play), a label when a model made the voice, and the buttons for the tempo, which only the client
 * module makes work and the style shows once it runs.
 */
export function audioHtml(audio: AudioRef | undefined, lang: string): string {
  if (audio === undefined) return `<span class="explainer-audio">${plain(message(lang, "languageAudioItem"))}</span>`;
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 });
  const buttons = SPEEDS.map(
    (speed) =>
      `<button type="button" class="explainer-audio-speed-button" data-speed="${speed}" aria-pressed="${speed === 1}">${plain(number.format(speed))}×</button>`,
  ).join("");
  // the label of an AI voice is small; the information shows on hover, focus and tap (data-info, drawn by the style) and is
  // read by a screen reader (aria-label); no title, which browsers show late and in their own way
  const label =
    audio.ai === undefined
      ? ""
      : `<span class="explainer-ai-voice" tabindex="0" role="note" data-info="${plain(audio.info ?? audio.ai)}" aria-label="${plain(audio.info ?? audio.ai)}">${plain(audio.ai)}</span>`;
  return [
    `<span class="explainer-audio">`,
    `<audio controls preload="none" src="${plain(audio.src)}" aria-label="${plain(message(lang, "audioPlay"))}"></audio>`,
    `<span class="explainer-audio-speed" role="group" aria-label="${plain(message(lang, "audioSpeed"))}">${buttons}</span>`,
    label,
    `</span>`,
  ].join("");
}

/** A prompt as the page shows it, plain HTML with its language marked. */
function promptHtml(prompt: Prompt | undefined, lang: string, audio?: MaterialContext["audio"]): string {
  if (prompt === undefined) return "";
  if (prompt.kind === "audio") return audioHtml(audio?.(prompt.file), lang);
  if (prompt.kind === "text") return `<span lang="${plain(prompt.lang)}">${plain(prompt.text)}</span>`;
  if (prompt.kind === "cue") return `<span class="explainer-language-cue">${plain(prompt.text)}</span>`;
  return `<span class="explainer-language-marker">${plain(message(lang, "languageMarker", { marker: prompt.marker }))}</span>`;
}

/** Words with gaps as the page shows them without JavaScript: a gap as a blank. */
const gappedHtml = (parts: readonly (string | number)[]): string =>
  parts
    .map((part) => (typeof part === "number" ? `<span class="explainer-language-blank">…</span>` : plain(part)))
    .join("");

/**
 * A language task in `lang`: the task, its material, each item with what to start from (and its gaps), or the table
 * with its gaps, and under "Lösung" every answer with its variants and the explanation, which is all the page shows
 * without JavaScript; with JavaScript the learner writes and checks (language-task.ts).
 */
function languageTaskExercise(
  block: LanguageTask,
  lang: string,
  resolve: (href: string) => string,
  material: MaterialContext,
): string {
  const data = languageTaskData(block, lang, material.audio);
  const target = plain(data.answerLang);
  const solution = questionMessagesIn(lang).solution;
  const also = plain(message(lang, "languageAlso"));
  const unitAnswers = (unit: Unit, shown: string) => {
    const others = answersOf(unit).filter((answer) => answer !== shown);
    return unit.whole && others.length > 0
      ? ` <span class="explainer-language-also">(${also} <span lang="${target}">${others.map(plain).join("; ")}</span>)</span>`
      : "";
  };
  const items =
    data.mode === "table"
      ? [
          `<table class="explainer-language-table">`,
          block.table?.caption === undefined
            ? ""
            : `<caption>${plain(inLanguage(block.table.caption, lang))}</caption>`,
          data.columns === undefined
            ? ""
            : `<thead><tr>${data.columns.map((column) => `<th scope="col">${plain(column)}</th>`).join("")}</tr></thead>`,
          `<tbody lang="${target}">`,
          ...data.units.map(
            (unit) => `<tr>${(unit.cellParts ?? []).map((parts) => `<td>${gappedHtml(parts)}</td>`).join("")}</tr>`,
          ),
          `</tbody></table>`,
        ]
          .filter((part) => part !== "")
          .join("")
      : `<ol class="explainer-language-items">${data.units
          .map((unit) => {
            const prompt = promptHtml(unit.prompt, lang, material.audio);
            const gapped =
              unit.parts === undefined
                ? ""
                : `<span class="explainer-language-gapped" lang="${target}">${gappedHtml(unit.parts)}</span>`;
            // a player is a block of its own: the gapped text follows it, no arrow
            const joiner = unit.prompt?.kind === "audio" ? " " : " → ";
            return `<li>${[prompt, gapped].filter((part) => part !== "").join(joiner)}</li>`;
          })
          .join("")}</ol>`;
  const solutions =
    data.mode === "table"
      ? `<ol class="explainer-language-solutions" lang="${target}">${data.units.map((unit) => `<li>${plain(unit.solution)}</li>`).join("")}</ol>`
      : `<ol class="explainer-language-solutions">${data.units
          .map(
            (unit) =>
              `<li><span lang="${target}">${plain(unit.solution)}</span>${unitAnswers(unit, unit.solution)}</li>`,
          )
          .join("")}</ol>`;
  return [
    `<div class="explainer-exercise explainer-language-task" id="${block.id}">`,
    `<p class="explainer-exercise-label">${plain(message(lang, "exerciseLabel"))}</p>`,
    `<div class="explainer-language-text">${languageTaskText(block, lang, resolve)}</div>`,
    ...(block.material === undefined
      ? []
      : [`<div class="question-material">${renderMaterial(materialIn(block.material, lang), material)}</div>`]),
    block.hint === undefined
      ? ""
      : `<details class="explainer-hint"><summary>${plain(message(lang, "hint"))}</summary>${renderMarkdown(inLanguage(block.hint, lang), resolve)}</details>`,
    `<div class="explainer-language-static">${items}</div>`,
    `<div class="explainer-language-live" hidden></div>`,
    `<details class="explainer-solution"><summary>${plain(solution)}</summary>`,
    solutions,
    block.explanation === undefined ? "" : renderMarkdown(inLanguage(block.explanation, lang), resolve),
    `</details>`,
    `<script type="application/json" class="explainer-exercise-data">${json(data)}</script>`,
    `</div>`,
  ]
    .filter((part) => part !== "")
    .join("\n");
}

/** What the browser reads from a speaking task in `lang`. */
export function speakingTaskData(
  block: SpeakingTask,
  lang: string,
  audio?: MaterialContext["audio"],
): SpeakingTaskData {
  return {
    kind: "speaking",
    lang,
    id: block.id,
    language: block.language,
    items: block.items.map((item) => {
      const spoken = audio?.(item.audio)?.text;
      return {
        audio: item.audio,
        player: audioHtml(audio?.(item.audio), lang),
        ...(item.text === undefined ? {} : { text: item.text }),
        ...(spoken === undefined ? {} : { spoken }),
      };
    }),
    texts: Object.fromEntries(SPEAKING_TEXTS.map((key) => [key, message(lang, key)])) as SpeakingTaskData["texts"],
  };
}

/** The task of a speaking task as the learner reads it: its own, or a text. */
export function speakingTaskText(block: SpeakingTask, lang: string, resolve: (href: string) => string): string {
  return block.task !== undefined
    ? renderMarkdown(inLanguage(block.task, lang), resolve)
    : `<p>${plain(message(lang, "speakTask"))}</p>`;
}

/**
 * A speaking task in `lang`: the task, each model with its player and its text, and the note that recording needs
 * JavaScript, which is all the page shows without it; with JavaScript the learner records and rates (speaking-task.ts).
 */
function speakingTaskExercise(
  block: SpeakingTask,
  lang: string,
  resolve: (href: string) => string,
  material: MaterialContext,
): string {
  const data = speakingTaskData(block, lang, material.audio);
  const items = data.items
    .map((item, index) => {
      const text =
        item.text === undefined
          ? ""
          : `<span class="explainer-speaking-sentence" lang="${plain(data.language)}">${plain(item.text)}</span>`;
      return `<li data-item="${index}">${text}${item.player}</li>`;
    })
    .join("");
  return [
    `<div class="explainer-exercise explainer-speaking-task" id="${block.id}">`,
    `<p class="explainer-exercise-label">${plain(message(lang, "exerciseLabel"))}</p>`,
    `<div class="explainer-speaking-text">${speakingTaskText(block, lang, resolve)}</div>`,
    block.hint === undefined
      ? ""
      : `<details class="explainer-hint"><summary>${plain(message(lang, "hint"))}</summary>${renderMarkdown(inLanguage(block.hint, lang), resolve)}</details>`,
    `<ol class="explainer-speaking-items explainer-speaking-static">${items}</ol>`,
    `<p class="explainer-speaking-nojs">${plain(message(lang, "speakNoJs"))}</p>`,
    `<div class="explainer-speaking-live" hidden></div>`,
    `<details class="explainer-solution"><summary>${plain(questionMessagesIn(lang).solution)}</summary>`,
    `<ol class="explainer-speaking-solutions" lang="${plain(data.language)}">${data.items
      .map((item) => `<li>${plain(item.spoken ?? item.text ?? "")}</li>`)
      .join("")}</ol>`,
    `</details>`,
    `<script type="application/json" class="explainer-exercise-data">${json(data)}</script>`,
    `</div>`,
  ]
    .filter((part) => part !== "")
    .join("\n");
}

/** What the browser reads from an exercise in `lang` (script.explainer-exercise-data). */
export function exerciseData(
  block: Exercise,
  lang: string,
  all: Readonly<Record<string, readonly DataRecord[]>>,
  resolve: (href: string) => string,
  audio?: MaterialContext["audio"],
): ExerciseData {
  if (block.type === "generated") return generatedData(block, lang, all, resolve);
  if (block.type === "open-task") return openTaskData(block, lang, resolve);
  if (block.type === "language-task") return languageTaskData(block, lang, audio);
  if (block.type === "speaking-task") return speakingTaskData(block, lang, audio);
  return questionData(block, lang);
}

/**
 * An open task in `lang`: the task, the points of a good answer with a link to each one's source, and the model answer
 * under "Lösung", which is all the page shows without JavaScript; with JavaScript the learner answers first (explainer.ts).
 */
function openTaskExercise(
  block: OpenTask,
  lang: string,
  resolve: (href: string) => string,
  storage: string,
  material: MaterialContext,
): string {
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
    ...(block.material === undefined
      ? []
      : [`<div class="question-material">${renderMaterial(materialIn(block.material, lang), material)}</div>`]),
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
  const data = dataOf(spec, all);
  const templates = templatesOf(spec, [lang], data, resolve);
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
  if (block.type === "open-task") return openTaskExercise(block, lang, resolve, storage, material);
  if (block.type === "language-task") return languageTaskExercise(block, lang, resolve, material);
  if (block.type === "speaking-task") return speakingTaskExercise(block, lang, resolve, material);
  return questionExercise(block, lang, material);
}
