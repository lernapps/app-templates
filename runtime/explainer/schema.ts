// The explainer's content schema (explainer.v1.schema.json) at build time: the validators of its files (the app, a
// chapter, a page, a data file), and the explainer's own words for the errors of the schema (what a quote or a bundled
// image lacks, which fields a block type has, which an exercise of a question type); the general messages are
// shared/content.ts's.
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import schema from "./explainer.v1.schema.json" with { type: "json" };
import questionSchema from "../shared/questions/question.v1.schema.json" with { type: "json" };
import { addressProblem } from "../shared/questions/validate.ts";
import { isObject, schemaProblems, type DescribeError, type Problems, type YamlFile } from "../shared/content.ts";

export const SCHEMA_ID = schema.$id;
/** Where an app finds the schema of its content, for the message that names it. */
export const SCHEMA_FILE = "node_modules/@lernapps/app-templates/runtime/explainer/explainer.v1.schema.json";

// union types ("type": ["string", "object"]) keep the messages of the comparator and the lists plain
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
ajv.addSchema(questionSchema);
ajv.addSchema(schema);
const validator = (name: string): ValidateFunction => {
  const validate = ajv.getSchema(`${SCHEMA_ID}#/$defs/${name}`);
  if (validate === undefined) throw new Error(`the schema has no $defs/${name}`);
  return validate;
};
export const validators = {
  app: validator("app"),
  chapter: validator("chapter"),
  page: validator("page"),
  data: validator("data"),
  event: validator("event"),
};

type Definition = { properties?: Record<string, unknown>; allOf?: unknown[]; $ref?: string; then?: unknown };
const definitions = schema.$defs as unknown as Record<string, Definition>;

/** The properties a definition of the schema knows, with those of its allOf, its references and its branches. */
function known(definition: unknown, into = new Set<string>()): Set<string> {
  if (typeof definition !== "object" || definition === null) return into;
  const def = definition as Definition;
  for (const key of Object.keys(def.properties ?? {})) into.add(key);
  if (typeof def.$ref === "string") known(definitions[def.$ref.replace("#/$defs/", "")], into);
  for (const part of def.allOf ?? []) {
    known(part, into);
    if (typeof part === "object" && part !== null && "then" in part) known(part.then, into);
  }
  return into;
}
const BLOCK_DEFINITIONS: Readonly<Record<string, string>> = {
  text: "textBlock",
  formula: "formula",
  figure: "figure",
  "labelled-figure": "labelledFigure",
  table: "table",
  timeline: "timeline",
  definition: "definition",
  quote: "quote",
  code: "code",
  example: "box",
  note: "box",
  section: "section",
  generated: "generated",
  "vue-component": "vueComponent",
};

/** The fields of each of the question types, from the schema of a question. */
const questionDefinitions = questionSchema.$defs as unknown as Record<string, { properties?: Record<string, unknown> }>;
const QUESTION_BRANCH: Readonly<Record<string, string>> = {
  "single-choice": "choice",
  "multiple-choice": "choice",
  "true-false": "trueFalse",
  number: "number",
  ordering: "ordering",
  matching: "matching",
};
const questionFields = (type: string): Set<string> =>
  new Set([
    ...Object.keys(questionDefinitions["question"]?.properties ?? {}),
    ...Object.keys(questionDefinitions[QUESTION_BRANCH[type] ?? ""]?.properties ?? {}),
  ]);

/** What `required` names as missing, with why it is needed. */
function missing(property: string, object: unknown): string {
  const type = isObject(object) ? object["type"] : undefined;
  if (property === "origin") return "origin is missing; a quote names who said or wrote it, where and when";
  if ((property === "licence" || property === "source") && type === "quote") {
    return `${property} is missing; a quote names its source and its licence`;
  }
  if (property === "licence" || property === "source") {
    return `${property} is missing; a bundled image names its source and its licence`;
  }
  return `${property} is missing`;
}

/** The explainer's own words for the errors of its schema: what a block or an exercise lacks, or may not have. */
const describe: DescribeError = (error, path, value) => {
  switch (error.keyword) {
    case "anyOf": {
      // the address of a link of an exercise of the question types: an https address, or a map of them by language
      if (path.at(-1) !== "url") return undefined;
      const { lang, message } = addressProblem(value);
      return { message, ...(lang === undefined ? {} : { lang }) };
    }
    case "required":
    case "dependentRequired":
      return { message: missing(String(error.params["missingProperty"]), value) };
    case "unevaluatedProperties": {
      const property = String(error.params["unevaluatedProperty"]);
      const type = isObject(value) ? value["type"] : undefined;
      const kind = isObject(value) ? value["kind"] : undefined;
      const definition =
        path.at(-1) === "draw"
          ? "drawing"
          : typeof type === "string"
            ? BLOCK_DEFINITIONS[type]
            : typeof kind === "string"
              ? "drawing"
              : undefined;
      if (typeof type === "string" && type in QUESTION_BRANCH) {
        return questionFields(type).has(property)
          ? null
          : { message: `${property} is not a field of a ${type} exercise` };
      }
      if (definition === undefined || property === "type" || known(definitions[definition]).has(property)) return null;
      const what = path.at(-1) === "draw" ? `a ${String(kind)} drawing` : `a ${String(type)} block`;
      return { message: `${property} is not a field of ${what}` };
    }
    case "enum":
      if (path.at(-1) !== "type") return undefined;
      return {
        path: path.slice(0, -1),
        message: `${String(value)} is not a block type; use one of ${(error.params["allowedValues"] as string[]).join(", ")}`,
      };
  }
  return undefined;
};

export function validate(yaml: YamlFile, kind: keyof typeof validators, problems: Problems): boolean {
  const check = validators[kind];
  if (check(yaml.value)) return true;
  const before = problems.lines.length;
  schemaProblems(yaml, check.errors ?? [], problems, describe);
  // every error folded away: the file is still invalid
  if (problems.lines.length === before) problems.at(yaml, [], "does not match the schema");
  return false;
}
