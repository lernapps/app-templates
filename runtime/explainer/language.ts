// The check of a language task (dec-language-task): what the learner wrote against the answers the task allows, in the
// browser and in the build alike, pure and without Node. An answer is written with its variants, "Je (m'appelle|suis)
// Marie.", and a gap as [ … ] in the text of a gap, choice or table task. The check first evens out what is no mistake
// (Unicode form, spaces, typographic apostrophes and quotes), then compares with every allowed answer. When none is
// equal it evens out the classes of mistakes of form one by one (case, accents, hyphen, apostrophe, punctuation) and
// takes the fewest classes that make an answer equal: the task says how each class counts (`form`), wrong by default
// (the owner: strict). Last come the typical mistakes the task names, each with its message. No class for typing
// errors: a wrong ending (-é for -er) would look harmless.

/** A class of mistakes of form, which the check finds by evening it out. */
export type FormClass = "case" | "accents" | "hyphen" | "apostrophe" | "punctuation";
export const FORM_CLASSES: readonly FormClass[] = ["case", "accents", "hyphen", "apostrophe", "punctuation"];

/** How a mistake of a class counts: right without a word, right with a hint, partly right, or wrong (with a hint). */
export type FormRule = "ok" | "hint" | "partly" | "wrong";
const RULES: readonly FormRule[] = ["ok", "hint", "partly", "wrong"];

/** How the task counts each class of mistakes of form; a class not given is wrong. */
export type Form = Partial<Readonly<Record<FormClass, FormRule>>>;

/** The most variants an answer may expand to: more is a mistake of the task, which the build reports. */
export const MAX_VARIANTS = 64;

/** The state of a gap, an item or a task: as the result line, the self-assessment and the tutor know it. */
export type State = "richtig" | "teilweise" | "falsch";

/** What the check says about one input. */
export interface Verdict {
  state: State;
  /** The classes of mistakes of form found, in the order of FORM_CLASSES (none when the answer is right as written). */
  classes: FormClass[];
  /** The learner's words that a class of form touches, for the hint ("Achte auf den Akzent: eleve"). */
  words: string[];
  /** The index of the typical mistake the input is, if it is one. */
  mistake?: number;
}

/** A typical wrong answer of an item: as written, with the variants it allows. */
export interface MistakeSpec {
  answer: string;
}

// --- the text of an answer ----------------------------------------------------------------------------------------

/** A piece of an answer's text: words as written (with their variants) or a gap (with the variants it allows). */
export type Piece = { kind: "text"; variants: string[] } | { kind: "gap"; variants: string[] };

/** A mistake in how an answer is written: brackets, variants. */
export class SyntaxProblem extends Error {}

/**
 * The variants of a text with groups (a|b): every way to choose one alternative of each group, in order. A group
 * without | is text as written, so "(m'appelle|suis)" is a choice and "(1990)" is not; an alternative may be empty,
 * "(très |)", for a word that may be left out. Throws a SyntaxProblem for an unclosed group or a nested one, or for more
 * than MAX_VARIANTS.
 */
export function variantsOf(text: string): string[] {
  let results = [""];
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf("(", index);
    if (open === -1) {
      results = results.map((result) => result + text.slice(index));
      break;
    }
    const close = text.indexOf(")", open);
    if (close === -1) throw new SyntaxProblem(`"${text}": a "(" is not closed`);
    const inner = text.slice(open + 1, close);
    if (inner.includes("(")) throw new SyntaxProblem(`"${text}": groups (a|b) cannot be nested`);
    const before = text.slice(index, open);
    const choices = inner.includes("|") ? inner.split("|") : [`(${inner})`];
    results = results.flatMap((result) => choices.map((choice) => result + before + choice));
    if (results.length > MAX_VARIANTS)
      throw new SyntaxProblem(`"${text}": more than ${MAX_VARIANTS} variants; list some under accepted instead`);
    index = close + 1;
  }
  const stray = /\)/.exec(text.replace(/\([^()]*\)/g, ""));
  if (stray) throw new SyntaxProblem(`"${text}": a ")" has no "("`);
  return [...new Set(results.map((result) => result.replace(/\s+/g, " ").trim()))];
}

/**
 * The pieces of a text with gaps [ … ]; a gap's alternatives are split by | at its top level, [m'appelle|suis]. Throws a SyntaxProblem for an unclosed or nested gap, or an empty one. */
export function piecesOf(text: string): Piece[] {
  const pieces: Piece[] = [];
  let index = 0;
  for (;;) {
    const open = text.indexOf("[", index);
    const rest = open === -1 ? text.slice(index) : text.slice(index, open);
    if (rest.includes("]")) throw new SyntaxProblem(`"${text}": a "]" has no "["`);
    if (rest !== "") pieces.push({ kind: "text", variants: textVariants(rest) });
    if (open === -1) return pieces;
    const close = text.indexOf("]", open);
    if (close === -1) throw new SyntaxProblem(`"${text}": a "[" is not closed`);
    const inner = text.slice(open + 1, close);
    if (inner.includes("[")) throw new SyntaxProblem(`"${text}": gaps [ ] cannot be nested`);
    if (inner.trim() === "") throw new SyntaxProblem(`"${text}": a gap [ ] is empty`);
    pieces.push({ kind: "gap", variants: gapVariants(inner, text) });
    index = close + 1;
  }
}

/** The variants of a gap: alternatives at its top level, [m'appelle|suis], each with its own groups (a|b). */
function gapVariants(inner: string, text: string): string[] {
  const alternatives: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < inner.length; index++) {
    const char = inner[index];
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "|" && depth === 0) {
      alternatives.push(inner.slice(start, index));
      start = index + 1;
    }
  }
  alternatives.push(inner.slice(start));
  if (alternatives.some((alternative) => alternative.trim() === ""))
    throw new SyntaxProblem(`"${text}": a gap [ ] has an empty alternative`);
  const variants = [...new Set(alternatives.flatMap((alternative) => variantsOf(alternative)))];
  if (variants.length > MAX_VARIANTS)
    throw new SyntaxProblem(`"${text}": more than ${MAX_VARIANTS} variants; list some under accepted instead`);
  return variants;
}

/** The variants of words between gaps, with their spaces at the edges kept (they separate them from the gaps). */
function textVariants(text: string): string[] {
  const lead = /^\s/.test(text) ? " " : "";
  const trail = /\s$/.test(text) && text.trim() !== "" ? " " : "";
  return variantsOf(text).map((variant) => (variant === "" ? (lead || trail ? " " : "") : lead + variant + trail));
}

/** The gaps of a text: each gap's variants. */
export const gapsOf = (text: string): string[][] =>
  piecesOf(text).flatMap((piece) => (piece.kind === "gap" ? [piece.variants] : []));

/** A text as the learner reads it: the first variant of each group, a gap as `gap(index)`. */
export function shownText(text: string, gap: (index: number) => string = () => "…"): string {
  let count = 0;
  return piecesOf(text)
    .map((piece) => (piece.kind === "gap" ? gap(count++) : (piece.variants[0] ?? "")))
    .join("");
}

/** The whole answer as written, without the marks of its gaps: every variant, for a task the learner writes out. */
export function wholeVariants(text: string): string[] {
  let results = [""];
  for (const piece of piecesOf(text)) {
    results = results.flatMap((result) => piece.variants.map((variant) => result + variant));
    if (results.length > MAX_VARIANTS)
      throw new SyntaxProblem(`"${text}": more than ${MAX_VARIANTS} variants; list some under accepted instead`);
  }
  return [...new Set(results.map((result) => result.replace(/\s+/g, " ").trim()))];
}

// --- evening out ---------------------------------------------------------------------------------------------------

/** What is no mistake: Unicode form, spaces, typographic apostrophes and quotes, French spaces before ; : ! ?. */
export function normalize(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[’‘ʼ´`]/g, "'")
    .replace(/[«»“”„‚‹›]/g, '"')
    .replace(/[   ]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ ([.,])/g, "$1")
    .replace(/ ?([;:!?]) ?/g, "$1 ")
    .replace(/ ?" ?/g, '"')
    .replace(/ ?' ?/g, "'")
    .trim();
}

/** The ways a class evens out a normalized text: each gives keys that are equal when the texts differ only in it. */
const EVEN: Readonly<Record<FormClass, (text: string, lang: string) => string[]>> = {
  case: (text, lang) => [text.toLocaleLowerCase(lang)],
  accents: (text) => [
    text
      .replace(/œ/g, "oe")
      .replace(/Œ/g, "OE")
      .replace(/æ/g, "ae")
      .replace(/Æ/g, "AE")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .normalize("NFC"),
  ],
  hyphen: (text) => [text.replace(/ ?[-‐‑] ?/g, " ")],
  apostrophe: (text) => [text.replace(/'/g, " "), text.replace(/'/g, "")],
  punctuation: (text) => [
    text
      .replace(/[.,;:!?¡¿"…]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  ],
};

/** The keys of a text with `classes` evened out. */
function keysOf(text: string, classes: readonly FormClass[], lang: string): string[] {
  let keys = [normalize(text)];
  for (const name of FORM_CLASSES)
    if (classes.includes(name)) keys = [...new Set(keys.flatMap((key) => EVEN[name](key, lang)))];
  return keys;
}

/** Every set of classes, the smaller first. */
const SUBSETS: readonly FormClass[][] = Array.from({ length: 2 ** FORM_CLASSES.length }, (_unused, mask) =>
  FORM_CLASSES.filter((_name, bit) => (mask >> bit) & 1),
).sort((a, b) => a.length - b.length);

/** How a set of classes counts: the strictest rule among them. */
const ruleOf = (classes: readonly FormClass[], form: Form): FormRule =>
  classes.reduce<FormRule>((strictest, name) => {
    const rule = form[name] ?? "wrong";
    return RULES.indexOf(rule) > RULES.indexOf(strictest) ? rule : strictest;
  }, "ok");

const STATE_OF: Readonly<Record<FormRule, State>> = {
  ok: "richtig",
  hint: "richtig",
  partly: "teilweise",
  wrong: "falsch",
};

/** The learner's words that differ from the answer's, word by word, when both have as many words. */
function touchedWords(input: string, answer: string): string[] {
  const mine = normalize(input).split(" ");
  const theirs = normalize(answer).split(" ");
  if (mine.length !== theirs.length) return [];
  return mine.filter((word, index) => word !== theirs[index]);
}

// --- the check -----------------------------------------------------------------------------------------------------

/** The index of the typical mistake `input` is, as written with its variants; undefined when it is none. */
export function mistakeOf(input: string, mistakes: readonly string[]): number | undefined {
  const written = normalize(input);
  const index = mistakes.findIndex((mistake) => variantsOf(mistake).some((variant) => normalize(variant) === written));
  return index === -1 ? undefined : index;
}

/**
 * The verdict on `input` for an answer with the variants `allowed` (in the language `lang`), the typical mistakes
 * `mistakes` (each as written, with variants), counting mistakes of form as `form` says.
 */
export function check(
  input: string,
  allowed: readonly string[],
  lang: string,
  form: Form = {},
  mistakes: readonly string[] = [],
): Verdict {
  const written = normalize(input);
  if (written === "") return { state: "falsch", classes: [], words: [] };
  let best: { rule: FormRule; classes: FormClass[]; answer: string } | undefined;
  for (const classes of SUBSETS) {
    const mine = new Set(keysOf(input, classes, lang));
    for (const answer of allowed) {
      if (!keysOf(answer, classes, lang).some((key) => mine.has(key))) continue;
      const rule = ruleOf(classes, form);
      if (best === undefined || RULES.indexOf(rule) < RULES.indexOf(best.rule)) best = { rule, classes, answer };
    }
    // a smaller set that is right as written cannot be beaten
    if (best !== undefined && best.classes.length === 0) break;
  }
  if (best !== undefined && best.rule !== "wrong")
    return {
      state: STATE_OF[best.rule],
      classes: best.rule === "ok" ? [] : best.classes,
      words: best.rule === "ok" ? [] : touchedWords(input, best.answer),
    };
  const index = mistakeOf(input, mistakes);
  if (index !== undefined) return { state: "falsch", classes: [], words: [], mistake: index };
  if (best !== undefined) return { state: "falsch", classes: best.classes, words: touchedWords(input, best.answer) };
  return { state: "falsch", classes: [], words: [] };
}

/**
 * The state of several parts together (the gaps of an item, the items of a task): all right, none right, or partly.
 * No part at all (a row of a table without a gap) asks nothing, so it is right.
 */
export function combined(states: readonly State[]): State {
  if (states.every((state) => state === "richtig")) return "richtig";
  if (states.every((state) => state === "falsch")) return "falsch";
  return "teilweise";
}

// --- the task ------------------------------------------------------------------------------------------------------

/** The rows of a table of forms: each a list of cells as written; a cell with [ … ] is a gap. */
export interface LanguageTable<T> {
  caption?: T;
  header?: readonly string[];
  rows: readonly (readonly string[])[];
}

/** An item of a language task: what the learner starts from and the answer, with its variants and gaps. */
export interface LanguageItem<T> {
  source?: string;
  target?: string;
  cue?: string;
  marker?: string;
  accepted?: readonly string[];
  mistakes?: readonly { answer: string; message: T }[];
  distractors?: readonly (readonly string[])[];
  examples?: {
    accepted?: readonly (string | readonly string[])[];
    rejected?: readonly (string | readonly string[])[];
  };
}

/** A language task (explainer.v1.schema.json, $defs/languageTask), with texts of type T and material of type M. */
export interface LanguageTaskSpec<T, M = unknown> {
  type: "language-task";
  id: string;
  task?: T;
  languages: { source: string; target: string };
  direction?: "to-target" | "to-source";
  mode?: "write" | "gap" | "choice" | "table";
  form?: Form;
  material?: readonly M[];
  items?: readonly LanguageItem<T>[];
  table?: LanguageTable<T>;
  hint?: T;
  explanation?: T;
}

/** What the learner starts from: the other language, a cue, or a marker of the labelled figure. */
export type Prompt =
  | { kind: "text"; text: string; lang: string }
  | { kind: "cue"; text: string }
  | { kind: "marker"; marker: string };

/** One input of a task: the answers it allows (each as written), its typical mistakes, and for a choice its options. */
export interface Slot {
  allowed: string[];
  mistakes: string[];
  options?: string[];
}

/**
 * A part of a task the learner answers and gets a verdict for: an item, or a row of a table. `answer` is its answer as
 * written, with its gaps; `whole` when the learner writes it out, else one slot per gap.
 */
export interface Unit {
  prompt?: Prompt;
  answer: string;
  whole: boolean;
  slots: Slot[];
  /** The cells of a row of a table, as written, each with its gaps. */
  cells?: readonly string[];
}

/** The language the learner writes in. */
export const answerLanguage = (task: Pick<LanguageTaskSpec<unknown>, "languages" | "direction">): string =>
  task.direction === "to-source" ? task.languages.source : task.languages.target;

/** The language the learner reads the items in. */
export const promptLanguage = (task: Pick<LanguageTaskSpec<unknown>, "languages" | "direction">): string =>
  task.direction === "to-source" ? task.languages.target : task.languages.source;

/** The side of an item the learner writes, as written. */
export const answerOf = (
  task: Pick<LanguageTaskSpec<unknown>, "direction">,
  item: LanguageItem<unknown>,
): string | undefined => (task.direction === "to-source" ? item.source : item.target);

/** What the learner starts from in an item. */
export function promptOf(task: LanguageTaskSpec<unknown>, item: LanguageItem<unknown>): Prompt | undefined {
  if (item.cue !== undefined) return { kind: "cue", text: item.cue };
  if (item.marker !== undefined) return { kind: "marker", marker: item.marker };
  const other = task.direction === "to-source" ? item.target : item.source;
  return other === undefined
    ? undefined
    : { kind: "text", text: wholeVariants(other)[0] ?? other, lang: promptLanguage(task) };
}

/** The options of a gap of a choice: its answer and its distractors, in the order of the alphabet. */
const optionsOf = (variants: readonly string[], distractors: readonly string[] | undefined, lang: string): string[] =>
  [...new Set([variants[0] ?? "", ...(distractors ?? [])])].sort((a, b) => a.localeCompare(b, lang));

/** The parts of a task the learner answers. Throws a SyntaxProblem for an answer written wrongly. */
export function unitsOf(task: LanguageTaskSpec<unknown>): Unit[] {
  const mode = task.mode ?? "write";
  const lang = answerLanguage(task);
  if (mode === "table")
    return (task.table?.rows ?? []).map((row) => {
      const answer = row.join(" ");
      return {
        answer,
        whole: false,
        cells: row,
        slots: row.flatMap((cell) => gapsOf(cell).map((variants) => ({ allowed: variants, mistakes: [] }))),
      };
    });
  return (task.items ?? []).map((item) => {
    const answer = answerOf(task, item) ?? "";
    const mistakes = (item.mistakes ?? []).map((mistake) => mistake.answer);
    const prompt = promptOf(task, item);
    const base = { answer, ...(prompt === undefined ? {} : { prompt }) };
    if (mode === "write")
      return {
        ...base,
        whole: true,
        slots: [{ allowed: [...wholeVariants(answer), ...(item.accepted ?? [])], mistakes }],
      };
    return {
      ...base,
      whole: false,
      slots: gapsOf(answer).map((variants, index) => ({
        allowed: variants,
        mistakes,
        ...(mode === "choice" ? { options: optionsOf(variants, item.distractors?.[index], lang) } : {}),
      })),
    };
  });
}

/** The verdict on a unit: its state and the verdict on each of its inputs (a choice is right or wrong as chosen). */
export function checkUnit(
  unit: Unit,
  inputs: readonly string[],
  lang: string,
  form: Form = {},
): { state: State; verdicts: Verdict[] } {
  const verdicts = unit.slots.map((slot, index) => {
    const input = inputs[index] ?? "";
    if (slot.options !== undefined) {
      // a choice is right or wrong as chosen; a wrong one may be a typical mistake, as in a gap
      if (slot.allowed.includes(input)) return { state: "richtig", classes: [], words: [] } satisfies Verdict;
      const mistake = mistakeOf(input, slot.mistakes);
      return {
        state: "falsch",
        classes: [],
        words: [],
        ...(mistake === undefined ? {} : { mistake }),
      } satisfies Verdict;
    }
    return check(input, slot.allowed, lang, form, slot.mistakes);
  });
  return { state: combined(verdicts.map((verdict) => verdict.state)), verdicts };
}

/** The solution of a unit as the learner reads it: its first variant, the gaps filled. */
export const solutionOf = (unit: Unit): string =>
  unit.cells !== undefined
    ? unit.cells.map((cell) => wholeVariants(cell)[0] ?? cell).join(" · ")
    : (wholeVariants(unit.answer)[0] ?? unit.answer);

/** Every right answer of a unit as written, for the solution and the tutor: the variants and accepted ones. */
export const answersOf = (unit: Unit): string[] =>
  unit.whole ? (unit.slots[0]?.allowed ?? []) : unit.slots.map((slot) => slot.allowed.join(" | "));

// --- the problems the build reports ---------------------------------------------------------------------------------

/** A problem of a language task: where (a path below the block) and what to change. */
export interface TaskProblem {
  path: (string | number)[];
  message: string;
}

/** The markers of a labelled figure without legend in the material: what an item's marker may name. */
function markersOf(material: readonly unknown[] | undefined): Set<string> {
  const markers = new Set<string>();
  for (const block of material ?? []) {
    if (typeof block !== "object" || block === null) continue;
    const figure = block as { type?: unknown; legend?: unknown; labels?: unknown };
    if (figure.type !== "labelled-figure" || figure.legend !== false || !Array.isArray(figure.labels)) continue;
    (figure.labels as { marker?: string }[]).forEach((label, index) => markers.add(label.marker ?? String(index + 1)));
  }
  return markers;
}

/** What the schema cannot say about a language task: its answers as written, its prompts, gaps, markers, examples. */
export function languageTaskProblems(task: LanguageTaskSpec<unknown>): TaskProblem[] {
  const problems: TaskProblem[] = [];
  const mode = task.mode ?? "write";
  const lang = answerLanguage(task);
  const answerSide = task.direction === "to-source" ? "source" : "target";
  const promptSide = answerSide === "source" ? "target" : "source";
  if (task.languages.source === task.languages.target)
    problems.push({
      path: ["languages", "target"],
      message: "the target language is the source language; name the language learners learn",
    });
  if (mode === "table") {
    if (task.table === undefined)
      problems.push({ path: ["table"], message: "table is missing; a task of mode table has a table of forms" });
    if (task.items !== undefined)
      problems.push({
        path: ["items"],
        message: "a task of mode table has no items; write the forms into table, or choose another mode",
      });
  } else {
    if (task.items === undefined)
      problems.push({ path: ["items"], message: `items is missing; a task of mode ${mode} has items` });
    if (task.table !== undefined)
      problems.push({ path: ["table"], message: `table is only for mode table; this task is of mode ${mode}` });
  }
  const markers = markersOf(task.material);
  (task.items ?? []).forEach((item, index) => {
    const at = ["items", index];
    const answer = answerOf(task, item);
    if (answer === undefined) {
      problems.push({
        path: at,
        message: `${answerSide} is missing: it is what the learner writes (direction ${task.direction ?? "to-target"})`,
      });
      return;
    }
    const prompts = [item.cue, item.marker, item[promptSide]].filter((prompt) => prompt !== undefined);
    if (prompts.length !== 1)
      problems.push({
        path: at,
        message: `give exactly one thing to start from: ${promptSide} (a translation), cue (a form to build) or marker (a label of the figure)`,
      });
    const other = item[promptSide];
    if (other !== undefined && other.includes("["))
      problems.push({
        path: [...at, promptSide],
        message: `${promptSide} is what the learner reads; gaps [ ] belong to ${answerSide}`,
      });
    if (item.marker !== undefined && !markers.has(item.marker))
      problems.push({
        path: [...at, "marker"],
        message:
          markers.size === 0
            ? `${item.marker} names no marker: add a labelled figure with legend: false to material`
            : `${item.marker} is no marker of the labelled figure in material; its markers are ${[...markers].join(", ")}`,
      });
    let gaps: string[][];
    try {
      gaps = gapsOf(answer);
      wholeVariants(answer);
      if (other !== undefined) wholeVariants(other);
    } catch (error) {
      if (!(error instanceof SyntaxProblem)) throw error;
      problems.push({ path: [...at, answerSide], message: error.message });
      return;
    }
    if (mode !== "write" && gaps.length === 0)
      problems.push({
        path: [...at, answerSide],
        message: `a task of mode ${mode} needs a gap [ … ] in each item's ${answerSide}`,
      });
    if (mode !== "write" && item.accepted !== undefined)
      problems.push({
        path: [...at, "accepted"],
        message: "accepted is for mode write; write further answers of a gap into it, [a|b]",
      });
    if (mode !== "choice" && item.distractors !== undefined)
      problems.push({ path: [...at, "distractors"], message: "distractors are for mode choice" });
    if (mode === "choice") {
      if (item.distractors === undefined || item.distractors.length !== gaps.length)
        problems.push({
          path: [...at, "distractors"],
          message: `give the distractors of each gap: ${gaps.length} list${gaps.length === 1 ? "" : "s"}, one per gap in order`,
        });
      item.distractors?.forEach((list, gap) =>
        list.forEach((distractor, place) => {
          if ((gaps[gap] ?? []).some((variant) => normalize(variant) === normalize(distractor)))
            problems.push({
              path: [...at, "distractors", gap, place],
              message: `${distractor} is a right answer of the gap, not a distractor`,
            });
        }),
      );
    }
    for (const [place, mistake] of (item.mistakes ?? []).entries()) {
      try {
        variantsOf(mistake.answer);
      } catch (error) {
        if (!(error instanceof SyntaxProblem)) throw error;
        problems.push({ path: [...at, "mistakes", place, "answer"], message: error.message });
      }
    }
  });
  if (task.table !== undefined) {
    const width = task.table.rows[0]?.length ?? 0;
    let gaps = 0;
    task.table.rows.forEach((row, index) => {
      if (row.length !== width)
        problems.push({
          path: ["table", "rows", index],
          message: `has ${row.length} cells; every row has ${width}, as the first`,
        });
      row.forEach((cell, column) => {
        try {
          gaps += gapsOf(cell).length;
        } catch (error) {
          if (!(error instanceof SyntaxProblem)) throw error;
          problems.push({ path: ["table", "rows", index, column], message: error.message });
        }
      });
    });
    if (task.table.header !== undefined && task.table.header.length !== width)
      problems.push({
        path: ["table", "header"],
        message: `names ${task.table.header.length} columns; the rows have ${width}`,
      });
    if (gaps === 0)
      problems.push({
        path: ["table", "rows"],
        message: "the table has no gap [ … ]; mark the forms the learner writes",
      });
  }
  if (problems.length > 0) return problems;
  // the answers: what the check takes as right and what not, as the page checks them
  const units = unitsOf(task);
  (task.items ?? []).forEach((item, index) => {
    const unit = units[index];
    if (unit === undefined) return;
    const at = ["items", index];
    const inputsOf = (answer: string | readonly string[]): string[] =>
      typeof answer === "string" ? [answer] : [...answer];
    const verdictOf = (answer: string | readonly string[]) => checkUnit(unit, inputsOf(answer), lang, task.form).state;
    for (const [place, mistake] of (item.mistakes ?? []).entries()) {
      const right = unit.slots.some((slot) => check(mistake.answer, slot.allowed, lang, task.form).state !== "falsch");
      if (right)
        problems.push({
          path: [...at, "mistakes", place, "answer"],
          message: `${mistake.answer} counts as right; a typical mistake must be wrong`,
        });
    }
    for (const kind of ["accepted", "rejected"] as const)
      for (const [place, example] of (item.examples?.[kind] ?? []).entries()) {
        const where = [...at, "examples", kind, place];
        if (inputsOf(example).length !== unit.slots.length) {
          problems.push({
            path: where,
            message: unit.whole ? "give the answer as one text" : `give one text per gap: ${unit.slots.length}`,
          });
          continue;
        }
        const state = verdictOf(example);
        const shown = inputsOf(example).join(" | ");
        if (kind === "accepted" && state !== "richtig")
          problems.push({
            path: where,
            message: `the check takes ${shown} as ${state === "teilweise" ? "partly right" : "wrong"}, but it is listed as accepted; add it as a variant or loosen form, else move it to rejected`,
          });
        if (kind === "rejected" && state === "richtig")
          problems.push({
            path: where,
            message: `the check takes ${shown} as right, but it is listed as rejected; make form stricter or the answer narrower, else move it to accepted`,
          });
      }
  });
  return problems;
}

// --- what the page shows -------------------------------------------------------------------------------------------

/** The characters a keyboard for German lacks, by language: the bar under a field inserts them. */
export const SPECIAL_CHARS: Readonly<Record<string, readonly string[]>> = {
  fr: ["é", "è", "ê", "ë", "à", "â", "ç", "î", "ï", "ô", "û", "ù", "ü", "œ", "É", "À", "Ç", "«", "»"],
  es: ["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡", "Á", "É", "Ñ"],
  it: ["à", "è", "é", "ì", "ò", "ù", "È"],
  pt: ["á", "â", "ã", "à", "ç", "é", "ê", "í", "ó", "ô", "õ", "ú"],
  la: ["ā", "ē", "ī", "ō", "ū", "ȳ"],
  de: ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"],
};

/** The special characters of a language (its primary subtag), none for one without. */
export const specialChars = (lang: string): readonly string[] => SPECIAL_CHARS[lang.split("-")[0] ?? lang] ?? [];

/** A text with gaps as the page shows it: the words as written (first variant) and the index of each gap's slot. */
export function partsOf(text: string, first = 0): (string | number)[] {
  let index = first;
  return piecesOf(text).map((piece) => (piece.kind === "gap" ? index++ : (piece.variants[0] ?? "")));
}
