// Validates a question bank at build time: against its JSON Schema (quiz.v1.schema.json), then what a schema
// cannot say (one correct option in a single choice, unique ids, ...). Each problem names the question and what to
// change, for the assistant that wrote the bank. One question validates on its own too (validateQuestion), with the
// same messages, for another archetype that embeds the quiz's questions; the bank validates each of its questions so.
// A bank in several languages declares them (languages, German first): each of its learner texts must then be a map
// with each of them and no other, with the messages of the explainer's language check; so must a link's address that
// is a map by language (a single address is the same in every language).
import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import { languageListProblems, textLanguages, type Text } from "../shared/languages.ts";
import schema from "./quiz.v1.schema.json" with { type: "json" };
import {
  questionAddresses,
  questionIn,
  questionTexts,
  quizIn,
  quizLanguages,
  type Question,
  type Quiz,
} from "./quiz.ts";
import { QUIZ_MESSAGES } from "./render.ts";

export const SCHEMA_URL = "https://lernapps.net/tooling/schemas/quiz.v1.schema.json";
/** The schema of one question, for a `$ref` from another schema (with the quiz's schema added to its validator). */
export const QUESTION_SCHEMA_URL = `${SCHEMA_URL}#/$defs/question`;
export const RULE_URL = "https://lernapps.net/tooling/rules/#quiz-bank-valid";
/** The schema of a question bank (quiz.v1.schema.json), to add to another schema's validator. */
export const quizSchema = schema;

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(schema);
function compiled<T>(ref: string): ValidateFunction<T> {
  const validate = ajv.getSchema<T>(ref);
  if (validate === undefined) throw new Error(`the quiz's schema has no ${ref}`);
  return validate;
}
const validateBank = compiled<Quiz<Text>>(SCHEMA_URL);
const validateOne = compiled<Question>(QUESTION_SCHEMA_URL);

/** `["options", "1", "text"]` as `.options[1].text`. */
const readable = (parts: readonly string[]) =>
  parts.map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`)).join("");

/** Where something in a question is: the question at `at`, the path below it, and the question's id if it has one. */
function inQuestion(at: string, parts: readonly string[], question: unknown): string {
  const id =
    typeof question === "object" && question !== null && "id" in question && typeof question.id === "string"
      ? question.id
      : undefined;
  return id === undefined ? `${at}${readable(parts)}` : `${at}${readable(parts)} (question "${id}")`;
}

/** `/questions/2/options/1/text` as `questions[2].options[1].text`, with the id of the question. */
function inBank(path: string, value: unknown): string {
  const parts = path.split("/").slice(1);
  const [first, index] = parts;
  if (first === "questions" && index !== undefined && /^\d+$/.test(index)) {
    const questions = typeof value === "object" && value !== null && "questions" in value ? value.questions : [];
    return inQuestion(
      `questions[${index}]`,
      parts.slice(2),
      Array.isArray(questions) ? questions[Number(index)] : undefined,
    );
  }
  const at = readable(parts);
  return at === "" ? "the bank" : at.slice(1);
}

/** Where the quiz declares its languages, for the message about a language it does not declare. */
const DECLARED_IN = "src/quiz.json";

/** The value at a JSON pointer of `root`. */
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
function schemaMessages(errors: readonly ErrorObject[], where: (path: string) => string, root: unknown): string[] {
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

function duplicates(values: readonly string[]): string[] {
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
  return [...problems, ...questionProblems(questionIn(question, "de"))];
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
  return questionDetails(question, languages, declaredIn).map((problem) =>
    problem.lang === undefined
      ? `${at} (question "${question.id}"): ${problem.message}`
      : `${at}${readable(problem.path.map(String))} (${problem.lang}) (question "${question.id}"): ${problem.message}`,
  );
}

/** The problems of the bank's own texts (title, intro, sources) in its languages. */
function bankTextProblems(quiz: Quiz<Text>, languages: readonly string[]): string[] {
  const texts: [string, Text][] = [
    ["title", quiz.title],
    ["intro", quiz.intro],
    ...(quiz.sources ?? []).map((source, index): [string, Text] => [`sources[${index}].title`, source.title]),
  ];
  return texts.flatMap(([at, text]) =>
    textLanguages(text, languages, false, DECLARED_IN).problems.map(
      (problem) => `${at} (${problem.lang}): ${problem.message}`,
    ),
  );
}

/** The problems of a question bank; none when it is valid. */
export function problems(value: unknown): string[] {
  if (!validateBank(value)) return schemaMessages(validateBank.errors ?? [], (path) => inBank(path, value), value);
  const languages = quizLanguages(value);
  const listed = languageListProblems(languages, Object.keys(QUIZ_MESSAGES)).map(
    (problem) => `languages[${Math.max(languages.lastIndexOf(problem.lang), 0)}]: ${problem.message}`,
  );
  if (listed.length > 0) return listed;
  const ids = value.questions.map((question) => question.id);
  return [
    ...duplicates(ids).map((id) => `questions: the id "${id}" appears twice; each question needs its own id`),
    ...bankTextProblems(value, languages),
    ...value.questions.flatMap((question, index) =>
      validateQuestion(question, `questions[${index}]`, languages, DECLARED_IN),
    ),
  ];
}

/** Reads a question bank from JSON text, in all its languages; throws an Error whose message lists every problem. */
export function readBank(text: string, file: string): Quiz<Text> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const found = problems(value);
  if (found.length > 0) {
    throw new Error(
      [
        `${file} is not a valid question bank (${RULE_URL}):`,
        ...found.map((problem) => `  - ${problem}`),
        `Fix the question bank as its schema says: ${SCHEMA_URL}`,
      ].join("\n"),
    );
  }
  return value as Quiz<Text>;
}

/** Reads a question bank from JSON text, in German; throws an Error whose message lists every problem. */
export const parseBank = (text: string, file: string): Quiz => quizIn(readBank(text, file), "de");
