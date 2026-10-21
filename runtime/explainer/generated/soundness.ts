// The property test of a generated exercise at build time: the tasks of a fixed set of seeds, each checked for
// its figure, its formats, its answer, its mistakes and its options, and its examples run through the check.
import { evaluate, parse, same, type Value } from "../expression.ts";
import { Fraction } from "../fraction.ts";
import { type Answer, isCorrect, type Question, rightAnswer } from "../../shared/questions/question.ts";
import { verdict } from "../../shared/examples.ts";
import { type Data, type Generated, type Task, type Templates } from "./types.ts";
import { kindOf } from "./comparator.ts";
import { ATTEMPTS, compiled, generate, holds, StarvedError, values } from "./values.ts";
import {
  answerLabel,
  figureOf,
  figureProblem,
  figureValues,
  fill,
  hintOf,
  label,
  plainText,
  safeAlt,
  stepsOf,
  taskText,
  templatesIn,
} from "./texts.ts";
import { answerFor, exampleGiving, pairValues, questionFor } from "./question.ts";

/** A problem of an exercise: where in it, in which language, and what. */
export interface GeneratedProblem {
  path: (string | number)[];
  lang?: string;
  message: string;
}

export const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

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
