// The texts of a task: its template filled in with the values (the placeholders ⟦name⟧ the build leaves), the numbers
// as a locale writes them, the checks of the placeholders, the steps, the hint and the figure.
import { evaluate, ExpressionError, Localized, parse, type Value, variables } from "../expression.ts";
import { bar, hundredGrid } from "../figures.ts";
import { Fraction } from "../fraction.ts";
import { inLanguage, localeOf, type Text } from "../../shared/languages.ts";
import { escape } from "../../shared/html.ts";
import { type Generated, type LanguageTemplates, type Task, type Templates } from "./types.ts";
import { kindOf } from "./comparator.ts";
import { compiled } from "./values.ts";

const PATH = String.raw`[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*`;
/** A placeholder: two braces around a name or a name's field, nothing else inside. */
const PLACEHOLDER = new RegExp(String.raw`\{\{(${PATH})\}\}`, "g");
/** What looks meant as a placeholder but is not one: one brace in prose, or spaces inside two braces. */
const ONE_BRACE = new RegExp(String.raw`(?<!\{)\{(${PATH})\}(?!\})`, "g");
const SPACED = new RegExp(String.raw`\{\{\s*(${PATH})\s*\}\}`, "g");
/** A formula ($…$) or a run of prose, in a template. */
const SEGMENT = /\$((?:\\.|[^\\$\n])+?)\$|([^$]+)/g;

const formats = new Map<string, Intl.NumberFormat>();
/** A number as the page shows it: up to six decimals, no grouping (a learner would type 1500, not 1.500). */
export function formatNumber(value: Fraction, lang: string, decimals?: number): string {
  const key = `${lang}:${decimals ?? ""}`;
  let format = formats.get(key);
  if (format === undefined) {
    format = new Intl.NumberFormat(localeOf(lang), {
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
export function answerLabel(spec: Generated, task: Task, lang: string): string {
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

export const templatesIn = (templates: Templates, lang: string): LanguageTemplates =>
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
export function figureValues(spec: Generated, task: Task): Partial<Record<"filled" | "part" | "whole", Value>> {
  const found: Partial<Record<"filled" | "part" | "whole", Value>> = {};
  for (const [key, expression] of Object.entries(compiled(spec).figure)) {
    found[key as "filled"] = evaluate(expression, task.values);
  }
  return found;
}

/** What is wrong with a figure's values, if anything. */
export function figureProblem(
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
export function safeAlt(spec: Generated, task: Task, lang: string, templates: Templates): string {
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
    : bar(n(values.part), n(values.whole), alt, localeOf(lang), false);
}
