// The explainer's content schema (explainer.v1.schema.json) at build time: the validators of its files (the app, a
// chapter, a page, a data file), and the explainer's own words for the errors of the schema (what a quote or a bundled
// image lacks, which fields a block type has, which an exercise of a question type); the general messages are
// shared/content.ts's.
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import schema from "./explainer.v1.schema.json" with { type: "json" };
import questionSchema from "../shared/questions/question.v1.schema.json" with { type: "json" };
import { knownProperties, schemasById } from "../shared/schema.ts";
import { addressProblem, QUESTION_BRANCH, questionSchemas } from "../shared/questions/validate.ts";
import { isObject, schemaProblems, type DescribeError, type Problems, type YamlFile } from "../shared/content.ts";

export const SCHEMA_ID = schema.$id;
/** Where an app finds the schema of its content, for the message that names it. */
export const SCHEMA_FILE = "node_modules/@lernapps/app-templates/runtime/explainer/explainer.v1.schema.json";

// union types ("type": ["string", "object"]) keep the messages of the comparator and the lists plain
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
for (const each of questionSchemas) ajv.addSchema(each);
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

const schemas = schemasById(...questionSchemas, schema);

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
  video: "video",
  example: "box",
  note: "box",
  section: "section",
  generated: "generated",
  "open-task": "openTask",
  "vue-component": "vueComponent",
};

/** The fields of an exercise of a question type: those of every question and those of its type. */
const questionFields = (type: string): Set<string> => {
  const own = knownProperties(schemas, questionSchema.$id, "question", { branches: false });
  const branch = knownProperties(schemas, questionSchema.$id, QUESTION_BRANCH[type] ?? "");
  return new Set([...own, ...branch]);
};

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
    case "pattern":
      // an exercise of a self-assessment: by its page and id
      if (path.at(-2) === "exercises" && path[0] === "selfAssessment") {
        return { message: `${String(value)} is no exercise's address; write /<chapter>/<page>/#<exercise>` };
      }
      // a video's id: an address pasted whole is the likely mistake
      if (path.at(-1) !== "youtube") return undefined;
      return {
        message: `${String(value)} is no YouTube id; give the 11 characters after watch?v= in the video's address, e.g. rkLmLaFHodo`,
      };
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
      if (
        definition === undefined ||
        property === "type" ||
        knownProperties(schemas, schema.$id, definition).has(property)
      )
        return null;
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
