// The content of an app as YAML files, for every archetype whose content is YAML (the explainer, the interactive
// archetype): reading a file with its line positions, collecting the problems with their place in it (one line each:
// the file, its line and the path of the value), turning the errors of a JSON Schema into problems an author can act
// on, and checking the texts of the content (languages, raw HTML, restricted Markdown, formulas).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ErrorObject } from "ajv/dist/2020.js";
import { isNode, LineCounter, parseDocument, type Document } from "yaml";
import { textLanguages, type Text } from "./languages.ts";
import { formulaProblem } from "./text/formula.ts";
import { htmlTag, inspect } from "./text/markdown.ts";

export type Path = readonly (string | number)[];

/** A YAML file of the content, parsed, with its line positions. */
export interface YamlFile {
  file: string;
  doc: Document;
  lines: LineCounter;
  value: unknown;
}

/** `["blocks", 0, "text"]` as `blocks[0].text`. */
export function pathText(path: Path): string {
  return path.map((part, index) => (typeof part === "number" ? `[${part}]` : index === 0 ? part : `.${part}`)).join("");
}

export const get = (value: unknown, path: Path): unknown =>
  path.reduce<unknown>(
    (at, part) => (typeof at === "object" && at !== null ? (at as Record<string, unknown>)[part] : undefined),
    value,
  );
export const isObject = (value: unknown): value is Record<string, unknown> =>
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
export function lineOf(yaml: YamlFile, path: Path, offset: number): number | undefined {
  for (let length = path.length; length >= 0; length--) {
    const node = yaml.doc.getIn(path.slice(0, length), true);
    if (!isNode(node) || node.range === undefined || node.range === null) continue;
    const block = "type" in node && (node.type === "BLOCK_LITERAL" || node.type === "BLOCK_FOLDED");
    const start = yaml.lines.linePos(node.range[0]).line;
    return start + (length === path.length ? offset + (block && offset > 0 ? 1 : block ? 1 : 0) : 0);
  }
  return undefined;
}

/** Reads a YAML file of the content (`file` from the app's root); undefined, with its problems, when it is not valid YAML. */
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

/**
 * What an archetype says about an error of its schema in its own words: the message, at the error's place or at `path`;
 * null to say nothing (another error says it); undefined to leave it to the general messages.
 */
export type DescribeError = (
  error: ErrorObject,
  path: Path,
  value: unknown,
) => { message: string; path?: Path; lang?: string } | null | undefined;

/** The schema's errors as problems: one per cause, the branches of texts and blocks folded. */
export function schemaProblems(
  yaml: YamlFile,
  errors: readonly ErrorObject[],
  problems: Problems,
  describe?: DescribeError,
): void {
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
    const described = describe?.(error, path, value);
    if (described !== undefined) {
      if (described !== null) problems.at(yaml, described.path ?? path, described.message, described.lang);
      continue;
    }
    switch (error.keyword) {
      case "if":
        break;
      case "anyOf": {
        if (typeof value === "string") problems.at(yaml, path, "must not be empty");
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
        problems.at(yaml, path, `${String(error.params["missingProperty"])} is missing`);
        break;
      case "additionalProperties":
        problems.at(yaml, path, `${String(error.params["additionalProperty"])} is not allowed here`);
        break;
      case "unevaluatedProperties":
        problems.at(yaml, path, `${String(error.params["unevaluatedProperty"])} is not allowed here`);
        break;
      case "enum":
        problems.at(yaml, path, `must be one of ${(error.params["allowedValues"] as unknown[]).join(", ")}`);
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

/** A source of a credit that is only a URL, rendered as a link. */
const SOURCE_URL = /^https?:\/\/\S+$/;

/** Where a link inside a text was written, to check its target once every page is known. */
export interface TextLink {
  yaml: YamlFile;
  path: Path;
  lang: string;
  offset: number;
  href: string;
}

/** The checks of the texts: languages, raw HTML, Markdown, formulas. */
export class Texts {
  readonly links: TextLink[] = [];
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
