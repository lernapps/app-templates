// Reads an explainer's content from src/ at build time and validates it: each file against its part of the schema
// (explainer.v1.schema.json), then what a schema cannot say. The order lists are complete and unique, the depth is
// app, chapter, page and two section levels, ids are unique per level, every text is complete in each declared
// language and in no other, texts hold restricted Markdown without raw HTML or headings, formulas are in the command
// list, bundled images and quotes name source and licence, links to pages of the app find their page and section,
// every page has an exercise, a question of the quiz's types passes the quiz's validation in every declared language,
// a generated exercise declares what it uses and passes its property test over fixed seeds (generated.ts), the check
// of each exercise judges its examples as they are listed, a vue-component block names a component of src/components/
// that passes its checks (components.ts), its props match the component's prop types, it has its nojs text (an exercise
// component's is generated from its describe) and, for an exercise component, its examples (which the build step
// runs, plugin.ts) and an anchor once on the page (its id, or its name in kebab case), and src/ holds nothing else. Each problem is one line: the file,
// its line, the place in the file, the language where it matters, and what to do.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import { isNode, LineCounter, parseDocument, type Document } from "yaml";
import schema from "./explainer.v1.schema.json" with { type: "json" };
import quizSchema from "../quiz/quiz.v1.schema.json" with { type: "json" };
import { questionTexts } from "../quiz/quiz.ts";
import { addressProblem, questionDetails } from "../quiz/validate.ts";
import {
  inLanguage,
  isExercise,
  termId,
  type App,
  type Block,
  type BlockOf,
  type Chapter,
  type ComponentUse,
  type DataRecord,
  type Event,
  type Page,
  type Site,
  type Text,
} from "./content.ts";
import { propsProblems, readComponents, textPaths } from "./components.ts";
import { ExpressionError, parse, variables } from "./expression.ts";
import { dataOf, templatesOf } from "./exercises.ts";
import { formulaProblem } from "./formula.ts";
import {
  exampleProblems,
  soundness,
  templateProblems,
  unusedVariables,
  type Generated,
  type Templates,
} from "./generated.ts";
import { formulaProblems, htmlTag, inspect } from "./markdown.ts";
import { MESSAGES } from "./messages.ts";
import { allBlocks } from "./routes.ts";
import { RESERVED_PARAMS } from "./tasks.ts";
import { appName } from "../shared/appname.ts";
import { languageListProblems, textLanguages } from "../shared/languages.ts";

export const SCHEMA_URL = "https://lernapps.net/tooling/schemas/explainer.v1.schema.json";
export const RULE_URL = "https://lernapps.net/tooling/rules/#explainer-content-valid";

/** What src/ may hold besides the chapter folders. */
const SRC = "src/ holds only app.yaml, the chapter folders, data/, images/, components/ and main.ts";
/** Chapter ids that would collide with other addresses: data files, images, the glossary, language trees. */
const RESERVED = new Set(["data", "images", "glossar", "components", "assets"]);
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const IMAGE = /^[a-z0-9]+(-[a-z0-9]+)*\.(svg|png|jpg|webp)$/;
/** A source of a credit that is only a URL, rendered as a link. */
const SOURCE_URL = /^https?:\/\/\S+$/;

type Path = readonly (string | number)[];

/** A YAML file of the content, parsed, with its line positions. */
export interface YamlFile {
  file: string;
  doc: Document;
  lines: LineCounter;
  value: unknown;
}

/** The content could not be read: one problem per line in `problems`. */
export class ContentError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(
      [
        `the explainer's content in src/ is not valid (${RULE_URL}):`,
        ...problems.map((problem) => `  - ${problem}`),
        `Fix the content as its schema says: ${SCHEMA_URL}`,
      ].join("\n"),
    );
    this.problems = problems;
  }
}

/** `["blocks", 0, "text"]` as `blocks[0].text`. */
export function pathText(path: Path): string {
  return path.map((part, index) => (typeof part === "number" ? `[${part}]` : index === 0 ? part : `.${part}`)).join("");
}

// union types ("type": ["string", "object"]) keep the messages of the comparator and the lists plain
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
ajv.addSchema(quizSchema);
ajv.addSchema(schema);
const validator = (name: string): ValidateFunction => {
  const validate = ajv.getSchema(`${SCHEMA_URL}#/$defs/${name}`);
  if (validate === undefined) throw new Error(`the schema has no $defs/${name}`);
  return validate;
};
const validators = {
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

/** The fields of each of the quiz's question types, from the quiz's schema. */
const quizDefinitions = quizSchema.$defs as unknown as Record<string, { properties?: Record<string, unknown> }>;
const QUIZ_BRANCH: Readonly<Record<string, string>> = {
  "single-choice": "choice",
  "multiple-choice": "choice",
  "true-false": "trueFalse",
  number: "number",
  ordering: "ordering",
  matching: "matching",
};
const quizFields = (type: string): Set<string> =>
  new Set([
    ...Object.keys(quizDefinitions["question"]?.properties ?? {}),
    ...Object.keys(quizDefinitions[QUIZ_BRANCH[type] ?? ""]?.properties ?? {}),
  ]);

const get = (value: unknown, path: Path): unknown =>
  path.reduce<unknown>(
    (at, part) => (typeof at === "object" && at !== null ? (at as Record<string, unknown>)[part] : undefined),
    value,
  );
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Collects the problems, one line each, without repeating one. */
export class Problems {
  readonly lines: string[] = [];
  add(line: string): void {
    if (!this.lines.includes(line)) this.lines.push(line);
  }
  /** A problem at `path` in `yaml` (in `lang`), `offset` lines below the line of the value there. */
  at(yaml: YamlFile, path: Path, message: string, lang?: string, offset = 0): void {
    const line = lineOf(yaml, path, offset);
    // the text of one language is at <path>.<lang>: named as <path> (<lang>)
    const shown = lang !== undefined && path.at(-1) === lang ? path.slice(0, -1) : path;
    const where = shown.length === 0 ? "" : ` ${pathText(shown)}${lang === undefined ? "" : ` (${lang})`}:`;
    this.add(`${yaml.file}${line === undefined ? "" : `:${line}`}:${where} ${message}`);
  }
  file(file: string, message: string): void {
    this.add(`${file}: ${message}`);
  }
}

/** The line of the value at `path`, or of the nearest value around it; a block scalar's text starts a line lower. */
function lineOf(yaml: YamlFile, path: Path, offset: number): number | undefined {
  for (let length = path.length; length >= 0; length--) {
    const node = yaml.doc.getIn(path.slice(0, length), true);
    if (!isNode(node) || node.range === undefined || node.range === null) continue;
    const block = "type" in node && (node.type === "BLOCK_LITERAL" || node.type === "BLOCK_FOLDED");
    const start = yaml.lines.linePos(node.range[0]).line;
    return start + (length === path.length ? offset + (block && offset > 0 ? 1 : block ? 1 : 0) : 0);
  }
  return undefined;
}

export function readYaml(root: string, file: string, problems: Problems): YamlFile | undefined {
  const lines = new LineCounter();
  const doc = parseDocument(readFileSync(join(root, file), "utf8"), { lineCounter: lines, prettyErrors: false });
  if (doc.errors.length > 0) {
    for (const error of doc.errors) {
      const line = lines.linePos(error.pos[0]).line;
      problems.add(`${file}:${line}: not valid YAML: ${error.message.split("\n")[0] ?? ""}`);
    }
    return undefined;
  }
  return { file, doc, lines, value: doc.toJS() as unknown };
}

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

/** The schema's errors as problems: one per cause, the branches of texts and blocks folded. */
export function schemaProblems(yaml: YamlFile, errors: readonly ErrorObject[], problems: Problems): void {
  const pathOf = (pointer: string): Path =>
    pointer
      .split("/")
      .slice(1)
      .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
      .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
  const texts = errors.filter((error) => error.keyword === "anyOf").map((error) => error.instancePath);
  const underText = (error: ErrorObject) =>
    texts.some((text) => error.instancePath === text || error.instancePath.startsWith(`${text}/`));
  for (const error of errors) {
    const path = pathOf(error.instancePath);
    const value = get(yaml.value, path);
    switch (error.keyword) {
      case "if":
        break;
      case "anyOf": {
        // the address of a link of an exercise of the quiz's types: an https address, or a map of them by language
        if (path.at(-1) === "url") {
          const { lang, message } = addressProblem(value);
          problems.at(yaml, path, message, lang);
        } else if (typeof value === "string") problems.at(yaml, path, "must not be empty");
        else if (isObject(value)) {
          for (const [lang, text] of Object.entries(value)) {
            if (typeof text !== "string") problems.at(yaml, path, "must be a text", lang);
            else if (text.trim() === "") problems.at(yaml, path, "must not be empty", lang);
            else if (!/^[a-z]{2}$/.test(lang)) {
              problems.at(yaml, path, `${lang} is not a language code; use two letters, e.g. de, en`);
            }
          }
        } else problems.at(yaml, path, "must be a text, or a map of texts by language: { de: …, en: … }");
        break;
      }
      case "required":
      case "dependentRequired":
        problems.at(yaml, path, missing(String(error.params["missingProperty"]), value));
        break;
      case "additionalProperties":
        problems.at(yaml, path, `${String(error.params["additionalProperty"])} is not allowed here`);
        break;
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
        if (typeof type === "string" && type in QUIZ_BRANCH) {
          if (!quizFields(type).has(property))
            problems.at(yaml, path, `${property} is not a field of a ${type} exercise`);
          break;
        }
        if (definition === undefined) break;
        if (property !== "type" && !known(definitions[definition]).has(property)) {
          const what = path.at(-1) === "draw" ? `a ${String(kind)} drawing` : `a ${String(type)} block`;
          problems.at(yaml, path, `${property} is not a field of ${what}`);
        }
        break;
      }
      case "enum":
        if (path.at(-1) === "type") {
          problems.at(
            yaml,
            path.slice(0, -1),
            `${String(value)} is not a block type; use one of ${(error.params["allowedValues"] as string[]).join(", ")}`,
          );
        } else {
          problems.at(yaml, path, `must be one of ${(error.params["allowedValues"] as unknown[]).join(", ")}`);
        }
        break;
      case "pattern":
        if (underText(error)) break;
        if (error.schemaPath.includes("/id/") || error.schemaPath.startsWith("#/$defs/id")) {
          problems.at(yaml, path, `use lower-case letters, digits and hyphens, e.g. "prozentwert"`);
        } else if (String(error.params["pattern"]) === "\\S") problems.at(yaml, path, "must not be empty");
        else problems.at(yaml, path, `must match ${String(error.params["pattern"])}`);
        break;
      case "type":
      case "minLength":
        if (!underText(error)) problems.at(yaml, path, error.message ?? "is not valid");
        break;
      case "minItems":
        problems.at(yaml, path, "must not be empty");
        break;
      default:
        if (!underText(error)) problems.at(yaml, path, error.message ?? "is not valid");
    }
  }
}

function validate(yaml: YamlFile, kind: keyof typeof validators, problems: Problems): boolean {
  const check = validators[kind];
  if (check(yaml.value)) return true;
  const before = problems.lines.length;
  schemaProblems(yaml, check.errors ?? [], problems);
  // every error folded away: the file is still invalid
  if (problems.lines.length === before) problems.at(yaml, [], "does not match the schema");
  return false;
}

/** Where a link inside a text was written, to check its target once every page is known. */
interface Link {
  yaml: YamlFile;
  path: Path;
  lang: string;
  offset: number;
  href: string;
}

/** The checks of the texts: languages, raw HTML, Markdown, formulas. */
export class Texts {
  readonly links: Link[] = [];
  readonly languages: readonly string[];
  private readonly problems: Problems;
  constructor(languages: readonly string[], problems: Problems) {
    this.languages = languages;
    this.problems = problems;
  }

  /**
   * The text at `path` of `yaml`: a plain text, restricted Markdown, a formula, a name (a person, a work), or the source
   * of a credit (a URL or a citation); a formula, a name or a URL given as a string is the same in every language, a
   * citation is a plain text.
   */
  check(yaml: YamlFile, path: Path, kind: "plain" | "markdown" | "latex" | "name" | "credit"): void {
    const value = get(yaml.value, path);
    if (value === undefined) return;
    const neutral =
      kind === "latex" || kind === "name" || (kind === "credit" && typeof value === "string" && SOURCE_URL.test(value));
    const { texts, problems } = textLanguages(value as Text, this.languages, neutral);
    for (const problem of problems) this.problems.at(yaml, path, problem.message, problem.lang);
    for (const { lang, text, keyed } of texts) {
      const at = keyed ? [...path, lang] : path;
      if (kind === "latex") {
        const problem = formulaProblem(text);
        if (problem !== undefined) this.problems.at(yaml, at, problem, keyed ? lang : undefined);
        continue;
      }
      if (kind === "plain" || kind === "name" || kind === "credit") {
        const tag = htmlTag(text);
        if (tag !== undefined) {
          this.problems.at(
            yaml,
            at,
            `raw HTML (<${tag}>) is not allowed; write restricted Markdown: **bold**, *italics*, lists, links`,
            lang,
          );
        }
        continue;
      }
      const found = inspect(text);
      for (const problem of found.problems) this.problems.at(yaml, at, problem.message, lang, problem.line);
      for (const href of found.links.filter((link) => link.startsWith("/"))) {
        this.links.push({ yaml, path: at, lang, offset: 0, href });
      }
    }
  }
}

/** A date of an event as a number to sort by: year, month, day. */
function dateOrder(date: number | string): number {
  if (typeof date === "number") return date * 10_000;
  const match = /^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(date);
  if (match === null) return 0;
  const year = Number(match[1]);
  return year * 10_000 + Number(match[2] ?? 0) * 100 + Number(match[3] ?? 0);
}

interface PageCheck {
  yaml: YamlFile;
  texts: Texts;
  problems: Problems;
  root: string;
  dataFiles: ReadonlyMap<string, YamlFile>;
  terms: Map<string, string>;
  images: Map<string, string>;
  /** The anchors of the page's sections: warum, regel/merkhilfe. */
  anchors: Set<string>;
  /** The ids of the page's exercises, which are anchors too, with where each is. */
  exercises: Map<string, Path>;
  /** How many seeds the property test of a generated exercise draws. */
  seeds: number;
  /** The components of src/components/, when it exists. */
  components: ReturnType<typeof readComponents> | undefined;
  /** The vue-component blocks so far. */
  uses: ComponentUse[];
}

function checkEvents(check: PageCheck, yaml: YamlFile, path: Path, events: readonly Event[]): void {
  events.forEach((event, index) => {
    const at = [...path, index];
    check.texts.check(yaml, [...at, "label"], "plain");
    check.texts.check(yaml, [...at, "title"], "plain");
    check.texts.check(yaml, [...at, "text"], "markdown");
    const before = events[index - 1];
    if (before !== undefined && dateOrder(event.date) < dateOrder(before.date)) {
      check.problems.at(
        yaml,
        at,
        `${event.date} comes before ${before.date}, the event above it; list the events from the earliest`,
      );
    }
  });
}

/** The image `image` (images/<name>) is bundled in src/images/. */
function checkImage(check: PageCheck, path: Path, image: string): void {
  const file = join(check.root, "src", image);
  if (existsSync(file)) check.images.set(image, file);
  else check.problems.at(check.yaml, path, `${image} is missing: put the file into src/images/`);
}

function checkBlocks(check: PageCheck, blocks: readonly Block[], path: Path, depth: number, box?: string): void {
  const ids = new Set<string>();
  blocks.forEach((block, index) => {
    const at = [...path, index];
    const { yaml, texts, problems } = check;
    switch (block.type) {
      case "section": {
        if (box !== undefined) {
          problems.at(yaml, at, `a section inside ${box === "example" ? "an" : "a"} ${box}; a box holds no sections`);
          break;
        }
        if (depth >= 2) {
          problems.at(
            yaml,
            at,
            "a section inside a subsection; sections go two levels deep at most, so split the page",
          );
          break;
        }
        if (ids.has(block.id)) {
          problems.at(yaml, [...at, "id"], `${block.id} is used twice at this level; give each section its own id`);
        }
        ids.add(block.id);
        const anchor = [...(depth === 1 ? [String(get(yaml.value, [...path.slice(0, -1), "id"]))] : []), block.id];
        check.anchors.add(anchor.join("/"));
        texts.check(yaml, [...at, "title"], "plain");
        checkBlocks(check, block.blocks, [...at, "blocks"], depth + 1);
        break;
      }
      case "example":
      case "note":
        if (box !== undefined) {
          problems.at(
            yaml,
            at,
            `${block.type === "example" ? "an" : "a"} ${block.type} inside a ${box}; a box holds no boxes`,
          );
          break;
        }
        texts.check(yaml, [...at, "title"], "plain");
        checkBlocks(check, block.blocks, [...at, "blocks"], depth, block.type);
        break;
      case "text":
        texts.check(yaml, [...at, "text"], "markdown");
        break;
      case "formula":
        texts.check(yaml, [...at, "formula"], "latex");
        break;
      case "figure":
        if ((block.draw === undefined) === (block.image === undefined)) {
          problems.at(
            yaml,
            at,
            block.draw === undefined
              ? "draw or image is missing; a figure is drawn from data (draw) or a bundled image (image)"
              : "draw and image: a figure is either drawn from data or a bundled image",
          );
        }
        if (block.image !== undefined) checkImage(check, [...at, "image"], block.image);
        texts.check(yaml, [...at, "alt"], "plain");
        texts.check(yaml, [...at, "caption"], "markdown");
        texts.check(yaml, [...at, "source"], "credit");
        break;
      case "labelled-figure":
        checkImage(check, [...at, "image"], block.image);
        texts.check(yaml, [...at, "alt"], "plain");
        texts.check(yaml, [...at, "caption"], "markdown");
        block.labels.forEach((_label, label) => texts.check(yaml, [...at, "labels", label, "text"], "plain"));
        texts.check(yaml, [...at, "source"], "credit");
        break;
      case "table": {
        texts.check(yaml, [...at, "caption"], "plain");
        block.header?.forEach((_cell, cell) => texts.check(yaml, [...at, "header", cell], "markdown"));
        const columns = block.header?.length ?? block.rows[0]?.length ?? 0;
        block.rows.forEach((row, line) => {
          if (row.length !== columns) {
            problems.at(
              yaml,
              [...at, "rows", line],
              `${row.length} cells, but the table has ${columns} columns; give each row a cell per column`,
            );
          }
          row.forEach((_cell, cell) => texts.check(yaml, [...at, "rows", line, cell], "markdown"));
        });
        break;
      }
      case "timeline": {
        if ((block.events === undefined) === (block.data === undefined)) {
          problems.at(
            yaml,
            at,
            block.events === undefined
              ? "events or data is missing; a timeline lists its events, or names a data file"
              : "events and data: a timeline lists its events or names a data file, not both",
          );
          break;
        }
        if (block.events !== undefined) {
          checkEvents(check, yaml, [...at, "events"], block.events);
          break;
        }
        const data = check.dataFiles.get(block.data ?? "");
        if (data === undefined) {
          problems.at(yaml, [...at, "data"], `src/data/${block.data ?? ""}.yaml does not exist`);
          break;
        }
        const records = Array.isArray(data.value) ? (data.value as unknown[]) : [];
        const valid = records.every((record, index) => {
          if (validators.event(record)) return true;
          schemaProblems(
            { ...data, value: data.value },
            (validators.event.errors ?? []).map((error) => ({
              ...error,
              instancePath: `/${index}${error.instancePath}`,
            })),
            problems,
          );
          return false;
        });
        if (valid) checkEvents(check, data, [], records as Event[]);
        break;
      }
      case "definition": {
        texts.check(yaml, [...at, "term"], "plain");
        texts.check(yaml, [...at, "explanation"], "markdown");
        const id = termId(block.term);
        const other = check.terms.get(id);
        if (other !== undefined) {
          problems.at(
            yaml,
            [...at, "term"],
            `${inLanguage(block.term, "de")} is defined twice (also in ${other}); define each term once`,
          );
        } else check.terms.set(id, yaml.file);
        break;
      }
      case "quote":
        texts.check(yaml, [...at, "text"], "markdown");
        texts.check(yaml, [...at, "origin", "author"], "name");
        texts.check(yaml, [...at, "origin", "work"], "name");
        if (typeof block.origin.year !== "number") texts.check(yaml, [...at, "origin", "year"], "plain");
        texts.check(yaml, [...at, "source"], "credit");
        break;
      case "code":
        texts.check(yaml, [...at, "caption"], "plain");
        break;
      case "generated":
        checkExerciseId(check, block.id, at);
        checkGenerated(check, block, at);
        break;
      case "vue-component":
        checkComponent(check, block, at);
        break;
      default:
        checkExerciseId(check, block.id, at);
        for (const problem of questionDetails(block, texts.languages)) {
          const path = [...at, ...problem.path, ...(problem.lang === undefined ? [] : [problem.lang])];
          problems.at(yaml, path, problem.message, problem.lang);
        }
        // the texts of a question are plain text with formulas: $…$ must be a formula the build can render
        for (const { path, text } of questionTexts(block)) {
          for (const { lang, text: source, keyed } of textLanguages(text, texts.languages).texts) {
            for (const message of formulaProblems(source)) {
              problems.at(yaml, [...at, ...path, ...(keyed ? [lang] : [])], message, keyed ? lang : undefined);
            }
          }
        }
    }
  });
}

/** A vue-component block: its component exists and passes its checks, its props match, its texts are complete. */
function checkComponent(check: PageCheck, block: BlockOf<"vue-component">, at: Path): void {
  const { yaml, texts, problems } = check;
  texts.check(yaml, [...at, "nojs"], "markdown");
  const component = check.components?.components.get(block.component);
  if (component === undefined) {
    // a component with problems of its own has them reported already
    if (check.components?.names.has(block.component) === true) return;
    const others = [...(check.components?.names ?? [])];
    problems.at(
      yaml,
      [...at, "component"],
      `src/components/${block.component}.vue does not exist; ${others.length === 0 ? "put the component there" : `the components are ${others.join(", ")}`}`,
    );
    return;
  }
  if (block.nojs === undefined && !component.exercise) {
    problems.at(
      yaml,
      at,
      "nojs is missing; a vue-component that is no exercise says in nojs, for readers without JavaScript, what it shows, and gives its content (vue-component-nojs)",
    );
  }
  // the anchor of an exercise component, which its task's address names (?<id>=<n>): its id, or its name
  let id = block.id;
  if (id === undefined && component.exercise) {
    const base = kebab(component.name);
    id = base;
    for (let n = 2; check.exercises.has(id); n++) id = `${base}-${n}`;
  }
  if (id !== undefined) checkExerciseId(check, id, at);
  const found = propsProblems(block.props, component);
  for (const problem of found) problems.at(yaml, [...at, "props", ...problem.path], problem.message);
  if (found.length > 0) return;
  for (const [name, field] of Object.entries(component.props)) {
    const value = block.props?.[name];
    for (const path of textPaths(value, field.type)) texts.check(yaml, [...at, "props", name, ...path], "plain");
  }
  // an exercise's check is the component's own code: its examples, at least one answer of each kind, test it
  const examples = block.examples;
  if (!component.exercise) {
    if (examples !== undefined) {
      problems.at(
        yaml,
        [...at, "examples"],
        `${component.name} is no exercise (it emits no answered), so it has no check for examples; remove them`,
      );
    }
  } else {
    const kinds = (["accepted", "rejected"] as const).filter((kind) => (examples?.[kind] ?? []).length === 0);
    if (kinds.length > 0) {
      problems.at(
        yaml,
        examples === undefined ? at : [...at, "examples"],
        `${examples === undefined ? "examples" : kinds.map((kind) => `examples.${kind}`).join(" and ")} ${kinds.length > 1 && examples !== undefined ? "are" : "is"} missing; an exercise component's block lists answers its check must accept (the other correct answers the text allows) and must reject (typical wrong ones), e.g. examples: { accepted: [{ answer: … }], rejected: [{ answer: … }] } (vue-component-exercise-contract)`,
      );
    }
  }
  const place = (path: Path) => `${yaml.file}:${lineOf(yaml, path, 0) ?? 1}: ${pathText(path)}`;
  check.uses.push({
    block,
    component,
    ...(id === undefined ? {} : { id }),
    place: place(at),
    examples: {
      accepted: (examples?.accepted ?? []).map((_example, index) => place([...at, "examples", "accepted", index])),
      rejected: (examples?.rejected ?? []).map((_example, index) => place([...at, "examples", "rejected", index])),
    },
  });
}

/** A component's name in kebab case, its default anchor: AssignLabels as assign-labels. */
const kebab = (name: string): string => name.replace(/(?<=[a-z0-9])(?=[A-Z])/g, "-").toLowerCase();

/** An exercise's id is an anchor of its page: once on the page. */
function checkExerciseId(check: PageCheck, id: string, at: Path): void {
  if (RESERVED_PARAMS.includes(id)) {
    check.problems.at(
      check.yaml,
      [...at, "id"],
      `${id} is a parameter of the page's address (${RESERVED_PARAMS.join(", ")}), and the address holds the task number of each exercise under its id; give the exercise another id`,
    );
  } else if (check.exercises.has(id)) {
    check.problems.at(check.yaml, [...at, "id"], `${id} is the id of another exercise on this page; give each its own`);
  } else check.exercises.set(id, at);
}

const ARBITRARIES = ["int", "decimal", "oneOf", "pick", "shuffle"] as const;

/** The parsed expression at `path`, or a problem; the variables it uses must be declared. */
function checkExpression(check: PageCheck, path: Path, source: string, declared: ReadonlySet<string>): boolean {
  try {
    const used = variables(parse(source));
    const undeclared = [...used].filter((name) => !declared.has(name));
    for (const name of undeclared) {
      check.problems.at(
        check.yaml,
        path,
        `${name} is not declared; declare it in given, or use one of ${[...declared].join(", ")}`,
      );
    }
    return undeclared.length === 0;
  } catch (error) {
    check.problems.at(
      check.yaml,
      path,
      `the expression "${source}" does not parse: ${error instanceof ExpressionError ? error.message : String(error)}`,
    );
    return false;
  }
}

/** A generated exercise: its arbitraries, expressions and texts, then the property test over fixed seeds. */
function checkGenerated(check: PageCheck, block: Generated, at: Path): void {
  const { yaml, texts, problems } = check;
  const before = problems.lines.length;
  const declared = new Set(Object.keys(block.given));
  const data = (name: string, path: Path) => {
    const file = check.dataFiles.get(name);
    if (file === undefined) problems.at(yaml, path, `src/data/${name}.yaml does not exist`);
    return Array.isArray(file?.value) ? (file.value as unknown[]) : undefined;
  };
  for (const [name, arbitrary] of Object.entries(block.given)) {
    const path = [...at, "given", name];
    const kinds = ARBITRARIES.filter((kind) => arbitrary[kind] !== undefined);
    if (kinds.length !== 1) {
      problems.at(
        yaml,
        path,
        `give exactly one of ${ARBITRARIES.join(", ")}${kinds.length > 1 ? `, not ${kinds.join(" and ")}` : ""}`,
      );
      continue;
    }
    const range = arbitrary.int ?? arbitrary.decimal;
    if (range !== undefined && range[0] > range[1])
      problems.at(yaml, path, `${range[0]} is more than ${range[1]}; write [min, max]`);
    if (arbitrary.decimal !== undefined && arbitrary.step === undefined) {
      problems.at(yaml, path, "a decimal needs its step, e.g. step: 0.1");
    }
    if (arbitrary.step !== undefined && range === undefined) problems.at(yaml, path, "step goes with int or decimal");
    if ((arbitrary.pick === undefined) !== (arbitrary.from === undefined)) {
      problems.at(
        yaml,
        path,
        arbitrary.pick === undefined
          ? "from goes with pick: how many to pick"
          : "pick needs from: a list or { data: <name> }",
      );
    }
    if (arbitrary.distinct !== undefined && arbitrary.pick === undefined)
      problems.at(yaml, path, "distinct goes with pick");
    const source = arbitrary.from ?? arbitrary.shuffle;
    const key = arbitrary.from !== undefined ? "from" : "shuffle";
    let size: number | undefined;
    if (source !== undefined && !Array.isArray(source)) {
      size = data((source as { data: string }).data, [...path, key, "data"])?.length;
    } else if (Array.isArray(source)) size = source.length;
    if (arbitrary.distinct === true && arbitrary.pick !== undefined && size !== undefined && arbitrary.pick > size) {
      problems.at(yaml, path, `${arbitrary.pick} distinct picks from a list of ${size}; pick fewer`);
    }
    const literals = arbitrary.oneOf ?? (Array.isArray(source) ? source : []);
    const listKey = arbitrary.oneOf !== undefined ? "oneOf" : key;
    literals.forEach((item, index) => {
      if (isObject(item)) texts.check(yaml, [...path, listKey, index], "plain");
    });
  }
  (block.where ?? []).forEach((source, index) => checkExpression(check, [...at, "where", index], source, declared));
  checkExpression(check, [...at, "answer", "value"], block.answer.value, declared);
  (block.mistakes ?? []).forEach((mistake, index) => {
    checkExpression(check, [...at, "mistakes", index, "value"], mistake.value, declared);
    texts.check(yaml, [...at, "mistakes", index, "message"], "plain");
  });
  // an example may name the task's right answer too
  const withAnswer = new Set([...declared, "answer"]);
  for (const kind of ["accepted", "rejected"] as const) {
    (block.examples?.[kind] ?? []).forEach((source, index) =>
      checkExpression(check, [...at, "examples", kind, index], source, withAnswer),
    );
  }
  const compare = block.answer.compare;
  if (typeof compare === "object") {
    for (const kind of ["choice", "set"] as const) {
      const options = (compare as Record<string, unknown>)[kind];
      if (typeof options === "string") checkExpression(check, [...at, "answer", "compare", kind], options, declared);
      else if (Array.isArray(options)) {
        options.forEach((item, index) => {
          if (isObject(item)) texts.check(yaml, [...at, "answer", "compare", kind, index], "plain");
        });
      }
    }
    if ("number" in compare) texts.check(yaml, [...at, "answer", "compare", "number", "unit"], "plain");
  }
  const figure = block.task.figure;
  if (figure !== undefined) {
    const needed = figure.kind === "hundred-grid" ? ["filled"] : ["part", "whole"];
    for (const key of ["filled", "part", "whole"] as const) {
      const value = figure[key];
      if (value === undefined) {
        if (needed.includes(key))
          problems.at(
            yaml,
            [...at, "task", "figure"],
            `${key} is missing; a ${figure.kind} needs ${needed.join(" and ")}`,
          );
      } else if (!needed.includes(key)) {
        problems.at(yaml, [...at, "task", "figure", key], `${key} is not a value of a ${figure.kind}`);
      } else if (typeof value === "string") checkExpression(check, [...at, "task", "figure", key], value, declared);
    }
    texts.check(yaml, [...at, "task", "figure", "alt"], "plain");
  }
  texts.check(yaml, [...at, "task", "text"], "markdown");
  texts.check(yaml, [...at, "hint"], "markdown");
  texts.check(yaml, [...at, "practice"], "plain");
  (block.steps ?? []).forEach((_step, index) => texts.check(yaml, [...at, "steps", index], "markdown"));
  for (const problem of templateProblems(block)) {
    problems.at(yaml, [...at, ...problem.path], problem.message, problem.lang);
  }
  for (const name of unusedVariables(block)) {
    problems.at(
      yaml,
      [...at, "given", name],
      `${name} is never used: no placeholder {{${name}}} in the task, figure, steps, hint or mistakes, and no expression of the figure, answer or mistakes names it; use it, or remove it from given`,
    );
  }
  if (problems.lines.length > before || check.seeds === 0) return;
  // the property test over fixed seeds
  const records: Record<string, DataRecord[]> = {};
  for (const [name, file] of check.dataFiles) records[name] = file.value as DataRecord[];
  let templates: Templates;
  try {
    templates = templatesOf(block, texts.languages);
  } catch (error) {
    const reason = (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "";
    problems.at(
      yaml,
      at,
      `a formula with its placeholders filled in does not parse (${reason.trim()}); check its braces: a placeholder is {{G}}, a letter is G`,
    );
    return;
  }
  const sound = soundness(block, dataOf(block, records), templates, texts.languages, check.seeds);
  for (const problem of sound) problems.at(yaml, [...at, ...problem.path], problem.message, problem.lang);
  if (sound.length > 0) return;
  for (const problem of exampleProblems(block, dataOf(block, records), templates, texts.languages, check.seeds)) {
    problems.at(yaml, [...at, ...problem.path], problem.message);
  }
}

/** The files and folders in `dir`, sorted. */
const entries = (dir: string) => (existsSync(dir) ? readdirSync(dir).sort() : []);
const isDirectory = (path: string) => statSync(path).isDirectory();

/** Checks the order list `list` (at `key` of `yaml`) against the ids that exist; true when they agree. */
function checkOrder(
  yaml: YamlFile,
  key: string,
  list: readonly string[],
  existing: readonly string[],
  what: { one: string; folder: string; file: (id: string) => string },
  problems: Problems,
): boolean {
  let ok = true;
  list.forEach((id, index) => {
    if (list.indexOf(id) !== index) {
      problems.at(yaml, [key, index], `${id} is listed twice; list each ${what.one} exactly once`);
      ok = false;
    } else if (!existing.includes(id)) {
      problems.at(yaml, [key, index], `${id} is listed, but ${what.file(id)} does not exist`);
      ok = false;
    }
  });
  for (const id of existing.filter((candidate) => !list.includes(candidate))) {
    problems.at(yaml, [key], `${id} is not listed; list each ${what.one} of ${what.folder} exactly once`);
    ok = false;
  }
  return ok;
}

/** How many seeds the property test of each generated exercise draws at build time. */
export const SEEDS = 200;

/** The problems of the content in `root`/src, and the content when there are none. */
export function check(root: string, seeds = SEEDS): { site?: Site; problems: string[] } {
  const problems = new Problems();
  const src = join(root, "src");
  if (!existsSync(join(src, "app.yaml"))) {
    problems.file(
      "src/app.yaml",
      "is missing: the app's title, intro, languages and the order of its chapters belong there",
    );
    return { problems: problems.lines };
  }

  // what src/ holds
  const chapterIds: string[] = [];
  const dataFiles = new Map<string, YamlFile>();
  for (const name of entries(src)) {
    const path = join(src, name);
    if (name === "app.yaml" || name === "main.ts") continue;
    if (name === "components" && isDirectory(path)) continue;
    if (!isDirectory(path)) {
      problems.file(`src/${name}`, `not part of an explainer; ${SRC}`);
    } else if (name === "images") {
      for (const image of entries(path)) {
        if (isDirectory(join(path, image)) || !IMAGE.test(image)) {
          problems.file(
            `src/images/${image}`,
            "not an image of an explainer; src/images/ holds image files <name>.svg, .png, .jpg or .webp, with a lower-case name",
          );
        }
      }
    } else if (name === "data") {
      for (const file of entries(path)) {
        const id = file.replace(/\.yaml$/, "");
        if (isDirectory(join(path, file)) || !file.endsWith(".yaml") || !ID.test(id)) {
          problems.file(
            `src/data/${file}`,
            "not a data file; src/data/ holds data files <name>.yaml, with a lower-case name",
          );
          continue;
        }
        const yaml = readYaml(root, `src/data/${file}`, problems);
        if (yaml !== undefined && validate(yaml, "data", problems)) dataFiles.set(id, yaml);
      }
    } else if (!ID.test(name)) {
      problems.file(
        `src/${name}/`,
        `the folder's name is the chapter's id: use lower-case letters, digits and hyphens`,
      );
    } else if (RESERVED.has(name) || /^[a-z]{2}$/.test(name)) {
      problems.file(
        `src/${name}/`,
        `${name} is reserved for the app's addresses (data, images, glossar, components, assets and two-letter language codes); rename the chapter`,
      );
    } else chapterIds.push(name);
  }

  // the components, read with Vue's SFC compiler only when there are any
  const components = existsSync(join(src, "components")) ? readComponents(root) : undefined;
  for (const problem of components?.problems ?? []) problems.add(problem);

  // the app
  const appYaml = readYaml(root, "src/app.yaml", problems);
  if (appYaml === undefined || !validate(appYaml, "app", problems)) return { problems: problems.lines };
  const app = appYaml.value as App;
  const languageList = languageListProblems(app.languages, Object.keys(MESSAGES));
  for (const problem of languageList) {
    problems.at(appYaml, ["languages", Math.max(app.languages.lastIndexOf(problem.lang), 0)], problem.message);
  }
  if (languageList.length > 0) return { problems: problems.lines };
  const texts = new Texts(app.languages, problems);
  texts.check(appYaml, ["title"], "plain");
  texts.check(appYaml, ["intro"], "markdown");
  texts.check(appYaml, ["tutor", "rules"], "markdown");
  app.sources?.forEach((_source, index) => texts.check(appYaml, ["sources", index, "title"], "plain"));
  for (const yaml of dataFiles.values()) {
    (yaml.value as DataRecord[]).forEach((record, index) => {
      for (const [field, value] of Object.entries(record)) {
        if (isObject(value)) texts.check(yaml, [index, field], "plain");
      }
    });
  }
  const chaptersOk = checkOrder(
    appYaml,
    "chapters",
    app.chapters,
    chapterIds,
    { one: "chapter", folder: "src/", file: (id) => `src/${id}/` },
    problems,
  );

  // the chapters and their pages
  const terms = new Map<string, string>();
  const images = new Map<string, string>();
  const anchors = new Map<string, Set<string>>();
  const uses: ComponentUse[] = [];
  const chapters: Chapter[] = [];
  for (const chapterId of chaptersOk ? app.chapters : chapterIds) {
    const folder = join(src, chapterId);
    const pageIds: string[] = [];
    for (const name of entries(folder)) {
      const file = `src/${chapterId}/${name}`;
      if (name === "chapter.yaml") continue;
      if (isDirectory(join(folder, name))) {
        problems.file(
          `${file}/`,
          "a folder inside a chapter; an explainer goes app, chapter, page, and two section levels inside a page: split the app",
        );
      } else if (!name.endsWith(".yaml")) {
        problems.file(
          file,
          `not part of an explainer; a chapter folder holds only chapter.yaml and its pages <page>.yaml`,
        );
      } else if (!ID.test(name.slice(0, -".yaml".length))) {
        problems.file(file, `the file's name is the page's id: use lower-case letters, digits and hyphens`);
      } else pageIds.push(name.slice(0, -".yaml".length));
    }
    if (!existsSync(join(folder, "chapter.yaml"))) {
      problems.file(
        `src/${chapterId}/chapter.yaml`,
        "is missing: a chapter folder needs its chapter.yaml with its title and the order of its pages",
      );
      continue;
    }
    const chapterYaml = readYaml(root, `src/${chapterId}/chapter.yaml`, problems);
    if (chapterYaml === undefined || !validate(chapterYaml, "chapter", problems)) continue;
    const chapter = chapterYaml.value as { title: Text; summary?: Text; pages: string[] };
    texts.check(chapterYaml, ["title"], "plain");
    texts.check(chapterYaml, ["summary"], "markdown");
    const pagesOk = checkOrder(
      chapterYaml,
      "pages",
      chapter.pages,
      pageIds,
      { one: "page", folder: `src/${chapterId}/`, file: (id) => `src/${chapterId}/${id}.yaml` },
      problems,
    );
    const pages: Page[] = [];
    for (const pageId of pagesOk ? chapter.pages : pageIds) {
      const file = `src/${chapterId}/${pageId}.yaml`;
      const yaml = readYaml(root, file, problems);
      if (yaml === undefined || !validate(yaml, "page", problems)) continue;
      const page = yaml.value as Omit<Page, "id" | "chapter" | "file">;
      texts.check(yaml, ["title"], "plain");
      texts.check(yaml, ["description"], "plain");
      const pageAnchors = new Set<string>();
      const exercises = new Map<string, Path>();
      checkBlocks(
        {
          yaml,
          texts,
          problems,
          root,
          dataFiles,
          terms,
          images,
          anchors: pageAnchors,
          exercises,
          seeds,
          components,
          uses,
        },
        page.blocks,
        ["blocks"],
        0,
      );
      if (![...allBlocks(page.blocks)].some(isExercise)) {
        problems.at(
          yaml,
          ["blocks"],
          "the page has no exercise; give it a section with an exercise: one of the quiz's question types, or generated",
        );
      }
      for (const [id, path] of exercises) {
        if (pageAnchors.has(id)) {
          problems.at(
            yaml,
            [...path, "id"],
            `${id} is also the anchor of a section of this page; give the exercise its own id`,
          );
        }
        pageAnchors.add(id);
      }
      anchors.set(`/${chapterId}/${pageId}/`, pageAnchors);
      pages.push({ ...page, id: pageId, chapter: chapterId, file });
    }
    chapters.push({
      id: chapterId,
      title: chapter.title,
      ...(chapter.summary === undefined ? {} : { summary: chapter.summary }),
      pages,
    });
  }

  // links to pages of the app
  const hidden = app.chapters.length === 1;
  for (const link of texts.links) {
    const [path = "", hash] = link.href.split("#");
    const pageAnchors = anchors.get(path);
    const generated =
      path === "/" ||
      (path === "/glossar/" && terms.size > 0) ||
      (!hidden && app.chapters.some((id) => path === `/${id}/`));
    if (pageAnchors === undefined && !generated) {
      problems.at(
        link.yaml,
        link.path,
        `the link ${link.href} leads to no page of the app; write /<chapter>/<page>/, or /<chapter>/<page>/#<section>`,
        link.lang,
      );
    } else if (hash !== undefined && hash !== "" && (pageAnchors === undefined || !pageAnchors.has(hash))) {
      problems.at(link.yaml, link.path, `the link ${link.href} leads to no section of its page`, link.lang);
    }
  }

  if (problems.lines.length > 0) return { problems: problems.lines };
  const data: Record<string, DataRecord[]> = {};
  for (const [id, yaml] of dataFiles) data[id] = yaml.value as DataRecord[];
  return { site: { app, chapters, data, images, components: uses, storage: appName(root, "explainer") }, problems: [] };
}

/**
 * The content in `root`/src, its generated exercises tested over `seeds` seeds (0: not at all, for a reader of content
 * the build has checked); throws a ContentError with every problem when it is not valid. */
export function loadSite(root: string, seeds = SEEDS): Site {
  const { site, problems } = check(root, seeds);
  if (site === undefined) throw new ContentError(problems);
  return site;
}

export type { BlockOf };
