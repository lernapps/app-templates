// The questions of a lernapps app and what counts as a right answer: the six types (single choice, multiple choice,
// true/false, number, ordering, matching), a learner's answer and its check, the right and a wrong answer, the order
// in which a page shows the mixed entries. Used at build time (validation, rendering), in the browser (the engine)
// and by the end-to-end tests, so all three agree, by every archetype that has questions (the quiz, the explainer).
// A learner text is a string; an app in several languages writes each as a map of texts by language,
// { de: …, en: … } (Question<Text>), and questionIn gives it in the page's language. The address of a link is one
// for every language, or a map of addresses by language where the page to read differs.
import { markerOf, materialIn, type LabelledFigure, type MaterialBlock } from "../blocks/block.ts";
import { inLanguage, type Text } from "../languages.ts";
export type { Text };

/** A link for further reading; in a quiz or page in several languages, its address may be a map by language too. */
export interface Link<T extends Text = string> {
  title: T;
  url: T;
}

/** An option of a choice: `info` is background on the option itself, true whether or not it is the right answer. */
export interface Option<T extends Text = string> {
  text: T;
  correct: boolean;
  info: T;
  link?: Link<T>;
}

interface Base<T extends Text> {
  id: string;
  text: T;
  /** Content the question shows between its text and its answers: figures, tables, quotations, code, ... */
  material?: readonly MaterialBlock<T>[];
  /** Why the right answer is right; for types without options also their background. */
  explanation: T;
  links: Link<T>[];
  /** What to look at again after a wrong answer, without giving the answer away. */
  hint?: T;
  /** Test cases for the build, never shown to learners: answers the text allows, and typical wrong ones. */
  examples?: Examples;
}

/**
 * The examples of an exercise: answers that the build runs through the exercise's check (validate.ts). Each accepted
 * one must pass, each rejected one must fail. Written as the learner would give them, in the shape of the exercise's
 * type; never part of what a page renders or ships.
 */
export interface Examples<A = unknown> {
  accepted?: readonly A[];
  rejected?: readonly A[];
}

export interface SingleChoice<T extends Text = string> extends Base<T> {
  type: "single-choice";
  options: Option<T>[];
}

export interface MultipleChoice<T extends Text = string> extends Base<T> {
  type: "multiple-choice";
  options: Option<T>[];
}

export interface TrueFalse<T extends Text = string> extends Base<T> {
  type: "true-false";
  answer: boolean;
}

/** A typical wrong number, and what went wrong when the learner gives it. */
export interface NumberMistake<T extends Text = string> {
  answer: number;
  message: T;
}

export interface NumberQuestion<T extends Text = string> extends Base<T> {
  type: "number";
  answer: number;
  tolerance: number;
  unit?: T;
  mistakes?: NumberMistake<T>[];
}

/** `items` in the right order. */
export interface Ordering<T extends Text = string> extends Base<T> {
  type: "ordering";
  items: T[];
}

/**
 * `pairs` as they belong together. With `pairsFrom: "material"` the pairs are not written: they are the labels of the
 * labelled figure in the material, each marker with its text (materialPairs); `pairs` is then only there after
 * materialPairs has filled it in.
 */
export interface Matching<T extends Text = string> extends Base<T> {
  type: "matching";
  pairs: { left: T; right: T }[];
  pairsFrom?: "material";
  /** Right entries that belong to no left entry: wrong answers the learner can choose, shown mixed with the right ones. */
  distractors?: T[];
}

/** The right entries a learner can choose from: those of the pairs, then the distractors. A chosen index counts into this list. */
export const rightEntries = <T extends Text>(question: Pick<Matching<T>, "pairs" | "distractors">): T[] => [
  ...question.pairs.map((pair) => pair.right),
  ...(question.distractors ?? []),
];

/**
 * The pairs that `pairsFrom: "material"` takes from the first labelled figure of the material: left the marker of a
 * label, right its text. A marker is the same in every language. Without `pairsFrom` there are none to take.
 */
export function materialPairs(question: Matching<Text>): Matching<Text>["pairs"] | undefined {
  if (question.pairsFrom === undefined) return undefined;
  const figure = question.material?.find((block): block is LabelledFigure<Text> => block.type === "labelled-figure");
  return (figure?.labels ?? []).map((label, index) => {
    const marker = markerOf(label, index);
    const left: Text =
      typeof label.text === "string"
        ? marker
        : Object.fromEntries(Object.keys(label.text).map((lang) => [lang, marker]));
    return { left, right: label.text };
  });
}

export type Question<T extends Text = string> =
  | SingleChoice<T>
  | MultipleChoice<T>
  | TrueFalse<T>
  | NumberQuestion<T>
  | Ordering<T>
  | Matching<T>;

/** The question types. */
export const QUESTION_TYPES: readonly Question["type"][] = [
  "single-choice",
  "multiple-choice",
  "true-false",
  "number",
  "ordering",
  "matching",
];

/** Each learner text of a question with its place in it: ["options", 1, "info"]. */
export function questionTexts(question: Question<Text>): { path: (string | number)[]; text: Text }[] {
  const texts: { path: (string | number)[]; text: Text }[] = [
    { path: ["text"], text: question.text },
    { path: ["explanation"], text: question.explanation },
    ...question.links.map((link, index) => ({ path: ["links", index, "title"], text: link.title })),
    ...(question.hint === undefined ? [] : [{ path: ["hint"], text: question.hint }]),
  ];
  switch (question.type) {
    case "single-choice":
    case "multiple-choice":
      question.options.forEach((option, index) => {
        texts.push({ path: ["options", index, "text"], text: option.text });
        texts.push({ path: ["options", index, "info"], text: option.info });
        if (option.link) texts.push({ path: ["options", index, "link", "title"], text: option.link.title });
      });
      break;
    case "number":
      if (question.unit !== undefined) texts.push({ path: ["unit"], text: question.unit });
      question.mistakes?.forEach((mistake, index) =>
        texts.push({ path: ["mistakes", index, "message"], text: mistake.message }),
      );
      break;
    case "ordering":
      question.items.forEach((item, index) => texts.push({ path: ["items", index], text: item }));
      break;
    case "matching":
      // the pairs taken from the material: their texts are the labels' texts, which the material's checks cover
      (question.pairsFrom === undefined ? question.pairs : []).forEach((pair, index) => {
        texts.push({ path: ["pairs", index, "left"], text: pair.left });
        texts.push({ path: ["pairs", index, "right"], text: pair.right });
      });
      question.distractors?.forEach((text, index) => texts.push({ path: ["distractors", index], text }));
      break;
    case "true-false":
      break;
  }
  return texts;
}

/** Each link's address of a question with its place in it: ["links", 0, "url"]. */
export function questionAddresses(question: Question<Text>): { path: (string | number)[]; text: Text }[] {
  const options = question.type === "single-choice" || question.type === "multiple-choice" ? question.options : [];
  return [
    ...question.links.map((link, index) => ({ path: ["links", index, "url"], text: link.url })),
    ...options.flatMap((option, index) =>
      option.link === undefined ? [] : [{ path: ["options", index, "link", "url"], text: option.link.url }],
    ),
  ];
}

/** The question in `lang`: each text and address from its map, a plain string as it is; without its examples. */
export function questionIn(question: Question<Text>, lang: string): Question {
  const t = (text: Text) => inLanguage(text, lang);
  const link = (value: Link<Text>): Link => ({ title: t(value.title), url: t(value.url) });
  const base = {
    id: question.id,
    text: t(question.text),
    explanation: t(question.explanation),
    links: question.links.map(link),
    ...(question.hint === undefined ? {} : { hint: t(question.hint) }),
    ...(question.material === undefined ? {} : { material: materialIn(question.material, lang) }),
  };
  switch (question.type) {
    case "single-choice":
    case "multiple-choice":
      return {
        ...base,
        type: question.type,
        options: question.options.map((option) => ({
          text: t(option.text),
          correct: option.correct,
          info: t(option.info),
          ...(option.link === undefined ? {} : { link: link(option.link) }),
        })),
      };
    case "true-false":
      return { ...base, type: question.type, answer: question.answer };
    case "number":
      return {
        ...base,
        type: question.type,
        answer: question.answer,
        tolerance: question.tolerance,
        ...(question.unit === undefined ? {} : { unit: t(question.unit) }),
        ...(question.mistakes === undefined
          ? {}
          : {
              mistakes: question.mistakes.map((mistake) => ({ answer: mistake.answer, message: t(mistake.message) })),
            }),
      };
    case "ordering":
      return { ...base, type: question.type, items: question.items.map(t) };
    case "matching":
      return {
        ...base,
        type: question.type,
        pairs: (materialPairs(question) ?? question.pairs).map((pair) => ({
          left: t(pair.left),
          right: t(pair.right),
        })),
        ...(question.distractors === undefined ? {} : { distractors: question.distractors.map(t) }),
      };
  }
}

/** The id of a question's element on the page, and its address (#frage-<id>). */
export const questionId = (question: Pick<Question, "id">): string => `frage-${question.id}`;

/**
 * A learner's answer, by the type of its question:
 * - single choice: the index of the chosen option;
 * - multiple choice: the indices of the chosen options;
 * - true/false: the choice;
 * - number: the text the learner typed;
 * - ordering: for each item (index in the right order), the place the learner gave it, from 0;
 * - matching: for each pair's left entry, the index of the right entry the learner chose (a distractor's index follows those of the pairs).
 */
export type Answer = number | readonly number[] | boolean | string;

/** A number as a learner types it: comma or point as decimal sign, spaces, the unit after it. */
export function parseNumber(input: string, unit?: string): number | undefined {
  let text = input.trim();
  if (unit !== undefined && text.endsWith(unit)) text = text.slice(0, -unit.length);
  text = text.replace(/[\s ]/g, "").replace(",", ".");
  if (!/^[+\-−]?(\d+\.?\d*|\.\d+)$/.test(text)) return undefined;
  return Number(text.replace("−", "-"));
}

const isIndexList = (answer: Answer): answer is readonly number[] => Array.isArray(answer);

/** Whether `value` is within the tolerance of `target`, with a little slack for decimal rounding. */
const within = (value: number, target: number, tolerance: number) => Math.abs(value - target) <= tolerance + 1e-9;

/** Whether `answer` is the right answer to `question`; an answer of the wrong shape is not. */
export function isCorrect(question: Question, answer: Answer): boolean {
  switch (question.type) {
    case "single-choice":
      return typeof answer === "number" && question.options[answer]?.correct === true;
    case "multiple-choice": {
      if (!isIndexList(answer)) return false;
      const chosen = new Set(answer);
      return question.options.every((option, index) => option.correct === chosen.has(index));
    }
    case "true-false":
      return answer === question.answer;
    case "number": {
      if (typeof answer !== "string") return false;
      const value = parseNumber(answer, question.unit);
      // a little slack for decimal rounding: 0.1 + 0.2 is within 0.3 ± 0
      return value !== undefined && within(value, question.answer, question.tolerance);
    }
    case "ordering":
      return isIndexList(answer) && answer.length === question.items.length && answer.every((place, i) => place === i);
    case "matching":
      return isIndexList(answer) && answer.length === question.pairs.length && answer.every((pair, i) => pair === i);
  }
}

/**
 * Why `answer` to `question` is wrong, as specifically as the question says it: for a choice the background of each
 * wrong option the learner chose (with the option), for a number the message of the typical mistake it matches; else
 * the question's hint. None for a right answer, nor when the question says nothing more.
 */
export function wrongReasons(question: Question, answer: Answer): { option?: string; text: string }[] {
  if (isCorrect(question, answer)) return [];
  const specific: { option?: string; text: string }[] = [];
  if (question.type === "single-choice" || question.type === "multiple-choice") {
    const chosen = typeof answer === "number" ? [answer] : isIndexList(answer) ? answer : [];
    for (const index of chosen) {
      const option = question.options[index];
      if (option !== undefined && !option.correct && option.info !== "") {
        specific.push({ option: option.text, text: option.info });
      }
    }
  }
  if (question.type === "number" && typeof answer === "string") {
    const value = parseNumber(answer, question.unit);
    const mistake =
      value === undefined
        ? undefined
        : question.mistakes?.find((candidate) => within(value, candidate.answer, question.tolerance));
    if (mistake !== undefined) specific.push({ text: mistake.message });
  }
  if (specific.length > 0) return specific;
  return question.hint === undefined ? [] : [{ text: question.hint }];
}

/** Whether a multiple-choice answer chose only right options, but not all of them. */
export const missesRight = (question: Question, answer: Answer): boolean =>
  question.type === "multiple-choice" &&
  isIndexList(answer) &&
  answer.every((index) => question.options[index]?.correct === true) &&
  !isCorrect(question, answer);

/** Whether the learner has answered at all: something chosen, typed or placed everywhere. */
export function isComplete(question: Question, answer: Answer | undefined): answer is Answer {
  if (answer === undefined) return false;
  switch (question.type) {
    case "single-choice":
      return typeof answer === "number";
    case "multiple-choice":
      return isIndexList(answer) && answer.length > 0;
    case "true-false":
      return typeof answer === "boolean";
    case "number":
      return typeof answer === "string" && parseNumber(answer, question.unit) !== undefined;
    case "ordering":
    case "matching":
      return isIndexList(answer) && answer.every((value) => Number.isInteger(value) && value >= 0);
  }
}

/** The right answer, as a learner would give it. */
export function rightAnswer(question: Question): Answer {
  switch (question.type) {
    case "single-choice":
      return question.options.findIndex((option) => option.correct);
    case "multiple-choice":
      return question.options.flatMap((option, index) => (option.correct ? [index] : []));
    case "true-false":
      return question.answer;
    case "number":
      return String(question.answer).replace(".", ",");
    case "ordering":
      return question.items.map((_item, index) => index);
    case "matching":
      return question.pairs.map((_pair, index) => index);
  }
}

/** A complete answer that is wrong, as a learner might give it. */
export function wrongAnswer(question: Question): Answer {
  switch (question.type) {
    case "single-choice":
      return question.options.findIndex((option) => !option.correct);
    case "multiple-choice": {
      const right = question.options.flatMap((option, index) => (option.correct ? [index] : []));
      const wrong = question.options.findIndex((option) => !option.correct);
      return wrong >= 0 ? [...right, wrong].sort((a, b) => a - b) : right.slice(1);
    }
    case "true-false":
      return !question.answer;
    case "number":
      return String(question.answer + question.tolerance + Math.max(1, Math.abs(question.answer))).replace(".", ",");
    case "ordering":
      return question.items.map((_item, index) => question.items.length - 1 - index);
    case "matching":
      return question.pairs.map((_pair, index) => (index + 1) % question.pairs.length);
  }
}

/** A small seeded random generator (mulberry32): the same seed gives the same order everywhere. */
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number from a text, to derive a seed per question. */
export function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

/** The indices 0..length-1 in an order given by `seed`. */
export function shuffled(length: number, seed: number): number[] {
  const next = random(seed);
  const order = Array.from({ length }, (_value, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j] ?? j, order[i] ?? i];
  }
  return order;
}

/**
 * The order in which the page shows the items of an ordering or the right entries of a matching question: mixed,
 * the same on every build, and never the right order itself.
 */
export function mixed(length: number, id: string): number[] {
  for (let attempt = 0; ; attempt++) {
    const order = shuffled(length, hash(`${id}#${attempt}`));
    if (length < 2 || order.some((value, index) => value !== index)) return order;
  }
}
