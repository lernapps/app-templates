// The content of an explainer, as the YAML files in src/ give it (explainer.v1.schema.json) and the build reads it
// (load.ts): the app, its chapters in order, their pages in order, the data files, the bundled images and the
// components (src/components/, components.ts) with the blocks that use them.

import type { Question } from "../quiz/quiz.ts";
import type { Generated } from "./generated.ts";
import { inLanguage, type Text } from "../shared/languages.ts";

export { inLanguage, type Text };

/** An exercise of one of the quiz's question types, with the quiz's fields; its texts may be maps by language. */
export type QuestionBlock = Question<Text>;
/** An exercise block: one of the quiz's question types, or generated. */
export type Exercise = QuestionBlock | Generated;

export interface Source {
  title: Text;
  url?: string;
}

export interface App {
  title: Text;
  intro: Text;
  languages: readonly string[];
  chapters: readonly string[];
  sources?: readonly Source[];
}

export interface Credit {
  /** A URL, the same in every language, or a citation: a text. */
  source?: Text;
  licence?: string;
}

export type Drawing = { kind: "hundred-grid"; filled: number } | { kind: "bar"; part: number; whole: number };

export interface Event {
  date: number | string;
  label?: Text;
  title: Text;
  text?: Text;
}

export type Block =
  | { type: "text"; text: Text }
  | { type: "formula"; formula: Text }
  | ({ type: "figure"; draw?: Drawing; image?: string; alt: Text; caption: Text } & Credit)
  | ({
      type: "labelled-figure";
      image: string;
      alt: Text;
      caption?: Text;
      labels: readonly { x: number; y: number; text: Text }[];
    } & Credit)
  | { type: "table"; caption: Text; header?: readonly Text[]; rowHeaders?: boolean; rows: readonly (readonly Text[])[] }
  | { type: "timeline"; events?: readonly Event[]; data?: string }
  | { type: "definition"; term: Text; explanation: Text }
  | ({ type: "quote"; text: Text; origin: { author: Text; work?: Text; year?: number | Text } } & Credit)
  | { type: "code"; language: string; code: string; caption?: Text }
  | { type: "example" | "note"; title: Text; blocks: readonly Block[] }
  | { type: "section"; id: string; title: Text; blocks: readonly Block[] }
  | {
      type: "vue-component";
      /** Its anchor; an exercise component without one has its name in kebab case (assign-labels). */
      id?: string;
      component: string;
      props?: Readonly<Record<string, unknown>>;
      /** Required for a component that is no exercise; an exercise component's no-JS text is generated from describe. */
      nojs?: Text;
      examples?: ComponentExamples;
    }
  | Exercise;

export type BlockOf<T extends Block["type"]> = Extract<Block, { type: T }>;

export interface Page {
  id: string;
  chapter: string;
  /** The source file, from the app's root: src/<chapter>/<page>.yaml. */
  file: string;
  title: Text;
  description?: Text;
  blocks: readonly Block[];
}

export interface Chapter {
  id: string;
  title: Text;
  summary?: Text;
  pages: readonly Page[];
}

/** A record of a data file: numbers, booleans, and texts or language-neutral strings. */
export type DataRecord = Readonly<Record<string, number | boolean | Text>>;

export interface Site {
  app: App;
  chapters: readonly Chapter[];
  /** The records of each data file src/data/<name>.yaml, by name. */
  data: Readonly<Record<string, readonly DataRecord[]>>;
  /** The bundled images that blocks use, by their path from src/ (images/<name>), with the file's absolute path. */
  images: ReadonlyMap<string, string>;
  /** Each vue-component block, with its component and where it is. */
  components: readonly ComponentUse[];
}

// What the build reads of a component (components.ts). Declared here, not there: the client module reaches this file,
// and components.ts is build code that needs Node.

/** A prop type that a block's props can give. */
export type PropType =
  | { kind: "string" | "number" | "boolean" | "unknown" }
  | { kind: "literal"; values: readonly (string | number | boolean)[] }
  | { kind: "array"; of: PropType }
  | { kind: "object"; fields: Readonly<Record<string, Field>> }
  | { kind: "union"; of: readonly PropType[] };

export interface Field {
  type: PropType;
  optional: boolean;
  /** The declaration as written, e.g. "parts: string[]". */
  source: string;
}

export interface ComponentInfo {
  name: string;
  /** src/components/<Name>.vue */
  file: string;
  /** The .vue file's absolute path. */
  path: string;
  /** The props a block gives: every declared prop but seed, which the explainer gives an exercise component. */
  props: Readonly<Record<string, Field>>;
  /** Whether it emits answered: an exercise, which gets the seed of its task number as the prop seed. */
  exercise: boolean;
  /** Whether it keeps its nojs text, folded as a text description, once it runs, rather than replacing it. */
  caption: boolean;
  /** The absolute path of its logic module <Name>.ts, for an exercise. */
  logic?: string;
}

/** An example of an exercise component: the answer its check takes, for the task of `seed`, or of every seed. */
export interface ComponentExample {
  answer: unknown;
  seed?: number;
}

/** The examples of an exercise component's block: test cases for the build, never shown to learners. */
export interface ComponentExamples {
  accepted?: readonly ComponentExample[];
  rejected?: readonly ComponentExample[];
}

/** A vue-component block of a page, with the component it uses. */
export interface ComponentUse {
  block: BlockOf<"vue-component">;
  component: ComponentInfo;
  /** Its anchor on the page, for an exercise component or a block with an id: the block's id or the default. */
  id?: string;
  /** Where the block is, as a problem line starts: src/<chapter>/<page>.yaml:<line>: blocks[0].blocks[3] */
  place: string;
  /** Where each of its examples is, as a problem line starts, by kind. */
  examples: { accepted: string[]; rejected: string[] };
}

/** The events of a timeline: its own, or the records of its data file. */
export function timelineEvents(site: Site, block: BlockOf<"timeline">): readonly Event[] {
  if (block.events !== undefined) return block.events;
  return (site.data[block.data ?? ""] ?? []) as unknown as readonly Event[];
}

/**
 * What an exercise component says about itself (the export about of its logic module), for a tutor: what the learner
 * does, the answer's format, what counts as right, and the typical mistakes. Each a text, a map by language when the
 * app has more than one.
 */
export interface ComponentAbout {
  task: Text;
  answer: Text;
  correct: Text;
  mistakes: readonly Text[];
}

/** A task of an exercise component, as its describe(task, props, lang) states it: restricted Markdown each. */
export interface DescribedTask {
  /** Its task number, from 1. */
  number: number;
  seed: number;
  task: string;
  solution: string;
}

/** What the build learnt from an exercise component's logic for one block: its about, and its tasks by language. */
export interface ComponentDescription {
  about: ComponentAbout;
  /** The seed of each task number, from 1: the seeds of its distinct tasks (distinctSeeds of tasks.ts). */
  seeds: readonly number[];
  /** The task of each number, in each language. */
  tasks: Readonly<Record<string, readonly DescribedTask[]>>;
}

/** Whether a block is an exercise. */
export const isExercise = (block: Block): block is Exercise =>
  block.type === "generated" ||
  ["single-choice", "multiple-choice", "true-false", "number", "ordering", "matching"].includes(block.type);

/** The anchor of a term in the glossary: the German term in lower case, umlauts spelled out, hyphens for the rest. */
export function termId(term: Text): string {
  return inLanguage(term, "de")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
