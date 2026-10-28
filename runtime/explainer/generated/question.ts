// The question of a task (a question of the shared questions), the answer in the shape of the learner's, the feedback
// on a wrong answer, and what a learner sees of a task.
import { ExpressionError, type Rec, same, type Value } from "../expression.ts";
import { Fraction } from "../fraction.ts";
import { type Answer, isCorrect, parseNumber, type Question } from "../../shared/questions/question.ts";
import { inLanguage } from "../../shared/languages.ts";
import { type Generated, type Task, type Templates } from "./types.ts";
import { kindOf } from "./comparator.ts";
import { fill, formatNumber, label, plainText, taskText, templatesIn } from "./texts.ts";

const listOf = (value: Value, what: string): readonly Value[] => {
  if (!Array.isArray(value)) throw new ExpressionError(`the answer of ${what} is a list`);
  return value as readonly Value[];
};

/** The task as the question of the comparator's kind, in `lang`. */
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
      return {
        ...base,
        type: "single-choice",
        options: (task.options ?? []).map((option) => ({
          text: label(option, lang),
          correct: same(task.answer, option),
          info: "",
        })),
      };
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
export function pairValues(spec: Generated, value: Value): [Value, Value][] {
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
export function exampleGiving(spec: Generated, task: Task, value: Value): Answer {
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
  if (Array.isArray(a) && Array.isArray(b)) return a.join() === b.join();
  return a === b;
}

/** The index of the first typical mistake the learner's wrong answer makes; undefined when it makes none. */
export function mistakeOf(spec: Generated, task: Task, question: Question, answer: Answer): number | undefined {
  if (isCorrect(question, answer)) return undefined;
  const kind = kindOf(spec.answer.compare);
  // a mistake typed rounded to the answer's decimals still counts as that mistake
  const slack =
    kind.kind === "number" ? Math.max(kind.tolerance.toNumber(), 0.5 * 10 ** -Math.max(kind.decimals, 2)) : 0;
  for (const [index] of task.mistakes.entries()) {
    try {
      if (sameAnswer(question, answer, answerFor(spec, task, question, index), slack)) return index;
    } catch {
      // a mistake the controls cannot give
    }
  }
  return undefined;
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
  const index = mistakeOf(spec, task, question, answer);
  if (index === undefined) return undefined;
  return fill(templatesIn(templates, lang).messages[index] ?? "", spec, task, lang, "text");
}

/** What a learner sees of a task: its text and its question's options, items or pairs; "Neue Aufgabe" changes it. */
export function taskKey(spec: Generated, task: Task, lang: string, templates: Templates): string {
  const { id: _id, ...question } = questionFor(spec, task, lang, templates);
  return JSON.stringify(question);
}
