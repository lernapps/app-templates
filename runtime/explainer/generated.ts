// Generated exercises (`generated`), the explainer's native notation for exercises drawn from a seed, in the style of
// property-based testing: arbitraries (`given`), preconditions (`where`), a task template with an optional figure,
// an answer with a comparator, typical mistakes with their messages, a hint and the steps, and examples: answers
// the build runs through the check of every seed's task (exampleProblems), never shown to learners. The same code runs at build
// time (the worked tasks without JavaScript, the property test over fixed seeds) and in the browser (a live task for
// any seed, "Neue Aufgabe"), so both agree. The comparator maps the answer onto the quiz's answer kinds: number,
// choice, order, set and pairs become the quiz's number, single-choice, ordering, multiple-choice and matching
// questions, so controls, checker and feedback come from the quiz runtime.
//
// Templates are rendered by the build (restricted Markdown, formulas as MathML) with each placeholder {{name}} as a
// token ⟦name⟧ (inside a formula \text{⟦name⟧}); fill() puts in the values of a task, so the browser needs no Markdown
// or formula renderer. No Node and no DOM here.
//
// A placeholder is always written with two braces and nothing else inside: {{G}}, {{e.name}}, {{answer}}, in prose
// and in formulas alike. One brace is never a placeholder: in prose {G} is an error, in a formula it is a LaTeX group,
// so a bare letter (G, {G}, \frac{W}{G}) is always the letter. The one LaTeX form this takes away, a double group
// around a lone name ({{G}}), means the same as the letter alone, so nothing is lost; any other group ({{G}^2},
// {{G} + 1}) stays a group. To fill in a value where the formula needs a group, keep the group: \frac{{{W}}}{{{G}}}.
// Two braces with spaces inside ({{ G }}) are an error everywhere, as they were most likely meant as a placeholder.
import {
  ExpressionError,
  evaluate,
  Localized,
  parse,
  same,
  type Expression,
  type Rec,
  type Value,
  variables,
} from "./expression.ts";
import { bar, hundredGrid } from "./figures.ts";
import { Fraction } from "./fraction.ts";
import {
  hash,
  isCorrect,
  parseNumber,
  random,
  rightAnswer,
  shuffled,
  type Answer,
  type Question,
} from "../shared/questions/question.ts";
import { verdict } from "../shared/examples.ts";
import { inLanguage, type Text } from "../shared/languages.ts";

/** A literal of a list in the content: a number, a string, or a text by language. */
export type Literal = number | string | Readonly<Record<string, string>>;
/** A list of literals, or the records of a data file src/data/<name>.yaml. */
export type Source = readonly Literal[] | { readonly data: string };

/** One arbitrary of `given`: exactly one of int, decimal, oneOf, pick (with from), shuffle. */
export interface Arbitrary {
  readonly int?: readonly [number, number];
  readonly decimal?: readonly [number, number];
  readonly step?: number;
  readonly oneOf?: readonly Literal[];
  readonly pick?: number;
  readonly from?: Source;
  readonly distinct?: boolean;
  readonly shuffle?: Source;
}

export interface GeneratedFigure {
  readonly kind: "hundred-grid" | "bar";
  readonly filled?: number | string;
  readonly part?: number | string;
  readonly whole?: number | string;
  readonly alt?: Text;
}

export interface NumberCompare {
  readonly format?: "integer" | "decimal" | "money" | "percent";
  readonly decimals?: number;
  readonly tolerance?: number;
  readonly unit?: Text;
}

export type Compare =
  | "number"
  | "order"
  | "pairs"
  | { readonly number: NumberCompare }
  | { readonly choice: readonly Literal[] | string }
  | { readonly set: readonly Literal[] | string }
  | { readonly pairs: { readonly left: string; readonly right: string } };

export interface Generated {
  readonly type: "generated";
  readonly id: string;
  readonly given: Readonly<Record<string, Arbitrary>>;
  readonly where?: readonly string[];
  readonly task: { readonly text: Text; readonly figure?: GeneratedFigure };
  readonly answer: { readonly value: string; readonly compare: Compare };
  readonly mistakes?: readonly { readonly value: string; readonly message: Text }[];
  readonly hint?: Text;
  readonly steps?: readonly Text[];
  /** The sentence above the live task; the page's own when absent. */
  readonly practice?: Text;
  /** Whether the worked tasks show with JavaScript too ("always"); by default they show only without it. */
  readonly workedTasks?: "without-javascript" | "always";
  /**
   * Test cases for the build, never shown to learners: answers as expressions of given and answer, which the check
   * of every seed's task must accept or reject (exampleProblems).
   */
  readonly examples?: { readonly accepted?: readonly string[]; readonly rejected?: readonly string[] };
}

/** The records of the data files, by name. */
export type Data = Readonly<Record<string, readonly Readonly<Record<string, number | boolean | Text>>[]>>;

/** The templates of an exercise in one language, rendered by the build, with tokens for the placeholders. */
export interface LanguageTemplates {
  /** The task, inline HTML (no paragraph). */
  task: string;
  steps: string[];
  hint?: string | undefined;
  /** The mistakes' messages, plain text. */
  messages: string[];
  /** The figure's alternative text, plain text. */
  alt?: string | undefined;
}
export type Templates = Readonly<Record<string, LanguageTemplates>>;

/** A task drawn from a seed: the values of `given`, the answer, the mistakes, the options of a choice or set. */
export interface Task {
  seed: number;
  values: Record<string, Value>;
  answer: Value;
  mistakes: Value[];
  options?: Value[];
}

/** How many draws a seed may take until `where` holds. */
const ATTEMPTS = 100;
export const LOCALES: Readonly<Record<string, string>> = { de: "de-DE", en: "en-GB" };
const PATH = String.raw`[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*`;
/** A placeholder: two braces around a name or a name's field, nothing else inside. */
const PLACEHOLDER = new RegExp(String.raw`\{\{(${PATH})\}\}`, "g");
/** What looks meant as a placeholder but is not one: one brace in prose, or spaces inside two braces. */
const ONE_BRACE = new RegExp(String.raw`(?<!\{)\{(${PATH})\}(?!\})`, "g");
const SPACED = new RegExp(String.raw`\{\{\s*(${PATH})\s*\}\}`, "g");
/** A formula ($…$) or a run of prose, in a template. */
const SEGMENT = /\$((?:\\.|[^\\$\n])+?)\$|([^$]+)/g;

// ---------------------------------------------------------------------------------------------- the comparator

type Kind =
  | { kind: "number"; decimals: number; tolerance: Fraction; unit?: Text; money: boolean }
  | { kind: "choice"; options: readonly Literal[] | string }
  | { kind: "order" }
  | { kind: "set"; options: readonly Literal[] | string }
  | { kind: "pairs"; left?: string; right?: string };

/** What the comparator of an exercise is. */
export function kindOf(compare: Compare): Kind {
  if (compare === "number") return { kind: "number", decimals: 2, tolerance: Fraction.of(0), money: false };
  if (compare === "order") return { kind: "order" };
  if (compare === "pairs") return { kind: "pairs" };
  if ("number" in compare) {
    const { format = "decimal", decimals, tolerance = 0, unit } = compare.number;
    const places = decimals ?? (format === "integer" ? 0 : 2);
    const shown = unit ?? (format === "money" ? "€" : format === "percent" ? "%" : undefined);
    return {
      kind: "number",
      decimals: places,
      tolerance: Fraction.from(tolerance),
      money: format === "money",
      ...(shown === undefined ? {} : { unit: shown }),
    };
  }
  if ("choice" in compare) return { kind: "choice", options: compare.choice };
  if ("set" in compare) return { kind: "set", options: compare.set };
  return { kind: "pairs", left: compare.pairs.left, right: compare.pairs.right };
}

// ------------------------------------------------------------------------------------------------ the values

const literal = (value: Literal): Value =>
  typeof value === "number" ? Fraction.from(value) : typeof value === "string" ? value : new Localized(value);

function record(source: Readonly<Record<string, number | boolean | Text>>): Rec {
  const fields: Record<string, Value> = {};
  for (const [key, value] of Object.entries(source)) {
    fields[key] =
      typeof value === "number"
        ? Fraction.from(value)
        : typeof value === "boolean" || typeof value === "string"
          ? value
          : new Localized(value);
  }
  return fields;
}

function items(source: Source, data: Data): Value[] {
  if (Array.isArray(source)) return (source as readonly Literal[]).map(literal);
  const name = (source as { data: string }).data;
  const records = data[name];
  if (records === undefined) throw new ExpressionError(`src/data/${name}.yaml does not exist`);
  return records.map(record);
}

/** The value of one arbitrary, drawn with `next`. */
function draw(arbitrary: Arbitrary, next: () => number, data: Data): Value {
  const range = arbitrary.int ?? arbitrary.decimal;
  if (range !== undefined) {
    const [min, max] = range;
    const step = Fraction.from(arbitrary.step ?? 1);
    const low = Fraction.from(min);
    const count = Math.floor(Fraction.from(max).sub(low).div(step).toNumber() + 1e-9) + 1;
    return low.add(step.mul(Fraction.of(Math.floor(next() * count))));
  }
  if (arbitrary.oneOf !== undefined) {
    const list = arbitrary.oneOf;
    return literal(list[Math.floor(next() * list.length)] as Literal);
  }
  if (arbitrary.shuffle !== undefined) {
    const list = items(arbitrary.shuffle, data);
    return shuffled(list.length, Math.floor(next() * 2 ** 31)).map((index) => list[index] as Value);
  }
  const list = items(arbitrary.from ?? [], data);
  const count = arbitrary.pick ?? 1;
  const picked: Value[] = [];
  if (arbitrary.distinct === true) {
    const order = shuffled(list.length, Math.floor(next() * 2 ** 31));
    for (const index of order.slice(0, count)) picked.push(list[index] as Value);
  } else {
    for (let i = 0; i < count; i++) picked.push(list[Math.floor(next() * list.length)] as Value);
  }
  return count === 1 && arbitrary.pick === 1 ? (picked[0] as Value) : picked;
}

/** The parsed expressions of an exercise, once per exercise. */
interface Compiled {
  where: Expression[];
  answer: Expression;
  mistakes: Expression[];
  options?: Expression;
  figure: Partial<Record<"filled" | "part" | "whole", Expression>>;
}
const compiledCache = new WeakMap<Generated, Compiled>();
function compiled(spec: Generated): Compiled {
  let found = compiledCache.get(spec);
  if (found === undefined) {
    const kind = kindOf(spec.answer.compare);
    const figure: Compiled["figure"] = {};
    for (const key of ["filled", "part", "whole"] as const) {
      const value = spec.task.figure?.[key];
      if (value !== undefined) figure[key] = parse(String(value));
    }
    found = {
      where: (spec.where ?? []).map((source) => parse(source)),
      answer: parse(spec.answer.value),
      mistakes: (spec.mistakes ?? []).map((mistake) => parse(mistake.value)),
      figure,
      ...((kind.kind === "choice" || kind.kind === "set") && typeof kind.options === "string"
        ? { options: parse(kind.options) }
        : {}),
    };
    compiledCache.set(spec, found);
  }
  return found;
}

/** The values of `given` for a seed and an attempt. */
function values(spec: Generated, seed: number, attempt: number, data: Data): Record<string, Value> {
  const next = random(hash(`${spec.id}#${seed}#${attempt}`));
  const drawn: Record<string, Value> = {};
  for (const [name, arbitrary] of Object.entries(spec.given)) drawn[name] = draw(arbitrary, next, data);
  return drawn;
}

/** Whether every precondition holds for these values. */
function holds(spec: Generated, env: Record<string, Value>): boolean {
  return compiled(spec).where.every((condition, index) => {
    const value = evaluate(condition, env);
    if (typeof value !== "boolean") {
      throw new ExpressionError(`where[${index}] needs true or false, not a value`);
    }
    return value;
  });
}

/** Thrown when no draw of a seed passes `where`. */
export class StarvedError extends ExpressionError {}

/** The task of `seed`: the first draw whose values pass `where`, with the answer, the mistakes and the options. */
export function generate(spec: Generated, seed: number, data: Data): Task {
  const code = compiled(spec);
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const env = values(spec, seed, attempt, data);
    if (!holds(spec, env)) continue;
    const answer = evaluate(code.answer, env);
    const task: Task = { seed, values: env, answer, mistakes: code.mistakes.map((mistake) => evaluate(mistake, env)) };
    const kind = kindOf(spec.answer.compare);
    if (kind.kind === "choice" || kind.kind === "set") {
      const options =
        code.options === undefined ? (kind.options as readonly Literal[]).map(literal) : evaluate(code.options, env);
      if (!Array.isArray(options)) throw new ExpressionError(`the options of ${kind.kind} are not a list`);
      task.options = [...(options as Value[])];
    }
    return task;
  }
  throw new StarvedError(`where holds in none of ${ATTEMPTS} draws for seed ${seed}`);
}

// ------------------------------------------------------------------------------------------- texts of a task

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const formats = new Map<string, Intl.NumberFormat>();
/** A number as the page shows it: up to six decimals, no grouping (a learner would type 1500, not 1.500). */
export function formatNumber(value: Fraction, lang: string, decimals?: number): string {
  const key = `${lang}:${decimals ?? ""}`;
  let format = formats.get(key);
  if (format === undefined) {
    format = new Intl.NumberFormat(LOCALES[lang] ?? lang, {
      maximumFractionDigits: decimals ?? 6,
      ...(decimals === undefined ? {} : { minimumFractionDigits: decimals }),
      useGrouping: false,
    });
    formats.set(key, format);
  }
  return format.format(value.toNumber());
}

/** A value as the learner reads it, in `lang`. */
export function label(value: Value, lang: string): string {
  if (value instanceof Fraction) return formatNumber(value, lang);
  if (value instanceof Localized) return value.in(lang);
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return (value as readonly Value[]).map((item) => label(item, lang)).join(", ");
  throw new ExpressionError("a record cannot be shown; name one of its fields, e.g. {{e.name}}");
}

/** The answer as the learner reads it: a sum of money with two decimals when it has any. */
function answerLabel(spec: Generated, task: Task, lang: string): string {
  const kind = kindOf(spec.answer.compare);
  if (kind.kind === "number" && task.answer instanceof Fraction) {
    return formatNumber(task.answer, lang, kind.money && !task.answer.isInteger() ? 2 : undefined);
  }
  return label(task.answer, lang);
}

/** A template's placeholders as tokens: {{G}} becomes ⟦G⟧, inside a formula ($…$) {\text{⟦G⟧}}. */
export function tokenize(text: string): string {
  return text.replace(SEGMENT, (whole, math: string | undefined, prose: string | undefined) =>
    math !== undefined
      ? `$${math.replace(PLACEHOLDER, (_placeholder, path: string) => `{\\text{⟦${path}⟧}}`)}$`
      : (prose ?? whole).replace(PLACEHOLDER, (_placeholder, path: string) => `⟦${path}⟧`),
  );
}

/** The placeholders of a template, by their path (G, e.name, answer). */
export function placeholdersIn(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "");
}

/** The problems of the placeholders of one template: unknown roots, one brace in prose, spaces inside. */
export function placeholderProblems(text: string, known: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const list = [...known].map((name) => `{{${name}}}`).join(", ");
  for (const path of placeholdersIn(text)) {
    const root = path.split(".")[0] ?? "";
    if (!known.has(root)) {
      problems.push(
        `{{${path}}} is an unknown placeholder: ${root} is not declared in given; declare it, or use one of ${list}`,
      );
    }
  }
  for (const match of text.matchAll(SPACED)) {
    if (match[0] !== `{{${match[1]}}}`) {
      problems.push(`${match[0]} has spaces inside; a placeholder is written {{${match[1]}}}, without spaces`);
    }
  }
  for (const match of text.matchAll(SEGMENT)) {
    if (match[2] === undefined) continue;
    for (const one of match[2].matchAll(ONE_BRACE)) {
      const root = (one[1] ?? "").split(".")[0] ?? "";
      if (known.has(root)) {
        problems.push(`{${one[1]}} has one pair of braces; a placeholder is written with two: {{${one[1]}}}`);
      }
    }
  }
  return problems;
}

/** One template of an exercise as written, in one language: where it is, and its text. */
export interface Written {
  /** The path in the exercise; for a text by language it ends with the language. */
  path: (string | number)[];
  lang?: string;
  text: string;
}

/** The templates of an exercise as written: the task, the figure's alt, the steps, the hint and the messages. */
export function writtenTemplates(spec: Generated): Written[] {
  const written: Written[] = [];
  const add = (path: (string | number)[], text: Text | undefined) => {
    if (text === undefined) return;
    if (typeof text === "string") written.push({ path, text });
    else for (const [lang, each] of Object.entries(text)) written.push({ path: [...path, lang], lang, text: each });
  };
  add(["task", "text"], spec.task.text);
  add(["task", "figure", "alt"], spec.task.figure?.alt);
  (spec.steps ?? []).forEach((step, index) => add(["steps", index], step));
  add(["hint"], spec.hint);
  (spec.mistakes ?? []).forEach((mistake, index) => add(["mistakes", index, "message"], mistake.message));
  return written;
}

/** The problems of the placeholders of an exercise's templates, each at its path; the figure's alt also has {{figure.…}}. */
export function templateProblems(spec: Generated): { path: (string | number)[]; lang?: string; message: string }[] {
  const declared = [...Object.keys(spec.given), "answer"];
  return writtenTemplates(spec).flatMap(({ path, lang, text }) => {
    const known = new Set(path[1] === "figure" ? [...declared, "figure"] : declared);
    return placeholderProblems(text, known).map((message) => ({
      path,
      ...(lang === undefined ? {} : { lang }),
      message,
    }));
  });
}

/**
 * The variables of `given` that the exercise never uses: in no placeholder of its templates, and in none of the
 * expressions of the figure, the answer (with the options of a choice or set) and the mistakes. `where` does not
 * count: a value drawn only to be filtered is never seen.
 */
export function unusedVariables(spec: Generated): string[] {
  const used = new Set<string>();
  for (const { text } of writtenTemplates(spec))
    for (const path of placeholdersIn(text)) used.add(path.split(".")[0] ?? "");
  const expressions = [spec.answer.value, ...(spec.mistakes ?? []).map((mistake) => mistake.value)];
  const figure = spec.task.figure;
  for (const key of ["filled", "part", "whole"] as const) {
    if (typeof figure?.[key] === "string") expressions.push(figure[key]);
  }
  const compare = spec.answer.compare;
  if (typeof compare === "object") {
    for (const key of ["choice", "set"] as const) {
      const options = (compare as Record<string, unknown>)[key];
      if (typeof options === "string") expressions.push(options);
    }
  }
  for (const source of expressions) {
    try {
      variables(parse(source), used);
    } catch {
      // an expression that does not parse is reported on its own
    }
  }
  return Object.keys(spec.given).filter((name) => !used.has(name));
}

/** The value of a placeholder's path in a task, or undefined when it has none. */
function placeholderValue(
  spec: Generated,
  task: Task,
  path: string,
  lang: string,
): { text: string; number?: Fraction } | undefined {
  if (path === "answer") {
    return { text: answerLabel(spec, task, lang), ...(task.answer instanceof Fraction ? { number: task.answer } : {}) };
  }
  try {
    const value = evaluate(parse(path), task.values);
    return { text: label(value, lang), ...(value instanceof Fraction ? { number: value } : {}) };
  } catch {
    return undefined;
  }
}

/** A template with the values of a task: HTML (escaped, numbers in formulas as <mn>) or plain text. */
export function fill(
  template: string,
  spec: Generated,
  task: Task,
  lang: string,
  mode: "html" | "text" = "html",
): string {
  const withMath =
    mode === "html"
      ? template.replace(/<mtext>⟦([^⟧]+)⟧<\/mtext>/g, (_whole, path: string) => {
          const value = placeholderValue(spec, task, path, lang);
          if (value === undefined) return `<mtext>{{${escape(path)}}}</mtext>`;
          if (value.number === undefined) return `<mtext>${escape(value.text)}</mtext>`;
          const negative = value.number.compare(Fraction.of(0)) < 0;
          const digits = escape(negative ? value.text.replace(/^[-−]/, "") : value.text);
          return negative ? `<mo>−</mo><mn>${digits}</mn>` : `<mn>${digits}</mn>`;
        })
      : template;
  return withMath.replace(/⟦([^⟧]+)⟧/g, (_whole, path: string) => {
    const value = placeholderValue(spec, task, path, lang);
    if (value === undefined) return `{{${path}}}`;
    return mode === "html" ? escape(value.text) : value.text;
  });
}

/**
 * A template as its author wrote it (restricted Markdown, formulas as $…$) with each placeholder replaced by its value
 * as the learner reads it, in `lang`: the text a tutor file gives (tutor.ts).
 */
export function fillSource(text: Text, spec: Generated, task: Task, lang: string): string {
  return inLanguage(text, lang).replace(
    PLACEHOLDER,
    (whole, path: string) => placeholderValue(spec, task, path, lang)?.text ?? whole,
  );
}

const templatesIn = (templates: Templates, lang: string): LanguageTemplates =>
  templates[lang] ?? templates["de"] ?? { task: "", steps: [], messages: [] };

/** The task's text as HTML, in `lang`. */
export function taskText(spec: Generated, task: Task, lang: string, templates: Templates): string {
  return fill(templatesIn(templates, lang).task, spec, task, lang);
}

/** The steps of the solution as HTML, in `lang`. */
export function stepsOf(spec: Generated, task: Task, lang: string, templates: Templates): string[] {
  return templatesIn(templates, lang).steps.map((step) => fill(step, spec, task, lang));
}

/** The hint as HTML, in `lang`, if the exercise has one. */
export function hintOf(spec: Generated, task: Task, lang: string, templates: Templates): string | undefined {
  const hint = templatesIn(templates, lang).hint;
  return hint === undefined ? undefined : fill(hint, spec, task, lang);
}

/** The text of HTML, as a learner reads it: tags left out, entities resolved, white space folded. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** The figure's values for a task. */
function figureValues(spec: Generated, task: Task): Partial<Record<"filled" | "part" | "whole", Value>> {
  const found: Partial<Record<"filled" | "part" | "whole", Value>> = {};
  for (const [key, expression] of Object.entries(compiled(spec).figure)) {
    found[key as "filled"] = evaluate(expression, task.values);
  }
  return found;
}

/** What is wrong with a figure's values, if anything. */
function figureProblem(
  spec: Generated,
  values: Partial<Record<"filled" | "part" | "whole", Value>>,
): string | undefined {
  const figure = spec.task.figure;
  if (figure === undefined) return undefined;
  const number = (key: "filled" | "part" | "whole") => {
    const value = values[key];
    return value instanceof Fraction ? value : undefined;
  };
  if (figure.kind === "hundred-grid") {
    const filled = number("filled");
    if (filled === undefined || !filled.isInteger() || filled.toNumber() < 0 || filled.toNumber() > 100) {
      return "filled of a hundred-grid is a whole number from 0 to 100";
    }
    return undefined;
  }
  const part = number("part");
  const whole = number("whole");
  if (part === undefined || whole === undefined || part.toNumber() < 0 || whole.toNumber() <= 0) {
    return "part and whole of a bar are numbers, part at least 0 and whole more than 0";
  }
  return undefined;
}

/** The figure's alternative text for a task, plain text, with its own values as {{figure.filled}} and so on. */
function altOf(
  spec: Generated,
  task: Task,
  lang: string,
  templates: Templates,
  values: Readonly<Record<string, Value | undefined>> = figureValues(spec, task),
): string {
  const env: Task = { ...task, values: { ...task.values } };
  for (const [key, value] of Object.entries(values)) env.values[`figure_${key}`] = value as Value;
  return fill(
    (templatesIn(templates, lang).alt ?? "").replace(/⟦figure\.(\w+)⟧/g, "⟦figure_$1⟧"),
    spec,
    env,
    lang,
    "text",
  );
}

/** The alternative text, or none when the figure's values are not defined (reported on their own). */
function safeAlt(spec: Generated, task: Task, lang: string, templates: Templates): string {
  try {
    return altOf(spec, task, lang, templates);
  } catch {
    return "";
  }
}

/** The figure of a task, unsolved, as inline SVG with its alternative text; undefined without a figure. */
export function figureOf(spec: Generated, task: Task, lang: string, templates: Templates): string | undefined {
  const figure = spec.task.figure;
  if (figure === undefined) return undefined;
  const values = figureValues(spec, task);
  if (figureProblem(spec, values) !== undefined) return undefined;
  const alt = altOf(spec, task, lang, templates, values);
  const n = (value: Value | undefined) => (value instanceof Fraction ? value.toNumber() : 0);
  return figure.kind === "hundred-grid"
    ? hundredGrid(n(values.filled), alt)
    : bar(n(values.part), n(values.whole), alt, LOCALES[lang] ?? lang, false);
}

// ------------------------------------------------------------------------------------- the quiz's question

const listOf = (value: Value, what: string): readonly Value[] => {
  if (!Array.isArray(value)) throw new ExpressionError(`the answer of ${what} is a list`);
  return value as readonly Value[];
};

/** The task as the quiz's question of the comparator's kind, in `lang`. */
export function questionFor(spec: Generated, task: Task, lang: string, templates: Templates): Question {
  const kind = kindOf(spec.answer.compare);
  const base = {
    id: `${spec.id}-${task.seed}`,
    text: plainText(taskText(spec, task, lang, templates)),
    explanation: "",
    links: [],
  };
  switch (kind.kind) {
    case "number": {
      if (!(task.answer instanceof Fraction)) throw new ExpressionError("the answer of number is a number");
      return {
        ...base,
        type: "number",
        answer: task.answer.toNumber(),
        tolerance: kind.tolerance.toNumber(),
        ...(kind.unit === undefined ? {} : { unit: inLanguage(kind.unit, lang) }),
      };
    }
    case "choice":
    case "set": {
      const answers = kind.kind === "set" ? listOf(task.answer, "set") : [task.answer];
      return {
        ...base,
        type: kind.kind === "set" ? "multiple-choice" : "single-choice",
        options: (task.options ?? []).map((option) => ({
          text: label(option, lang),
          correct: answers.some((answer) => same(answer, option)),
          info: "",
        })),
      };
    }
    case "order":
      return { ...base, type: "ordering", items: listOf(task.answer, "order").map((item) => label(item, lang)) };
    case "pairs":
      return {
        ...base,
        type: "matching",
        pairs: pairValues(spec, task.answer).map(([left, right]) => ({
          left: label(left, lang),
          right: label(right, lang),
        })),
      };
  }
}

/** The pairs of a pairs answer, as values: [left, right]. */
function pairValues(spec: Generated, value: Value): [Value, Value][] {
  const kind = kindOf(spec.answer.compare);
  return listOf(value, "pairs").map((item) => {
    if (kind.kind === "pairs" && kind.left !== undefined && kind.right !== undefined) {
      const fields = item as Rec;
      return [fields[kind.left] ?? "", fields[kind.right] ?? ""];
    }
    if (!Array.isArray(item) || item.length !== 2)
      throw new ExpressionError("each pair is a list of two: [left, right]");
    return [item[0] as Value, item[1] as Value];
  });
}

/** The learner's answer that gives `value` (e.g. a mistake) through the controls of the task's question. */
function answerGiving(spec: Generated, task: Task, value: Value): Answer {
  const kind = kindOf(spec.answer.compare);
  const index = (list: readonly Value[], item: Value) => list.findIndex((other) => same(other, item));
  switch (kind.kind) {
    case "number": {
      if (!(value instanceof Fraction)) throw new ExpressionError("a mistake of number is a number");
      const places = Math.min(value.decimals(), Math.max(kind.decimals, 2));
      return formatNumber(value.round(places), "de");
    }
    case "choice": {
      const at = index(task.options ?? [], value);
      if (at < 0) throw new ExpressionError(`${label(value, "de")} is not one of the choices`);
      return at;
    }
    case "set": {
      const chosen = listOf(value, "set").map((item) => index(task.options ?? [], item));
      if (chosen.some((at) => at < 0)) throw new ExpressionError(`${label(value, "de")} are not all among the options`);
      return chosen.sort((a, b) => a - b);
    }
    case "order": {
      const order = listOf(value, "order");
      return listOf(task.answer, "order").map((item) => index(order, item));
    }
    case "pairs": {
      const right = pairValues(spec, task.answer);
      const given = pairValues(spec, value);
      return right.map(([left]) => {
        const chosen = given.find(([other]) => same(other, left))?.[1];
        return chosen === undefined ? -1 : right.findIndex(([, other]) => same(other, chosen));
      });
    }
  }
}

/**
 * The learner's answer that gives `value`, an example, through the controls of the task's question: as answerGiving,
 * but a number as it is, with up to six decimals, so an example just outside the tolerance stays outside.
 */
function exampleGiving(spec: Generated, task: Task, value: Value): Answer {
  if (kindOf(spec.answer.compare).kind !== "number") return answerGiving(spec, task, value);
  if (!(value instanceof Fraction)) throw new ExpressionError("an example of number is a number");
  return formatNumber(value, "de");
}

/** The learner's answer that gives the mistake `index` of a task, through the controls of its question. */
export function answerFor(spec: Generated, task: Task, _question: Question, index: number): Answer {
  return answerGiving(spec, task, task.mistakes[index] as Value);
}

/** Whether two answers to `question` are the same, a number within `slack`. */
function sameAnswer(question: Question, a: Answer, b: Answer, slack: number): boolean {
  if (question.type === "number") {
    const left = typeof a === "string" ? parseNumber(a, question.unit) : undefined;
    const right = typeof b === "string" ? parseNumber(b, question.unit) : undefined;
    return left !== undefined && right !== undefined && Math.abs(left - right) <= slack + 1e-9;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const sorted = (list: readonly number[]) =>
      question.type === "multiple-choice" ? [...list].sort((a, b) => a - b) : list;
    return sorted(a).join() === sorted(b).join();
  }
  return a === b;
}

/** The message of the first mistake the learner's wrong answer makes, in `lang`; undefined when it makes none. */
export function diagnose(
  spec: Generated,
  task: Task,
  question: Question,
  answer: Answer,
  lang: string,
  templates: Templates,
): string | undefined {
  if (isCorrect(question, answer)) return undefined;
  const kind = kindOf(spec.answer.compare);
  // a mistake typed rounded to the answer's decimals still counts as that mistake
  const slack =
    kind.kind === "number" ? Math.max(kind.tolerance.toNumber(), 0.5 * 10 ** -Math.max(kind.decimals, 2)) : 0;
  const messages = templatesIn(templates, lang).messages;
  for (const [index] of task.mistakes.entries()) {
    try {
      if (sameAnswer(question, answer, answerFor(spec, task, question, index), slack)) {
        return fill(messages[index] ?? "", spec, task, lang, "text");
      }
    } catch {
      // a mistake the controls cannot give
    }
  }
  return undefined;
}

// ------------------------------------------------------------------------------------ the property test

/** A problem of an exercise: where in it, in which language, and what. */
export interface GeneratedProblem {
  path: (string | number)[];
  lang?: string;
  message: string;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The numbers in a text. */
const numbersIn = (text: string): number[] =>
  [...text.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => Number(match[0].replace(",", ".")));

/** Whether the answer is in the comparator's format; a problem otherwise. */
function formatProblem(spec: Generated, task: Task, lang: string): string | undefined {
  const kind = kindOf(spec.answer.compare);
  const shown = () => label(task.answer, lang);
  switch (kind.kind) {
    case "number":
      if (!(task.answer instanceof Fraction)) return `the answer is not a number, but compare is number`;
      if (task.answer.decimals() > kind.decimals) {
        return `the answer ${shown()} has more than ${kind.decimals} decimals; round it in the answer, or narrow given or where`;
      }
      return undefined;
    case "choice":
      if (!(task.options ?? []).some((option) => same(option, task.answer)))
        return `the answer ${shown()} is not one of the choices`;
      return undefined;
    case "set": {
      if (!Array.isArray(task.answer)) return "the answer of set is not a list";
      const missing = (task.answer as readonly Value[]).find(
        (item) => !(task.options ?? []).some((option) => same(option, item)),
      );
      return missing === undefined ? undefined : `${label(missing, lang)} of the answer is not one of the options`;
    }
    case "order": {
      if (!Array.isArray(task.answer) || task.answer.length < 2) return "the answer of order is a list of at least two";
      const texts = (task.answer as readonly Value[]).map((item) => label(item, lang));
      return new Set(texts).size === texts.length ? undefined : "the answer of order has an item twice";
    }
    case "pairs": {
      const pairs = pairValues(spec, task.answer).map(([left, right]) => [label(left, lang), label(right, lang)]);
      if (pairs.length < 2) return "the answer of pairs is a list of at least two";
      const lefts = new Set(pairs.map(([left]) => left));
      const rights = new Set(pairs.map(([, right]) => right));
      return lefts.size === pairs.length && rights.size === pairs.length
        ? undefined
        : "the answer of pairs has an entry twice";
    }
  }
}

/** The problems of one seed's task. */
function seedProblems(
  spec: Generated,
  seed: number,
  data: Data,
  templates: Templates,
  languages: readonly string[],
): GeneratedProblem[] {
  const problems: GeneratedProblem[] = [];
  const kind = kindOf(spec.answer.compare);
  // the answer, the mistakes and the options are defined
  let task: Task;
  try {
    task = generate(spec, seed, data);
  } catch (error) {
    if (error instanceof StarvedError)
      return [
        {
          path: ["where"],
          message: `for seed ${seed} ${message(error).replace(/ for seed \d+$/, "")}; loosen it or narrow given`,
        },
      ];
    const code = compiled(spec);
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const env = values(spec, seed, attempt, data);
      try {
        if (!holds(spec, env)) continue;
      } catch (inner) {
        return [{ path: ["where"], message: `for seed ${seed} where is not defined: ${message(inner)}` }];
      }
      try {
        evaluate(code.answer, env);
      } catch (inner) {
        return [
          { path: ["answer", "value"], message: `for seed ${seed} the answer is not defined: ${message(inner)}` },
        ];
      }
      for (const [index, mistake] of code.mistakes.entries()) {
        try {
          evaluate(mistake, env);
        } catch (inner) {
          return [
            {
              path: ["mistakes", index, "value"],
              message: `for seed ${seed} the mistake is not defined: ${message(inner)}`,
            },
          ];
        }
      }
      return [
        { path: ["answer", "compare"], message: `for seed ${seed} the options are not defined: ${message(error)}` },
      ];
    }
    return [{ path: ["where"], message: `for seed ${seed} ${message(error)}` }];
  }
  const lang = languages[0] ?? "de";
  // the answer is in its format and passes its own comparator
  let format: string | undefined;
  try {
    format = formatProblem(spec, task, lang);
  } catch (error) {
    format = message(error);
  }
  if (format !== undefined) return [{ path: ["answer", "value"], message: `for seed ${seed} ${format}` }];
  let question: Question;
  try {
    question = questionFor(spec, task, lang, templates);
  } catch (error) {
    return [{ path: ["answer", "value"], message: `for seed ${seed} ${message(error)}` }];
  }
  if (!isCorrect(question, rightAnswer(question))) {
    return [{ path: ["answer", "compare"], message: `for seed ${seed} the answer does not pass its own comparator` }];
  }
  // no mistake equals the answer, and the learner can give each
  task.mistakes.forEach((mistake, index) => {
    const path = ["mistakes", index, "value"];
    let given: Answer;
    try {
      given = answerFor(spec, task, question, index);
    } catch (error) {
      problems.push({ path, message: `for seed ${seed} ${message(error)}; the learner could not give this mistake` });
      return;
    }
    const equal =
      kind.kind === "number" && mistake instanceof Fraction && task.answer instanceof Fraction
        ? mistake.sub(task.answer).abs().compare(kind.tolerance) <= 0
        : isCorrect(question, given);
    if (equal) {
      problems.push({
        path,
        message: `for seed ${seed} the mistake equals the answer (${answerLabel(spec, task, lang)}); a mistake is a wrong answer, so change its value or remove it`,
      });
    }
  });
  if (problems.length > 0) return problems;
  // the task is the same for the same seed, and no placeholder is left
  const again = generate(spec, seed, data);
  for (const each of languages) {
    if (
      taskText(spec, again, each, templates) !== taskText(spec, task, each, templates) ||
      !same(again.answer, task.answer)
    ) {
      return [{ path: ["given"], message: `for seed ${seed} the task is not the same each time` }];
    }
    const texts: [(string | number)[], string, string][] = [
      [["task", "text"], "the task", taskText(spec, task, each, templates)],
      ...stepsOf(spec, task, each, templates).map((step, index): [(string | number)[], string, string] => [
        ["steps", index],
        `step ${index + 1}`,
        step,
      ]),
      ...(spec.hint === undefined
        ? []
        : [[["hint"], "the hint", hintOf(spec, task, each, templates) ?? ""] as [(string | number)[], string, string]]),
      ...(spec.mistakes ?? []).map((_mistake, index): [(string | number)[], string, string] => [
        ["mistakes", index, "message"],
        "the message",
        fill(templatesIn(templates, each).messages[index] ?? "", spec, task, each, "text"),
      ]),
      ...(spec.task.figure === undefined
        ? []
        : [
            [["task", "figure", "alt"], "the figure's alt", safeAlt(spec, task, each, templates)] as [
              (string | number)[],
              string,
              string,
            ],
          ]),
    ];
    for (const [path, what, text] of texts) {
      const left = /\{\{?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\}\}?/.exec(text);
      if (left === null) continue;
      const source = path.reduce<unknown>((at, part) => (at as Record<string, unknown> | undefined)?.[part], spec);
      const keyed = typeof source === "object" && source !== null;
      const root = left[1]?.split(".")[0] ?? "";
      problems.push({
        path: keyed ? [...path, each] : path,
        ...(keyed ? { lang: each } : {}),
        message:
          root in spec.given || root === "answer"
            ? `for seed ${seed} ${what} still has the placeholder ${left[0]}: it has no value there; name a field the records have`
            : `for seed ${seed} ${what} still has the placeholder ${left[0]}; declare ${root} in given, or remove the braces`,
      });
    }
  }
  if (problems.length > 0) return problems;
  // the unsolved figure does not show the answer
  if (spec.task.figure !== undefined) {
    const values = figureValues(spec, task);
    const wrong = figureProblem(spec, values);
    if (wrong !== undefined) return [{ path: ["task", "figure"], message: `for seed ${seed} ${wrong}` }];
    if (task.answer instanceof Fraction) {
      const answer = task.answer.toNumber();
      for (const each of languages) {
        const svg = figureOf(spec, task, each, templates) ?? "";
        const alt = /aria-label="([^"]*)"/.exec(svg)?.[1] ?? "";
        const inText = numbersIn(plainText(taskText(spec, task, each, templates)));
        const shown = numbersIn(`${alt} ${plainText(svg)}`).filter((n) => !inText.some((m) => Math.abs(m - n) < 1e-9));
        if (shown.some((n) => Math.abs(n - answer) < 1e-9)) {
          return [
            {
              path: ["task", "figure"],
              message: `for seed ${seed} the figure shows the answer (${answerLabel(spec, task, each)}) before it is solved; draw it from the given values`,
            },
          ];
        }
      }
    }
  }
  return problems;
}

/**
 * The property test of an exercise over the seeds 1 to `seeds`: `where` holds in at least one draw of ten; for each
 * seed the answer is defined, in its format and passes its comparator, no mistake equals it, the task is the same each
 * time and has no placeholder left, and the unsolved figure does not show the answer. The problems of the first seed
 * that has any; none when the exercise is sound.
 */
export function soundness(
  spec: Generated,
  data: Data,
  templates: Templates,
  languages: readonly string[],
  seeds = 200,
): GeneratedProblem[] {
  if ((spec.where ?? []).length > 0) {
    let passes = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      try {
        if (holds(spec, values(spec, seed, 0, data))) passes++;
      } catch (error) {
        return [{ path: ["where"], message: `for seed ${seed} where is not defined: ${message(error)}` }];
      }
    }
    if (passes * 10 < seeds) {
      return [
        {
          path: ["where"],
          message: `where holds in ${passes} of ${seeds} draws; it must hold in at least 1 of 10, so loosen it or narrow given`,
        },
      ];
    }
  }
  for (let seed = 1; seed <= seeds; seed++) {
    const problems = seedProblems(spec, seed, data, templates, languages);
    if (problems.length > 0) return problems;
  }
  return [];
}

/**
 * Whether the check of every seed's task, 1 to `seeds`, judges each example as it is listed: an accepted one passes,
 * a rejected one fails. An example is an expression of given and of answer, the task's right answer (unless given
 * declares its own answer), evaluated per seed. One problem per example, at the first seed that judges it otherwise.
 */
export function exampleProblems(
  spec: Generated,
  data: Data,
  templates: Templates,
  languages: readonly string[],
  seeds = 200,
): GeneratedProblem[] {
  const examples = (["accepted", "rejected"] as const).flatMap((kind) =>
    (spec.examples?.[kind] ?? []).map((source, index) => ({ kind, index, expression: parse(source) })),
  );
  if (examples.length === 0) return [];
  const lang = languages[0] ?? "de";
  const problems = new Map<string, GeneratedProblem>();
  for (let seed = 1; seed <= seeds && problems.size < examples.length; seed++) {
    const task = generate(spec, seed, data);
    const question = questionFor(spec, task, lang, templates);
    const env = { answer: task.answer, ...task.values };
    for (const { kind, index, expression } of examples) {
      const key = `${kind}#${index}`;
      if (problems.has(key)) continue;
      const path = ["examples", kind, index];
      let given: Answer;
      let shown: string;
      try {
        const value = evaluate(expression, env);
        shown = label(value, lang);
        given = exampleGiving(spec, task, value);
      } catch (error) {
        problems.set(key, {
          path,
          message: `for seed ${seed} the learner could not give this answer: ${message(error)}`,
        });
        continue;
      }
      const right = isCorrect(question, given);
      if (right === (kind === "accepted")) continue;
      problems.set(key, {
        path,
        message: `for seed ${seed} (answer ${answerLabel(spec, task, lang)}) ${verdict(`"${shown}"`, right, "the check", "change the exercise (e.g. another comparator, a tolerance) so that its check")}`,
      });
    }
  }
  return [...problems.values()];
}

/** What a learner sees of a task: its text and its question's options, items or pairs; "Neue Aufgabe" changes it. */
export function taskKey(spec: Generated, task: Task, lang: string, templates: Templates): string {
  const { id: _id, ...question } = questionFor(spec, task, lang, templates);
  return JSON.stringify(question);
}

/** How many worked tasks a page shows without JavaScript: the task numbers 1 to 3. */
export const WORKED_TASKS = 3;

export type { Value };
