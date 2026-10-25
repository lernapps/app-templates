// The checks of the code of single-file Vue components at build time, for every archetype that has components (the
// explainer, the interactive archetype). They run on the output of Vue's own SFC compiler, the script with the template
// compiled into it, mapped back to the line and column of the .vue file, and on the TypeScript modules of the app that
// it imports: no network (fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon, an import from a URL), no code or
// HTML from strings (eval, new Function, innerHTML, v-html), imports only from vue, the runtime
// @lernapps/app-templates, @lernapps/tooling/storage, i18n and a11y and the app's own modules (the CodeScope says
// which), and browser globals (window, document, localStorage, …) only inside onMounted and the hooks that run after
// it, because the build renders the component without a browser.
//
// What the interactive archetype's components may import is wider than the explainer's: any of the app's own files in
// src/ (sourceScope), and the libraries the app lists in the dependencies of its package.json (a bare import of such a
// package, bundled by the build; their licences are lernapps check's dependency-licence). An import from a URL stays
// forbidden.
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import type { Node, Program } from "@babel/types";
import type { SourceMapConsumer as Consumer } from "source-map-js";

export type Sfc = typeof import("vue/compiler-sfc");

const require = createRequire(import.meta.url);
let compiler: Sfc | undefined;
/** Vue's SFC compiler, loaded on first use: an app without components never loads it. */
export const sfc = (): Sfc => (compiler ??= require("vue/compiler-sfc") as Sfc);

/** Where a problem is: a line, and a column where it is known. */
export interface Place {
  line: number;
  column?: number;
}

const TOOLING = ["@lernapps/tooling/storage", "@lernapps/tooling/i18n", "@lernapps/tooling/a11y"];
/** The packages a component may import, for a message. */
const PACKAGES = `vue, @lernapps/app-templates, ${TOOLING.join(", ")}`;
const NETWORK = new Set(["fetch", "XMLHttpRequest", "WebSocket", "EventSource"]);
const BROWSER = new Set([
  "window",
  "document",
  "navigator",
  "location",
  "history",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "matchMedia",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "getComputedStyle",
  "alert",
  "confirm",
  "prompt",
  "screen",
  "customElements",
  "IntersectionObserver",
  "ResizeObserver",
  "MutationObserver",
]);
/** The hooks that never run while the build renders the component: inside them, browser globals are allowed. */
const BROWSER_HOOKS = new Set(["onMounted", "onBeforeUnmount", "onUnmounted"]);
const HTML = new Set(["innerHTML", "outerHTML", "insertAdjacentHTML"]);
const GLOBAL_OBJECTS = new Set(["window", "self", "globalThis"]);

/** A line of a problem in `file`, at `place` when it is known. */
export const line = (file: string, place: Place | undefined, message: string) =>
  `${file}${place === undefined ? "" : `:${place.line}${place.column === undefined ? "" : `:${place.column}`}`}: ${message}`;

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";

/** Every node of `root`, with its parents from the root down. */
export function* nodes(root: Node, parents: Node[] = []): Generator<[Node, readonly Node[]]> {
  yield [root, parents];
  for (const [key, value] of Object.entries(root)) {
    if (key === "loc" || key === "leadingComments" || key === "trailingComments" || key === "innerComments") continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (isNode(child)) yield* nodes(child, [...parents, root]);
    }
  }
}

export const parse = (code: string): Program =>
  sfc().babelParse(code, { sourceType: "module", plugins: ["typescript"] }).program as Program;

/** The name of a member's property: x.innerHTML, x["innerHTML"]. */
function propertyName(node: Node): string | undefined {
  if (node.type !== "MemberExpression" && node.type !== "OptionalMemberExpression") return undefined;
  if (!node.computed && node.property.type === "Identifier") return node.property.name;
  return node.property.type === "StringLiteral" ? node.property.value : undefined;
}

/** What one file of a component may not do, found in its code (the SFC compiler's output, or a module). */
interface Finding {
  message: string;
  node: Node;
}

/** The import specifiers of `program`, with their nodes: static, re-exports and dynamic imports. */
function imports(program: Program): { source: string; node: Node }[] {
  const found: { source: string; node: Node }[] = [];
  for (const [node] of nodes(program)) {
    if (
      (node.type === "ImportDeclaration" && node.importKind !== "type") ||
      ((node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") &&
        node.source !== null &&
        node.source !== undefined &&
        node.exportKind !== "type")
    ) {
      if (node.source) found.push({ source: node.source.value, node });
    } else if (node.type === "CallExpression" && node.callee.type === "Import") {
      const [argument] = node.arguments;
      found.push({ source: argument?.type === "StringLiteral" ? argument.value : "(an expression)", node });
    } else if (node.type === "ImportExpression") {
      found.push({ source: node.source.type === "StringLiteral" ? node.source.value : "(an expression)", node });
    }
  }
  return found;
}

/** The package a bare import specifier names: "yaml" for "yaml/util", "@scope/name" for "@scope/name/sub". */
const packageOf = (source: string): string =>
  source
    .split("/")
    .slice(0, source.startsWith("@") ? 2 : 1)
    .join("/");

/**
 * What the code of `program` may not do, and its imports of the app's own modules (`isLocal`); `own` names these for
 * a message, `packages` are the libraries it may import besides.
 */
function findings(
  program: Program,
  isLocal: (source: string) => boolean,
  own: string,
  packages: readonly string[] = [],
): { found: Finding[]; locals: { source: string; node: Node }[] } {
  const found: Finding[] = [];
  const locals: { source: string; node: Node }[] = [];
  for (const { source, node } of imports(program)) {
    if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(source)) {
      found.push({
        node,
        message: `an import from ${source}; a component loads nothing from the network, so bundle what it needs (vue-component-no-network)`,
      });
    } else if (isLocal(source)) locals.push({ source, node });
    else if (
      source !== "vue" &&
      source !== "@lernapps/app-templates" &&
      !source.startsWith("@lernapps/app-templates/") &&
      !TOOLING.includes(source) &&
      !packages.includes(packageOf(source))
    ) {
      found.push({
        node,
        message: `an import from ${source}; a component imports only from ${PACKAGES} and ${own} (vue-component-imports)`,
      });
    }
  }
  const { walkIdentifiers } = sfc();
  if (program.body.length === 0) return { found, locals };
  walkIdentifiers(program, (identifier, parent, parents, isReference, isLocal) => {
    if (!isReference || isLocal) return;
    const { name } = identifier;
    if (NETWORK.has(name)) {
      found.push({
        node: identifier,
        message: `${name}: a component makes no network request; give it what it needs through its props (vue-component-no-network)`,
      });
    } else if (
      name === "eval" ||
      (name === "Function" &&
        (parent?.type === "NewExpression" || parent?.type === "CallExpression") &&
        parent.callee === identifier)
    ) {
      found.push({
        node: identifier,
        message: `${name === "eval" ? "eval" : "Function"}: a component runs no code from strings (vue-component-no-html-injection)`,
      });
    } else if (BROWSER.has(name)) {
      const stack = [...parents, identifier];
      const inHook = stack.some(
        (node, index) =>
          node.type === "CallExpression" &&
          node.callee.type === "Identifier" &&
          BROWSER_HOOKS.has(node.callee.name) &&
          node.arguments.some((argument) => argument === stack[index + 1]),
      );
      if (!inHook) {
        found.push({
          node: identifier,
          message: `${name} outside onMounted; the build renders the component where there is no ${name}, so use it only inside onMounted (vue-component-browser-globals)`,
        });
      }
    }
  });
  for (const [node] of nodes(program)) {
    const property = propertyName(node);
    if (property !== undefined && HTML.has(property)) {
      found.push({
        node,
        message: `${property}: a component writes no HTML from strings; let the template render it (vue-component-no-html-injection)`,
      });
    } else if (property === "sendBeacon") {
      found.push({
        node,
        message: `sendBeacon: a component makes no network request (vue-component-no-network)`,
      });
    } else if (
      property !== undefined &&
      NETWORK.has(property) &&
      (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") &&
      node.object.type === "Identifier" &&
      GLOBAL_OBJECTS.has(node.object.name)
    ) {
      found.push({
        node,
        message: `${property}: a component makes no network request; give it what it needs through its props (vue-component-no-network)`,
      });
    } else if (
      node.type === "ObjectProperty" &&
      !node.computed &&
      ((node.key.type === "Identifier" && node.key.name === "innerHTML") ||
        (node.key.type === "StringLiteral" && node.key.value === "innerHTML"))
    ) {
      // what the template compiler makes of v-html
      found.push({
        node,
        message: `v-html: a component writes no HTML from strings; let the template render it (vue-component-no-html-injection)`,
      });
    }
  }
  return { found, locals };
}

/** The problem lines of `found`, each once, at its place; one without a place only when no other has the message. */
function placed(file: string, found: readonly Finding[], place: (node: Node) => Place | undefined): string[] {
  const lines: string[] = [];
  const withPlace = new Set<string>();
  const without: string[] = [];
  for (const finding of found) {
    const at = place(finding.node);
    if (at === undefined) without.push(finding.message);
    else {
      withPlace.add(finding.message);
      const text = line(file, at, finding.message);
      if (!lines.includes(text)) lines.push(text);
    }
  }
  for (const message of new Set(without)) if (!withPlace.has(message)) lines.push(line(file, undefined, message));
  return lines;
}

/**
 * Which imports of a component's code are the app's own modules: `resolve` gives, for an import of `source` in `file`
 * (both from the app's root), the module it names, or the problem when it names none a component may import, or
 * undefined when the import is not one of the app's own. `own` names the app's own modules (and the packages) for a
 * message; `packages` are the libraries a component may import besides, by their package names.
 */
export interface CodeScope {
  own: string;
  packages?: readonly string[];
  resolve(file: string, source: string): { file: string } | { problem: string } | undefined;
}

/** The libraries in the dependencies of the app's package.json, by their package names. */
function dependencies(root: string): string[] {
  const file = join(root, "package.json");
  if (!existsSync(file)) return [];
  const manifest = JSON.parse(readFileSync(file, "utf8")) as { dependencies?: Record<string, string> };
  return Object.keys(manifest.dependencies ?? {});
}

/**
 * The scope of an app whose components may import any of its files in src/ and the libraries in the dependencies of
 * its package.json (the interactive archetype).
 */
export const sourceScope = (root: string): CodeScope => ({
  own: "the app's own files in src/ or a library in the dependencies of package.json",
  packages: dependencies(root),
  resolve(file, source) {
    if (!source.startsWith("./") && !source.startsWith("../")) return undefined;
    const target = posix.normalize(posix.join(dirname(file), source));
    if (!target.startsWith("src/")) {
      return { problem: `${source} is outside src/; a component imports only the app's own files in src/` };
    }
    return existsSync(join(root, target))
      ? { file: target }
      : { problem: `${source} does not exist; import a file of src/, with its extension` };
  },
});

/** A single-file component as the compiler reads it; undefined, with its problems, when it has none to check. */
export function readSfc(
  root: string,
  file: string,
  problems: string[],
):
  | {
      descriptor: ReturnType<Sfc["parse"]>["descriptor"];
      setup: NonNullable<ReturnType<Sfc["parse"]>["descriptor"]["scriptSetup"]>;
    }
  | undefined {
  const source = readFileSync(join(root, file), "utf8");
  const { descriptor, errors } = sfc().parse(source, { filename: join(root, file), sourceMap: true });
  for (const error of errors) {
    const loc = "loc" in error ? error.loc : undefined;
    problems.push(line(file, loc ? { line: loc.start.line, column: loc.start.column } : undefined, error.message));
  }
  if (errors.length > 0) return undefined;
  const setup = descriptor.scriptSetup;
  if (setup === null || setup.lang !== "ts") {
    problems.push(line(file, undefined, `a component has <script setup lang="ts">`));
    return undefined;
  }
  return { descriptor, setup };
}

/**
 * The checks of components' code, each problem into `problems`: `compile` compiles a component's <script setup> with
 * its template and checks the output, `module` checks a TypeScript module; each follows the imports of the app's own
 * TypeScript modules (`scope`) and checks each module once.
 */
export function codeChecker(root: string, scope: CodeScope, problems: string[]) {
  const { SourceMapConsumer } = require("source-map-js") as typeof import("source-map-js");
  const checked = new Set<string>();
  const check = (file: string, program: Program): Finding[] => {
    const { found, locals } = findings(
      program,
      (source) => scope.resolve(file, source) !== undefined,
      scope.own,
      scope.packages,
    );
    for (const { source, node } of locals) {
      const target = scope.resolve(file, source);
      if (target === undefined) continue;
      if ("problem" in target) found.push({ node, message: target.problem });
      else if (target.file.endsWith(".ts")) module(target.file);
    }
    return found;
  };
  const module = (file: string): void => {
    if (checked.has(file)) return;
    checked.add(file);
    problems.push(
      ...placed(file, check(file, parse(readFileSync(join(root, file), "utf8"))), (node) =>
        node.loc ? { line: node.loc.start.line, column: node.loc.start.column + 1 } : undefined,
      ),
    );
  };
  const compile = (
    file: string,
    descriptor: ReturnType<Sfc["parse"]>["descriptor"],
  ): { program: Program; consumer: Consumer | undefined } | undefined => {
    let compiled: ReturnType<Sfc["compileScript"]>;
    try {
      compiled = sfc().compileScript(descriptor, {
        id: file.replace(/^.*\//, "").replace(/\.vue$/, ""),
        inlineTemplate: true,
        sourceMap: true,
        isProd: true,
        fs: { fileExists: existsSync, readFile: (name) => readFileSync(name, "utf8") },
      });
    } catch (error) {
      const loc = (error as { loc?: { start: { line: number; column: number } } }).loc;
      const message = (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "";
      problems.push(line(file, loc ? { line: loc.start.line, column: loc.start.column } : undefined, message));
      return undefined;
    }
    const program = parse(compiled.content);
    const consumer: Consumer | undefined = compiled.map ? new SourceMapConsumer(compiled.map) : undefined;
    problems.push(
      ...placed(file, check(file, program), (node) => {
        if (!node.loc || consumer === undefined) return undefined;
        const original = consumer.originalPositionFor({ line: node.loc.start.line, column: node.loc.start.column });
        return original.line === null ? undefined : { line: original.line, column: original.column + 1 };
      }),
    );
    return { program, consumer };
  };
  return { module, compile };
}

/**
 * The checks of the components' code for the single-file components `files` (from the app's root) and the app's own
 * TypeScript modules they import (`scope`): one line per problem, with the file and its place.
 */
export function codeProblems(root: string, files: readonly string[], scope: CodeScope): string[] {
  const problems: string[] = [];
  const code = codeChecker(root, scope, problems);
  for (const file of files) {
    const read = readSfc(root, file, problems);
    if (read !== undefined) code.compile(file, read.descriptor);
  }
  return problems;
}
