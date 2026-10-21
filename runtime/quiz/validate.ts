// Validates a question bank at build time: against its JSON Schema (quiz.v1.schema.json), then what a schema
// cannot say (unique ids, ...), then each of its questions with the validation of one question
// (shared/questions/validate.ts). Each problem names the question and what to change, for the assistant that wrote the bank. A bank in several
// languages declares them (languages, German first): each of its learner texts must then be a map with each of them
// and no other, with the messages of the explainer's language check.
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import type { AppChecks } from "../shared/blocks/index.ts";
import { LANGUAGES, languageListProblems, textLanguages, type Text } from "../shared/languages.ts";
import {
  duplicates,
  inQuestion,
  questionSchemas,
  readable,
  schemaMessages,
  validateQuestion,
} from "../shared/questions/validate.ts";
import schema from "./quiz.v1.schema.json" with { type: "json" };
import { quizIn, quizLanguages, type Quiz } from "./quiz.ts";

export const SCHEMA_ID = schema.$id;
/** Where an app finds the schema of its question bank, for the message that names it. */
export const SCHEMA_FILE = "node_modules/@lernapps/app-templates/runtime/quiz/quiz.v1.schema.json";
export const RULE_URL = "https://lernapps.net/tooling/rules/#quiz-bank-valid";

const ajv = new Ajv2020({ allErrors: true, strict: true });
for (const each of questionSchemas) ajv.addSchema(each);
ajv.addSchema(schema);
function compiled<T>(ref: string): ValidateFunction<T> {
  const validate = ajv.getSchema<T>(ref);
  if (validate === undefined) throw new Error(`the quiz's schema has no ${ref}`);
  return validate;
}
const validateBank = compiled<Quiz<Text>>(SCHEMA_ID);

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
export function problems(value: unknown, app?: AppChecks): string[] {
  if (!validateBank(value)) return schemaMessages(validateBank.errors ?? [], (path) => inBank(path, value), value);
  const languages = quizLanguages(value);
  const listed = languageListProblems(languages, LANGUAGES).map(
    (problem) => `languages[${Math.max(languages.lastIndexOf(problem.lang), 0)}]: ${problem.message}`,
  );
  if (listed.length > 0) return listed;
  const ids = value.questions.map((question) => question.id);
  return [
    ...duplicates(ids).map((id) => `questions: the id "${id}" appears twice; each question needs its own id`),
    ...bankTextProblems(value, languages),
    ...value.questions.flatMap((question, index) =>
      validateQuestion(question, `questions[${index}]`, languages, DECLARED_IN, app),
    ),
  ];
}

/** Reads a question bank from JSON text, in all its languages; throws an Error whose message lists every problem. */
export function readBank(text: string, file: string, app?: AppChecks): Quiz<Text> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const found = problems(value, app);
  if (found.length > 0) {
    throw new Error(
      [
        `${file} is not a valid question bank (${RULE_URL}):`,
        ...found.map((problem) => `  - ${problem}`),
        `Fix the question bank as its schema says: ${SCHEMA_FILE}`,
      ].join("\n"),
    );
  }
  return value as Quiz<Text>;
}

/** Reads a question bank from JSON text, in German; throws an Error whose message lists every problem. */
export const parseBank = (text: string, file: string, app?: AppChecks): Quiz => quizIn(readBank(text, file, app), "de");
