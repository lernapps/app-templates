// Validates one question at build time, for every archetype that has questions: against its JSON Schema
// (question.v1.schema.json), then what a schema cannot say (one correct option in a single choice, unique options,
// ...), and that the check judges each of the question's examples as it is listed: accepted or rejected. Each problem
// names the question and what to change, for the assistant that wrote it. validateQuestion works on one question in
// any place, e.g. `questions[2]` in a quiz's bank or `blocks[3]` on an explainer's page.
// A question in several languages declares them (languages, German first): each of its learner texts must then be a
// map with each of them and no other, with the messages of the language check; so must a link's address that is a map
// by language (a single address is the same in every language).
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import { verdict } from "../examples.ts";
import { textLanguages } from "../languages.ts";
import type { Text } from "../languages.ts";
import schema from "./question.v1.schema.json" with { type: "json" };
import {
  isComplete,
  isCorrect,
  parseNumber,
  questionAddresses,
  questionIn,
  questionTexts,
  type Answer,
  type Examples,
  type Question,
} from "./question.ts";

export const QUESTION_SCHEMA_ID = "https://lernapps.net/tooling/schemas/question.v1.schema.json";
/** The schema of one question, for a `$ref` from another schema (with `questionSchema` added to its validator). */
export const QUESTION_REF = `${QUESTION_SCHEMA_ID}#/$defs/question`;
/** The schema of a question (question.v1.schema.json), to add to another schema's validator. */
export const questionSchema = schema;

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(schema);
const validateOne = (() => {
  const validate = ajv.getSchema<Question>(QUESTION_REF);
  if (validate === undefined) throw new Error(`the question's schema has no ${QUESTION_REF}`);
  return validate;
})();

/** `["options", "1", "text"]` as `.options[1].text`. */
export const readable = (parts: readonly string[]) =>
  parts.map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`)).join("");

/** Where something in a question is: the question at `at`, the path below it, and the question's id if it has one. */
export function inQuestion(at: string, parts: readonly string[], question: unknown): string {
  const id =
    typeof question === "object" && question !== null && "id" in question && typeof question.id === "string"
      ? question.id
      : undefined;
  return id === undefined ? `${at}${readable(parts)}` : `${at}${readable(parts)} (question "${id}")`;
}

/** `/questions/2/options/1/text` as `questions[2].options[1].text`, with the id of the question. */

function valueAt(root: unknown, pointer: string): unknown {
  return pointer
    .split("/")
    .slice(1)
    .reduce<unknown>(
      (at, part) => (typeof at === "object" && at !== null ? (at as Record<string, unknown>)[part] : undefined),
      root,
    );
}

/** A learner text that is neither a text nor a map of texts. */
function textMessage(value: unknown, at: string): string {
  if (typeof value === "string") return `${at}: must not be empty`;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const bad = Object.entries(value).find(
      ([lang, text]) => !/^[a-z]{2}$/.test(lang) || typeof text !== "string" || text.trim() === "",
    );
    if (bad !== undefined) {
      return /^[a-z]{2}$/.test(bad[0])
        ? `${at} (${bad[0]}): must not be empty`
        : `${at}: ${bad[0]} is not a language code; use two letters, e.g. de, en`;
    }
  }
  return `${at}: must be a text, or a map of texts by language: { de: …, en: … }`;
}

/**
 * What is wrong with a link's address that is neither an https address nor a map of them by language: in which
 * language, when it is one of a map. Also for the explainer, which embeds the quiz's question types.
 */
export function addressProblem(value: unknown): { lang?: string; message: string } {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    for (const [lang, address] of Object.entries(value)) {
      if (!/^[a-z]{2}$/.test(lang)) return { message: `${lang} is not a language code; use two letters, e.g. de, en` };
      if (typeof address !== "string" || !/^https:\/\/\S+$/.test(address)) {
        return { lang, message: "must be an https address" };
      }
    }
  }
  return {
    message: "must be an https address, or a map of https addresses by language: { de: https://…, en: https://… }",
  };
}

function schemaMessage(error: ErrorObject, at: string): string | undefined {
  switch (error.keyword) {
    // reported by the branch of the question's type, which says more
    case "if":
      return undefined;
    case "required":
      return `${at}: ${String(error.params["missingProperty"])} is missing`;
    case "additionalProperties":
      return `${at}: ${String(error.params["additionalProperty"])} is not allowed here`;
    case "unevaluatedProperties":
      return `${at}: ${String(error.params["unevaluatedProperty"])} is not allowed for this type of question`;
    case "enum":
      return `${at}: must be one of ${(error.params["allowedValues"] as unknown[]).join(", ")}`;
    case "pattern":
      return error.instancePath.endsWith("/id")
        ? `${at}: use lower-case letters, digits and hyphens, e.g. "brueche-kuerzen"`
        : `${at}: must not be empty`;
    default:
      return `${at}: ${error.message ?? "is invalid"}`;
  }
}

/** The messages of the schema's errors, each at the place `where` names for its path. */
export function schemaMessages(
  errors: readonly ErrorObject[],
  where: (path: string) => string,
  root: unknown,
): string[] {
  // a learner text or an address (each also a map by language): one message, not one per branch
  const texts = new Set(errors.filter((error) => error.keyword === "anyOf").map((error) => error.instancePath));
  const underText = (path: string) => [...texts].some((text) => path === text || path.startsWith(`${text}/`));
  // a question of an unknown type: say that, not every property its type would not allow
  const unknownType = new Set(
    errors
      .filter((error) => error.keyword === "enum" && error.instancePath.endsWith("/type"))
      .map((error) => error.instancePath.slice(0, -"/type".length)),
  );
  return errors
    .filter((error) => !(error.keyword === "unevaluatedProperties" && unknownType.has(error.instancePath)))
    .filter((error) => error.keyword === "anyOf" || !underText(error.instancePath))
    .flatMap((error) => {
      if (error.keyword !== "anyOf") return schemaMessage(error, where(error.instancePath)) ?? [];
      const value = valueAt(root, error.instancePath);
      if (!error.instancePath.endsWith("/url")) return textMessage(value, where(error.instancePath));
      const { lang, message } = addressProblem(value);
      return `${where(error.instancePath)}${lang === undefined ? "" : ` (${lang})`}: ${message}`;
    });
}

export function duplicates(values: readonly string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

/** A problem of one question: where in it (its path; [] for the whole question), in which language, and what. */
export interface QuestionProblem {
  path: (string | number)[];
  lang?: string;
  message: string;
}

/** What the schema cannot say about one question, its texts in German. */
function questionProblems(question: Question): QuestionProblem[] {
  const problems: QuestionProblem[] = [];
  const twice = (what: string, path: string, values: readonly string[]) => {
    for (const value of duplicates(values))
      problems.push({ path: [path], message: `the ${what} "${value}" appears twice` });
  };
  switch (question.type) {
    case "single-choice": {
      const correct = question.options.filter((option) => option.correct).length;
      if (correct !== 1) {
        problems.push({
          path: ["options"],
          message: `a single-choice question needs exactly one correct option; it has ${correct}. Mark one option "correct": true, or make it "multiple-choice"`,
        });
      }
      twice(
        "option",
        "options",
        question.options.map((option) => option.text),
      );
      break;
    }
    case "multiple-choice":
      if (!question.options.some((option) => option.correct)) {
        problems.push({
          path: ["options"],
          message: "a multiple-choice question needs at least one correct option; it has none",
        });
      }
      twice(
        "option",
        "options",
        question.options.map((option) => option.text),
      );
      break;
    case "ordering":
      twice("item", "items", question.items);
      break;
    case "matching":
      twice(
        "left entry",
        "pairs",
        question.pairs.map((pair) => pair.left),
      );
      twice(
        "right entry",
        "pairs",
        question.pairs.map((pair) => pair.right),
      );
      break;
    case "number":
      question.mistakes?.forEach((mistake, index) => {
        if (Math.abs(mistake.answer - question.answer) <= question.tolerance + 1e-9) {
          problems.push({
            path: ["mistakes", index, "answer"],
            message: `the mistake ${mistake.answer} counts as right: it is within the tolerance of the answer ${question.answer}; give the wrong number the mistake leads to`,
          });
        }
      });
      for (const value of duplicates((question.mistakes ?? []).map((mistake) => String(mistake.answer)))) {
        problems.push({
          path: ["mistakes"],
          message: `the mistake ${value} appears twice; list each wrong number once`,
        });
      }
      break;
    case "true-false":
      break;
  }
  return problems;
}

/** An example's answer, or what is wrong with it. */
type ExampleAnswer = { answer: Answer } | { problem: string };

/** The index of an option, item or entry given as its index from 0 or as its text in German; or what is wrong. */
function indexOf(value: unknown, texts: readonly string[], what: string): number | string {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < texts.length) return value;
  if (typeof value === "string" && texts.includes(value)) return texts.indexOf(value);
  const given = typeof value === "string" ? `"${value}"` : JSON.stringify(value);
  return `${given} is not ${what}; give its index from 0 to ${texts.length - 1}, or its text as written (in German)`;
}

/** Indices of `values`, each in `texts`; or the first problem. */
function indicesOf(values: readonly unknown[], texts: readonly string[], what: string): number[] | string {
  const found = values.map((value) => indexOf(value, texts, what));
  const problem = found.find((value) => typeof value === "string");
  return typeof problem === "string" ? problem : (found as number[]);
}

/**
 * An example as the checker receives a learner's answer to `question` (in German): single choice an option, multiple
 * choice a list of options, true/false a boolean, number a number or the text a learner types, ordering the items in
 * the learner's order, matching a list of pairs [left, right]; an option, item or entry by its index from 0 or its
 * text. A complete answer, as the page only checks one.
 */
function exampleAnswer(question: Question, example: unknown): ExampleAnswer {
  const expect = (what: string) => ({ problem: `give ${what}` });
  let answer: Answer;
  switch (question.type) {
    case "single-choice": {
      const index = indexOf(
        example,
        question.options.map((option) => option.text),
        "an option",
      );
      if (typeof index === "string") return { problem: index };
      answer = index;
      break;
    }
    case "multiple-choice": {
      if (!Array.isArray(example)) return expect("the chosen options as a list: [0, 2]");
      const indices = indicesOf(
        example,
        question.options.map((option) => option.text),
        "an option",
      );
      if (typeof indices === "string") return { problem: indices };
      answer = [...new Set(indices)].sort((a, b) => a - b);
      break;
    }
    case "true-false":
      if (typeof example !== "boolean") return expect("true or false");
      answer = example;
      break;
    case "number":
      if (typeof example === "number") answer = String(example);
      else if (typeof example === "string" && parseNumber(example, question.unit) !== undefined) answer = example;
      else return expect('a number, or the text a learner types, e.g. "12,5"');
      break;
    case "ordering": {
      if (!Array.isArray(example)) return expect("the items in the learner's order as a list");
      const order = indicesOf(example, question.items, "an item");
      if (typeof order === "string") return { problem: order };
      if (new Set(order).size !== question.items.length || order.length !== question.items.length) {
        return expect(`each of the ${question.items.length} items once, in the learner's order`);
      }
      // for each item (in the right order), the place the learner gave it
      answer = question.items.map((_item, index) => order.indexOf(index));
      break;
    }
    case "matching": {
      const pairs = Array.isArray(example) ? (example as unknown[]) : [];
      if (!Array.isArray(example) || pairs.some((pair) => !Array.isArray(pair) || pair.length !== 2)) {
        return expect("a list of pairs [left, right]");
      }
      const lefts = indicesOf(
        pairs.map((pair) => (pair as unknown[])[0]),
        question.pairs.map((pair) => pair.left),
        "a left entry",
      );
      if (typeof lefts === "string") return { problem: lefts };
      const rights = indicesOf(
        pairs.map((pair) => (pair as unknown[])[1]),
        question.pairs.map((pair) => pair.right),
        "a right entry",
      );
      if (typeof rights === "string") return { problem: rights };
      if (new Set(lefts).size !== question.pairs.length || lefts.length !== question.pairs.length) {
        return expect(`one pair for each of the ${question.pairs.length} left entries`);
      }
      // for each left entry, the pair whose right entry the learner chose
      answer = question.pairs.map((_pair, index) => rights[lefts.indexOf(index)] ?? -1);
      break;
    }
  }
  return isComplete(question, answer) ? { answer } : expect("a complete answer: the page checks only those");
}

/**
 * Whether each example of `question` (in German) gets the verdict it is listed with from the same check the page
 * uses: an accepted one passes, a rejected one fails. Each problem at the example's place.
 */
export function exampleProblems(question: Question, examples: Examples | undefined): QuestionProblem[] {
  const problems: QuestionProblem[] = [];
  for (const kind of ["accepted", "rejected"] as const) {
    (examples?.[kind] ?? []).forEach((example, index) => {
      const path = ["examples", kind, index];
      const given = exampleAnswer(question, example);
      if ("problem" in given) {
        problems.push({ path, message: given.problem });
        return;
      }
      const right = isCorrect(question, given.answer);
      if (right === (kind === "accepted")) return;
      problems.push({
        path,
        message: verdict(
          JSON.stringify(example),
          right,
          "the check",
          "change the question (e.g. another type, a tolerance) so that its check",
        ),
      });
    });
  }
  return problems;
}

/**
 * The problems of a question that matches the schema, with their place in it: its texts complete in each of
 * `languages` and in no other (German first, with the messages of the explainer's language check), so its addresses
 * given as maps, then what the schema cannot say. A plain string is German, complete only while German is the only
 * language; a plain address is the same in every language.
 */
export function questionDetails(
  question: Question<Text>,
  languages: readonly string[] = ["de"],
  declaredIn?: string,
): QuestionProblem[] {
  const problems: QuestionProblem[] = [];
  for (const { path, text } of questionTexts(question)) {
    for (const problem of textLanguages(text, languages, false, declaredIn).problems) {
      problems.push({ path, lang: problem.lang, message: problem.message });
    }
  }
  for (const { path, text } of questionAddresses(question)) {
    for (const problem of textLanguages(text, languages, true, declaredIn).problems) {
      problems.push({ path, lang: problem.lang, message: problem.message });
    }
  }
  const german = questionIn(question, "de");
  return [...problems, ...questionProblems(german), ...exampleProblems(german, question.examples)];
}

/** Whether `value` matches the schema of one question; its errors as messages at `at` otherwise. */
export function questionSchemaProblems(value: unknown, at: string): string[] {
  if (validateOne(value)) return [];
  return schemaMessages(validateOne.errors ?? [], (path) => inQuestion(at, path.split("/").slice(1), value), value);
}

/**
 * The problems of one question; none when it is valid. `at` is where the question is, e.g. `questions[2]` in a bank
 * or `blocks[3]` on a page; each problem starts with it, the path below it and the question's id. `languages` are the
 * declared languages of the page, declared in `declaredIn` (src/app.yaml by default).
 */
export function validateQuestion(
  value: unknown,
  at: string,
  languages: readonly string[] = ["de"],
  declaredIn?: string,
): string[] {
  const schemaProblems = questionSchemaProblems(value, at);
  if (schemaProblems.length > 0) return schemaProblems;
  const question = value as Question<Text>;
  // an example is one of many: named by its place
  return questionDetails(question, languages, declaredIn).map((problem) =>
    problem.lang === undefined && problem.path[0] !== "examples"
      ? `${at} (question "${question.id}"): ${problem.message}`
      : `${at}${readable(problem.path.map(String))}${problem.lang === undefined ? "" : ` (${problem.lang})`} (question "${question.id}"): ${problem.message}`,
  );
}
