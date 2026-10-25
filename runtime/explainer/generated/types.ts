// Generated exercises (`generated`), the explainer's native notation for exercises drawn from a seed, in the style of
// property-based testing: arbitraries (`given`), preconditions (`where`), a task template,
// an answer with a comparator, typical mistakes with their messages, a hint and the steps, and examples: answers
// the build runs through the check of every seed's task (exampleProblems), never shown to learners. The same code runs at build
// time (the worked tasks without JavaScript, the property test over fixed seeds) and in the browser (a live task for
// any seed, "Neue Aufgabe"), so both agree. The comparator maps the answer onto the answer kinds of a question: number,
// choice, order, set and pairs become the number, single-choice, ordering, multiple-choice and matching
// questions, so controls, checker and feedback come from the shared questions.
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

// This module: the types of a generated exercise, its task and its data.
import { type Value } from "../expression.ts";
import { type Text } from "../../shared/languages.ts";

/** A literal of a list in the content: a number, a string, or a text by language. */
export type Literal = number | string | Readonly<Record<string, string>>;
/** A list of literals, or the records of a data file src/data/<name>.yaml. */
export type Source = readonly Literal[] | { readonly data: string };

/** One arbitrary of `given`: exactly one of int, decimal, oneOf, pick (with from). */
export interface Arbitrary {
  readonly int?: readonly [number, number];
  readonly decimal?: readonly [number, number];
  readonly step?: number;
  readonly oneOf?: readonly Literal[];
  readonly pick?: number;
  readonly from?: Source;
  readonly distinct?: boolean;
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
  | { readonly pairs: { readonly left: string; readonly right: string } };

export interface Generated {
  readonly type: "generated";
  readonly id: string;
  readonly given: Readonly<Record<string, Arbitrary>>;
  readonly where?: readonly string[];
  readonly task: { readonly text: Text };
  readonly answer: { readonly value: string; readonly compare: Compare };
  readonly mistakes?: readonly { readonly value: string; readonly message: Text }[];
  readonly hint?: Text;
  readonly steps?: readonly Text[];
  /** The sentence above the live task; the page's own when absent. */
  readonly practice?: Text;
  /**
   * Test cases for the build, never shown to learners: answers as expressions of given and answer, which the check
   * of every seed's task must accept or reject (exampleProblems).
   */
  readonly examples?: { readonly accepted?: readonly string[]; readonly rejected?: readonly string[] };
}

/**
 * A value of a data record: a number, a truth value, a text (a string, or a map by language), or, for what a component
 * shows, a list or a record of values.
 */
export type DataValue = number | boolean | Text | readonly DataValue[] | { readonly [field: string]: DataValue };
/** A record of a data file: its fields by name. */
export type DataRecord = Readonly<Record<string, DataValue>>;
/** The records of the data files, by name. */
export type Data = Readonly<Record<string, readonly DataRecord[]>>;

/** The templates of an exercise in one language, rendered by the build, with tokens for the placeholders. */
export interface LanguageTemplates {
  /** The task, inline HTML (no paragraph). */
  task: string;
  steps: string[];
  hint?: string | undefined;
  /** The mistakes' messages, plain text. */
  messages: string[];
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
