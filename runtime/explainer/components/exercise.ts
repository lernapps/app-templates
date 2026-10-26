// The logic of an exercise component: that it exports what an exercise needs (describedProblems), the exercise with
// its inputs and outputs for a tutor when it declares it (exerciseProblems), its property test over fixed seeds (propertyProblems) and its
// examples (exampleProblems). An exercise component emits answered, declares the
// prop seed: number and shows the task generate(seed, props); the build runs its logic module outside the browser.
import { textLanguages } from "../../shared/languages.ts";
import { verdict } from "../../shared/examples.ts";
import {
  type ComponentAbout,
  type ComponentDescription,
  type ComponentExamples,
  type ComponentExercise,
  type DescribedTask,
} from "../content.ts";
import { inspect } from "../../shared/text/markdown.ts";
import { distinctSeeds, MAX_TASKS, SEED_TRIES } from "../tasks.ts";
import { isText } from "./props.ts";

/** How many seeds the property test of an exercise component's logic draws, for each block that uses it. */
export const COMPONENT_SEEDS = 50;

/** The exports of an exercise component's logic module, for a message. */
export const CONTRACT =
  "generate(seed, props), check(task, answer), solution(task), wrong(task), reason(task, answer, props, lang), describe(task, props, lang) and about";

export interface ExerciseLogic {
  generate(seed: number, props: unknown): unknown;
  check(task: unknown, answer: unknown): unknown;
  solution(task: unknown): unknown;
  wrong(task: unknown): unknown;
  /** The app's message for a wrong answer, in `lang`; undefined (or "") for none. */
  reason?(task: unknown, answer: unknown, props: unknown, lang: string): unknown;
  describe?(task: unknown, props: unknown, lang: string): unknown;
  about?: unknown;
  // for a tutor: the exercise with its inputs and outputs, all four or none (exerciseProblems)
  template?(props: unknown, lang: string): unknown;
  params?(task: unknown, props: unknown, lang: string): unknown;
  mistakes?(task: unknown, props: unknown): unknown;
  show?(answer: unknown, task: unknown, props: unknown, lang: string): unknown;
}

/** The exports of an exercise component's logic module for a tutor's table of tasks, all four or none. */
const TABLE = ["template", "params", "mistakes", "show"] as const;

/** The exports of TABLE, for a message. */
export const TABLE_CONTRACT =
  "template(props, lang), params(task, props, lang), mistakes(task, props) and show(answer, task, props, lang)";

const ABOUT: readonly (keyof ComponentAbout)[] = ["task", "answer", "correct", "mistakes"];

/** The problems of one text of about, at `path` (about.task, about.mistakes[0]). */
function aboutTextProblems(value: unknown, path: string, languages: readonly string[]): string[] {
  if (!isText(value) || Object.values(typeof value === "string" ? [value] : value).some((text) => text.trim() === "")) {
    return [
      `${path} is ${JSON.stringify(value) ?? "missing"}; give a text, or a map of texts by language: { de: …, en: … }`,
    ];
  }
  return textLanguages(value, languages).problems.map(({ lang, message }) => `${path} (${lang}): ${message}`);
}

/**
 * What an exercise component's logic says about itself, for each block: about (what the learner does, the answer's
 * format, what counts as right, the typical mistakes; texts in each of `languages`), its task numbers (the seeds of
 * its distinct tasks, generate(seed, props) compared as JSON with the props of the first language, up to `max` of
 * `tries` seeds; distinctSeeds), and describe(task, props, lang) for the task of each number in each language, with
 * the block's props in that language (`propsIn`): the task and its solution, each restricted Markdown that is not
 * empty. The description, or the problems (the first of describe).
 */
export function describedProblems(
  logic: ExerciseLogic,
  propsIn: (lang: string) => unknown,
  languages: readonly string[],
  max = MAX_TASKS,
  tries = SEED_TRIES,
): { description?: ComponentDescription; problems: string[] } {
  const problems: string[] = [];
  const about = logic.about;
  if (typeof about !== "object" || about === null || Array.isArray(about)) {
    problems.push(
      `about is ${JSON.stringify(about) ?? "missing"}; export const about = { task, answer, correct, mistakes }: what the learner does, the answer's format, what counts as right, and the typical mistakes, each a text (a map by language when the app has more than one)`,
    );
  } else {
    const fields = about as Record<string, unknown>;
    for (const key of Object.keys(fields)) {
      if (!(ABOUT as readonly string[]).includes(key))
        problems.push(`about has no field ${key}; its fields are ${ABOUT.join(", ")}`);
    }
    for (const key of ABOUT) {
      const value = fields[key];
      if (key !== "mistakes") problems.push(...aboutTextProblems(value, `about.${key}`, languages));
      else if (!Array.isArray(value)) {
        problems.push(
          `about.mistakes is ${JSON.stringify(value) ?? "missing"}; give a list of the typical mistakes, each a text`,
        );
      } else
        value.forEach((text, index) =>
          problems.push(...aboutTextProblems(text, `about.mistakes[${index}]`, languages)),
        );
    }
  }
  if (typeof logic.describe !== "function") {
    problems.push("describe is no function; export function describe(task, props, lang) giving { task, solution }");
    return { problems };
  }
  const first = propsIn(languages[0] ?? "de");
  const seeds = distinctSeeds(
    (seed) => {
      try {
        return JSON.stringify(logic.generate(seed, first));
      } catch {
        return undefined;
      }
    },
    max,
    tries,
  );
  const tasks: Record<string, DescribedTask[]> = {};
  for (const lang of languages) {
    const props = propsIn(lang);
    const list: DescribedTask[] = [];
    for (const [index, seed] of seeds.entries()) {
      const call = `describe(task, props, "${lang}")`;
      let described: unknown;
      try {
        described = logic.describe(logic.generate(seed, props), props, lang);
      } catch (error) {
        problems.push(`for seed ${seed} ${call} throws: ${error instanceof Error ? error.message : String(error)}`);
        return { problems };
      }
      const { task, solution } = (typeof described === "object" && described !== null ? described : {}) as Record<
        string,
        unknown
      >;
      if (typeof task !== "string" || task.trim() === "" || typeof solution !== "string" || solution.trim() === "") {
        problems.push(
          `for seed ${seed} ${call} is ${JSON.stringify(described) ?? "undefined"}; describe returns { task, solution }: the task as the learner sees it and its solution, each a text in the page's language`,
        );
        return { problems };
      }
      for (const [part, text] of [
        ["task", task],
        ["solution", solution],
      ] as const) {
        const [problem] = inspect(text).problems;
        if (problem !== undefined) {
          problems.push(`for seed ${seed} the ${part} of ${call}: ${problem.message}`);
          return { problems };
        }
      }
      list.push({ number: index + 1, seed, task, solution });
    }
    tasks[lang] = list;
  }
  if (problems.length > 0) return { problems };
  const declared = exerciseProblems(logic, propsIn, languages, seeds, (about as ComponentAbout).mistakes.length);
  if (declared.problems.length > 0) return { problems: declared.problems };
  return {
    description: {
      about: about as ComponentAbout,
      seeds,
      tasks,
      ...(declared.exercise ? { exercise: declared.exercise } : {}),
    },
    problems,
  };
}

/** A list of names, for a message: "a", "a and b", "a, b and c". */
const names = (list: readonly string[]) =>
  list.length < 2 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list.at(-1) ?? ""}`;

/** A value of params as text in `lang`: a number with the decimal comma in German. */
const valueText = (value: number | string, lang: string) =>
  typeof value === "number" && lang === "de" ? String(value).replace(".", ",") : String(value).trim();

/**
 * An exercise component as a tutor reads it, in each of `languages`, when its logic exports template, params,
 * mistakes and show (none of them: no exercise, no problem): the task once, template(props, lang), with {name}
 * for each input; for the task of each of `seeds`, params(task, props, lang), its inputs by name, the same names for
 * every task, each a number or a text that is not empty, and each placeholder one of them; show of the solution,
 * which check accepts (propertyProblems); and show of the answer of each typical mistake, mistakes(task, props), one
 * for each of the `count` texts of about.mistakes, in order, each undefined or an answer that check rejects. The
 * exercise in each language, or the problems (the first).
 */
export function exerciseProblems(
  logic: ExerciseLogic,
  propsIn: (lang: string) => unknown,
  languages: readonly string[],
  seeds: readonly number[],
  count: number,
): { exercise?: Record<string, ComponentExercise>; problems: string[] } {
  const given = TABLE.filter((name) => typeof logic[name] === "function");
  if (given.length === 0) return { problems: [] };
  if (given.length < TABLE.length) {
    const missing = TABLE.filter((name) => !given.includes(name));
    return {
      problems: [
        `exports ${names(given)} but not ${names(missing)}; for a tutor's table of tasks export all four: ${TABLE_CONTRACT}`,
      ],
    };
  }
  const { template, params, mistakes, show } = logic as Required<ExerciseLogic>;
  const fail = (problem: string) => ({ problems: [problem] });
  const exercise: Record<string, ComponentExercise> = {};
  for (const lang of languages) {
    const props = propsIn(lang);
    const call = (name: string) => `${name}(task, props, "${lang}")`;
    const run = <T>(seed: number | undefined, what: string, act: () => T): T | { problems: string[] } => {
      try {
        return act();
      } catch (error) {
        const at = seed === undefined ? "" : `for seed ${seed} `;
        return fail(`${at}${what} throws: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    const failed = (value: unknown): value is { problems: string[] } =>
      typeof value === "object" && value !== null && "problems" in value && Array.isArray(value.problems);
    const text = run(undefined, `template(props, "${lang}")`, () => template(props, lang));
    if (failed(text)) return text;
    if (typeof text !== "string" || text.trim() === "") {
      return fail(
        `template(props, "${lang}") is ${JSON.stringify(text) ?? "undefined"}; template gives the task as a learner reads it, with {name} for each input of params`,
      );
    }
    let inputs: string[] | undefined;
    let first = 0;
    const numbered: ComponentExercise["tasks"][number][] = [];
    for (const seed of seeds) {
      const task = logic.generate(seed, props);
      const values = run(seed, call("params"), () => params(task, props, lang));
      if (failed(values)) return values;
      if (typeof values !== "object" || values === null || Array.isArray(values)) {
        return fail(
          `for seed ${seed} ${call("params")} is ${JSON.stringify(values) ?? "undefined"}; params gives the inputs of the task by name, { G: 340, p: 25 }`,
        );
      }
      const keys = Object.keys(values);
      if (inputs === undefined) {
        inputs = keys;
        first = seed;
      } else if (keys.join("\u0000") !== inputs.join("\u0000")) {
        return fail(
          `for seed ${seed} ${call("params")} gives the names ${keys.join(", ")}, and for seed ${first} ${inputs.join(", ")}; give the same names for every task`,
        );
      }
      const shown: string[] = [];
      for (const [name, value] of Object.entries(values as Record<string, unknown>)) {
        if (
          !((typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.trim() !== ""))
        ) {
          return fail(
            `for seed ${seed} ${call("params")}.${name} is ${JSON.stringify(value) ?? "undefined"}; give each input as a number or a text that is not empty`,
          );
        }
        shown.push(valueText(value, lang));
      }
      const asText = (answer: unknown, what: string): string | { problems: string[] } => {
        const result = run(seed, `show(${what}, task, props, "${lang}")`, () => show(answer, task, props, lang));
        if (failed(result)) return result;
        if (typeof result !== "string" || result.trim() === "") {
          return fail(
            `for seed ${seed} show(${what}, task, props, "${lang}") is ${JSON.stringify(result) ?? "undefined"}; show gives an answer as text, as the learner gives it`,
          );
        }
        return result.trim();
      };
      const solution = asText(logic.solution(task), "solution(task)");
      if (failed(solution)) return solution;
      const answers = run(seed, "mistakes(task, props)", () => mistakes(task, props));
      if (failed(answers)) return answers;
      if (!Array.isArray(answers) || answers.length !== count) {
        const length = Array.isArray(answers)
          ? `${answers.length} answer${answers.length === 1 ? "" : "s"}`
          : (JSON.stringify(answers) ?? "undefined");
        return fail(
          `for seed ${seed} mistakes(task, props) gives ${length}; give one for each of the ${count} typical mistakes of about.mistakes, in order, undefined for one without a single answer`,
        );
      }
      const wrong: string[] = [];
      for (const [index, answer] of (answers as unknown[]).entries()) {
        if (answer === undefined) {
          wrong.push("");
          continue;
        }
        const what = `mistakes(task, props)[${index}]`;
        const result = run(seed, `check(task, ${what})`, () => logic.check(task, answer));
        if (failed(result)) return result;
        if (result !== false) {
          return fail(
            `for seed ${seed} check(task, ${what}) is ${String(result)}; the answer of a typical mistake must be one that check rejects`,
          );
        }
        const shownAnswer = asText(answer, what);
        if (failed(shownAnswer)) return shownAnswer;
        wrong.push(shownAnswer);
      }
      numbered.push({ inputs: shown, solution, mistakes: wrong });
    }
    const unknown = [...text.matchAll(/\{([^{}\s]+)\}/g)]
      .map((match) => match[1] ?? "")
      .find((name) => !(inputs ?? []).includes(name));
    if (unknown !== undefined) {
      return fail(
        `template(props, "${lang}") has the placeholder {${unknown}}, which ${call("params")} does not give; its names are ${(inputs ?? []).join(", ")}`,
      );
    }
    exercise[lang] = { template: text.replace(/\s+/g, " ").trim(), inputs: inputs ?? [], tasks: numbered };
  }
  return { exercise, problems: [] };
}

/**
 * The property test of an exercise component's logic with the props of a block, over the seeds 1 to `seeds`: the
 * task is the same for the same seed, the solution passes, the wrong answer fails, reason gives a text or none for
 * it, and nothing throws. The first problem found, or none.
 */
export function propertyProblems(logic: ExerciseLogic, props: unknown, seeds = COMPONENT_SEEDS, lang = "de"): string[] {
  const run = <T>(seed: number, call: string, act: () => T): T | string => {
    try {
      return act();
    } catch (error) {
      return `\u0000for seed ${seed} ${call} throws: ${error instanceof Error ? error.message : String(error)}`;
    }
  };
  const failed = (value: unknown): value is string => typeof value === "string" && value.startsWith("\u0000");
  for (let seed = 1; seed <= seeds; seed++) {
    const task = run(seed, "generate(seed, props)", () => logic.generate(seed, props));
    if (failed(task)) return [task.slice(1)];
    const again = run(seed, "generate(seed, props)", () => logic.generate(seed, props));
    if (failed(again)) return [again.slice(1)];
    if (JSON.stringify(task) !== JSON.stringify(again)) {
      return [
        `for seed ${seed} generate(seed, props) gives another task each time; it must give the same task for the same seed`,
      ];
    }
    for (const [answer, want] of [
      ["solution", true],
      ["wrong", false],
    ] as const) {
      const call = `check(task, ${answer}(task))`;
      const result = run(seed, call, () => logic.check(task, logic[answer](task)));
      if (failed(result)) return [result.slice(1)];
      if (typeof result !== "boolean")
        return [`for seed ${seed} ${call} is ${String(result)}; check returns true or false`];
      if (result !== want) {
        return [
          `for seed ${seed} ${call} is ${String(result)}; ${answer}(task) must give an answer that check ${want ? "accepts" : "rejects"}`,
        ];
      }
    }
    if (logic.reason !== undefined) {
      const call = `reason(task, wrong(task), props, "${lang}")`;
      const message = run(seed, call, () => logic.reason?.(task, logic.wrong(task), props, lang));
      if (failed(message)) return [message.slice(1)];
      if (message !== undefined && typeof message !== "string") {
        return [
          `for seed ${seed} ${call} is ${JSON.stringify(message) ?? "a function"}; reason gives the app's message for a wrong answer as a text, or undefined for none`,
        ];
      }
    }
  }
  return [];
}

/**
 * Whether the check of an exercise component's logic, with the props of a block, judges each of the block's examples
 * as it is listed: an accepted answer passes, a rejected one fails, for the task of its seed, or of every seed from 1
 * to `seeds` when it gives none. One problem per example, at the first seed that judges it otherwise, with the
 * example's kind and index.
 */
export function exampleProblems(
  logic: ExerciseLogic,
  props: unknown,
  examples: ComponentExamples | undefined,
  seeds = COMPONENT_SEEDS,
): { kind: "accepted" | "rejected"; index: number; message: string }[] {
  const problems: { kind: "accepted" | "rejected"; index: number; message: string }[] = [];
  for (const kind of ["accepted", "rejected"] as const) {
    (examples?.[kind] ?? []).forEach((example, index) => {
      const shown = JSON.stringify(example.answer);
      for (const seed of example.seed === undefined ? Array.from({ length: seeds }, (_, i) => i + 1) : [example.seed]) {
        let result: unknown;
        try {
          result = logic.check(logic.generate(seed, props), example.answer);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          problems.push({ kind, index, message: `for seed ${seed} check(task, ${shown}) throws: ${reason}` });
          return;
        }
        if (typeof result !== "boolean") {
          problems.push({
            kind,
            index,
            message: `for seed ${seed} check(task, ${shown}) is ${String(result)}; check returns true or false`,
          });
          return;
        }
        if (result === (kind === "accepted")) continue;
        problems.push({
          kind,
          index,
          message: `for seed ${seed} ${verdict(shown, result, "check(task, answer)", "fix check so that it")}`,
        });
        return;
      }
    });
  }
  return problems;
}
