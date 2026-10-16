// The components of an explainer at build time (src/components/<Name>.vue, vue-component blocks): what the build reads
// from each single-file component with Vue's own SFC compiler, and what it checks there. Every component has
// <script setup lang="ts"> and its test file <Name>.test.ts. The checks run on the compiler's output, the script with
// the template compiled into it, mapped back to the line and column of the .vue file, and on the TypeScript modules of
// the component's folder that it imports: no network (fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon, an
// import from a URL), no code or HTML from strings (eval, new Function, innerHTML, v-html), imports only from vue, the
// runtime @lernapps/app-templates, @lernapps/tooling/storage, i18n and a11y and the component's own folder, and browser
// globals (window, document, localStorage, …) only inside onMounted and the hooks that run after it, because the build
// renders the component without a browser. A component that emits answered is an exercise (answered { correct,
// reason? }, reason the text of what went wrong in a wrong answer, shown under the feedback): it declares the prop
// seed: number, the task number the explainer gives it (tasks.ts), and shows the task generate(seed, props); its logic
// module <Name>.ts exports generate(seed, props), check(task, answer), solution(task), wrong(task), which the build
// tests over fixed seeds (propertyProblems), describe(task, props, lang), the task and its solution as a learner reads
// them, and about, what the exercise is, for a tutor (describedProblems). A component keeps its nojs text, folded as a
// text description under it, when it declares defineOptions({ nojs: "caption" }); by default it replaces it.
//
// The props of a block are checked against the component's prop types (defineProps<…>()), which the SFC compiler
// resolves, as Vue itself does for its runtime props, rather than vue-component-meta, which needs TypeScript's
// language service: the types a block can give from YAML are data, which the compiler's type resolution reads in
// milliseconds, without a program. A prop type is a string, number or boolean, a literal type, a union of these, an
// array, or an object type of them (inline, an interface or type of the component, or an object type it imports); a
// string is a learner text, given in YAML as a string or a map by language like every text of the explainer, and the
// component gets it in the page's language.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import type { Node, Program } from "@babel/types";
import type { SourceMapConsumer as Consumer } from "source-map-js";
import { inLanguage, textLanguages, type Text } from "../shared/languages.ts";
import { verdict } from "../shared/examples.ts";
import type {
  ComponentAbout,
  ComponentDescription,
  ComponentExamples,
  ComponentInfo,
  DescribedTask,
  Field,
  PropType,
} from "./content.ts";
import { inspect } from "./markdown.ts";
import { distinctSeeds, MAX_TASKS, SEED_TRIES } from "./tasks.ts";

type Sfc = typeof import("vue/compiler-sfc");
type TypeResolveContext = Parameters<Sfc["resolveTypeElements"]>[0];

const require = createRequire(import.meta.url);
let compiler: Sfc | undefined;
/** Vue's SFC compiler, loaded on first use: an app without components never loads it. */
const sfc = (): Sfc => (compiler ??= require("vue/compiler-sfc") as Sfc);

/** How many seeds the property test of an exercise component's logic draws, for each block that uses it. */
export const COMPONENT_SEEDS = 50;
/** The budget of a component's own code, gzipped, in bytes; Vue is loaded once per page and not counted. */
export const SIZE_BUDGET = 20_000;

/** Where a problem is: a line, and a column where it is known. */
interface Place {
  line: number;
  column?: number;
}

const NAME = /^[A-Z][A-Za-z0-9]*$/;
const TOOLING = ["@lernapps/tooling/storage", "@lernapps/tooling/i18n", "@lernapps/tooling/a11y"];
const IMPORTS = `vue, @lernapps/app-templates, ${TOOLING.join(", ")} and its own folder`;
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
const EXERCISE = ["generate", "check", "solution", "wrong", "describe", "about"];
/** The exports of an exercise component's logic module, for a message. */
export const CONTRACT =
  "generate(seed, props), check(task, answer), solution(task), wrong(task), describe(task, props, lang) and about";

/** A line of a problem in `file`, at `place` when it is known. */
const line = (file: string, place: Place | undefined, message: string) =>
  `${file}${place === undefined ? "" : `:${place.line}${place.column === undefined ? "" : `:${place.column}`}`}: ${message}`;

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";

/** Every node of `root`, with its parents from the root down. */
function* nodes(root: Node, parents: Node[] = []): Generator<[Node, readonly Node[]]> {
  yield [root, parents];
  for (const [key, value] of Object.entries(root)) {
    if (key === "loc" || key === "leadingComments" || key === "trailingComments" || key === "innerComments") continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (isNode(child)) yield* nodes(child, [...parents, root]);
    }
  }
}

const parse = (code: string): Program =>
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

/** What the code of `program` may not do, and its imports from the component's folder. */
function findings(program: Program): { found: Finding[]; locals: { source: string; node: Node }[] } {
  const found: Finding[] = [];
  const locals: { source: string; node: Node }[] = [];
  for (const { source, node } of imports(program)) {
    if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(source)) {
      found.push({
        node,
        message: `an import from ${source}; a component loads nothing from the network, so bundle what it needs (vue-component-no-network)`,
      });
    } else if (source.startsWith("./") && !source.slice(2).includes("/")) locals.push({ source, node });
    else if (
      source !== "vue" &&
      source !== "@lernapps/app-templates" &&
      !source.startsWith("@lernapps/app-templates/") &&
      !TOOLING.includes(source)
    ) {
      found.push({
        node,
        message: `an import from ${source}; a component imports only from ${IMPORTS} (vue-component-imports)`,
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

/** The names a module exports. */
function exported(program: Program): Set<string> {
  const names = new Set<string>();
  for (const statement of program.body) {
    if (statement.type !== "ExportNamedDeclaration" || statement.exportKind === "type") continue;
    const declaration = statement.declaration;
    if (declaration?.type === "FunctionDeclaration" && declaration.id) names.add(declaration.id.name);
    if (declaration?.type === "VariableDeclaration") {
      for (const variable of declaration.declarations)
        if (variable.id.type === "Identifier") names.add(variable.id.name);
    }
    for (const specifier of statement.specifiers) {
      if (specifier.type === "ExportSpecifier" && specifier.exported.type === "Identifier") {
        names.add(specifier.exported.name);
      }
    }
  }
  return names;
}

/** The component's prop types from defineProps<…>(); problems for what a block could not give. */
function propTypes(
  file: string,
  path: string,
  content: string,
  startLine: number,
): { props: Record<string, Field>; problems: string[] } {
  const { babelParse, resolveTypeElements } = sfc();
  const program = babelParse(content, { sourceType: "module", plugins: ["typescript"] }).program as Program;
  const problems: string[] = [];
  const at = (node: Node): Place | undefined =>
    node.loc ? { line: startLine + node.loc.start.line - 1, column: node.loc.start.column + 1 } : undefined;
  const call = [...nodes(program)]
    .map(([node]) => node)
    .find(
      (node) =>
        node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "defineProps",
    );
  if (call === undefined || call.type !== "CallExpression") return { props: {}, problems };
  const declared = call.typeParameters?.params[0];
  if (declared === undefined) {
    problems.push(
      line(
        file,
        at(call),
        "declare the props with their types, defineProps<{ … }>(), so that the build can check each block's props (vue-component-props-valid)",
      ),
    );
    return { props: {}, problems };
  }
  const context = {
    filename: path,
    source: content,
    ast: program.body,
    options: { fs: { fileExists: existsSync, readFile: (name: string) => readFileSync(name, "utf8") } },
    error(message: string): never {
      throw new Error(message);
    },
    warn() {},
    helper: (key: string) => key,
    getString: (node: Node) => content.slice(node.start ?? 0, node.end ?? 0),
    propsDestructuredBindings: {},
    isCE: false,
  } as unknown as TypeResolveContext;
  type Scope = { types: Record<string, Node>; source: string; offset: number };
  type Scoped = Node & { _ownerScope?: Scope };
  /** A declaration as written in its file, on one line, e.g. "parts: string[]". */
  const written = (node: Node, scope: Scope | undefined): string | undefined =>
    scope === undefined ||
    node.start === null ||
    node.start === undefined ||
    node.end === null ||
    node.end === undefined
      ? undefined
      : scope.source
          .slice(node.start - scope.offset, node.end - scope.offset)
          .replace(/[;,]$/, "")
          .replace(/\s+/g, " ");
  const unsupported = new Error("unsupported");
  const convert = (node: Node, scope: Scoped["_ownerScope"]): PropType => {
    switch (node.type) {
      case "TSStringKeyword":
        return { kind: "string" };
      case "TSNumberKeyword":
        return { kind: "number" };
      case "TSBooleanKeyword":
        return { kind: "boolean" };
      case "TSUnknownKeyword":
        return { kind: "unknown" };
      case "TSLiteralType": {
        const literal = node.literal;
        if (
          literal.type === "StringLiteral" ||
          literal.type === "NumericLiteral" ||
          literal.type === "BooleanLiteral"
        ) {
          return { kind: "literal", values: [literal.value] };
        }
        if (literal.type === "UnaryExpression" && literal.argument.type === "NumericLiteral") {
          return { kind: "literal", values: [-literal.argument.value] };
        }
        throw unsupported;
      }
      case "TSParenthesizedType":
      case "TSTypeOperator":
        return convert(node.typeAnnotation, scope);
      case "TSArrayType":
        return { kind: "array", of: convert(node.elementType, scope) };
      case "TSUnionType": {
        const members = node.types.map((member) => convert(member, scope));
        if (members.every((member) => member.kind === "literal")) {
          return {
            kind: "literal",
            values: members.flatMap((member) => (member.kind === "literal" ? member.values : [])),
          };
        }
        return { kind: "union", of: members };
      }
      case "TSTypeReference": {
        const name = node.typeName.type === "Identifier" ? node.typeName.name : undefined;
        const [parameter] = node.typeParameters?.params ?? [];
        if ((name === "Array" || name === "ReadonlyArray") && parameter !== undefined) {
          return { kind: "array", of: convert(parameter, scope) };
        }
        const local = name === undefined ? undefined : scope?.types[name];
        if (local?.type === "TSTypeAliasDeclaration") return convert(local.typeAnnotation, scope);
        return object(node, scope);
      }
      case "TSTypeLiteral":
      case "TSInterfaceBody":
        return object(node, scope);
      default:
        throw unsupported;
    }
  };
  const object = (node: Node, scope: Scoped["_ownerScope"]): PropType => {
    let elements: ReturnType<Sfc["resolveTypeElements"]>;
    try {
      elements = resolveTypeElements(context, node as Parameters<Sfc["resolveTypeElements"]>[1], scope as never);
    } catch {
      throw unsupported;
    }
    if ((elements.calls ?? []).length > 0) throw unsupported;
    return { kind: "object", fields: fields(elements.props) };
  };
  const fields = (elements: ReturnType<Sfc["resolveTypeElements"]>["props"]): Record<string, Field> => {
    const result: Record<string, Field> = {};
    for (const [name, element] of Object.entries(elements)) {
      if (
        element.type !== "TSPropertySignature" ||
        element.typeAnnotation === null ||
        element.typeAnnotation === undefined
      ) {
        throw unsupported;
      }
      const owner = (element as unknown as Scoped)._ownerScope;
      result[name] = {
        type: convert(element.typeAnnotation.typeAnnotation, owner),
        optional: element.optional === true,
        source: written(element, owner) ?? name,
      };
    }
    return result;
  };
  try {
    const elements = resolveTypeElements(context, declared as Parameters<Sfc["resolveTypeElements"]>[1]);
    const props: Record<string, Field> = {};
    for (const [name, element] of Object.entries(elements.props)) {
      try {
        Object.assign(props, fields({ [name]: element }));
      } catch {
        problems.push(
          line(
            file,
            at(element),
            `the prop ${name} has a type that a block cannot give; use string, number, boolean, literal types, and arrays and object types of them (vue-component-props-valid)`,
          ),
        );
      }
    }
    return { props, problems };
  } catch (error) {
    problems.push(
      line(
        file,
        at(declared),
        `the build cannot read the prop types (${error instanceof Error ? error.message.split("\n")[0] : String(error)}); declare them as an object type (vue-component-props-valid)`,
      ),
    );
    return { props: {}, problems };
  }
}

/** The components in `root`/src/components, and the problems of each: one line each, with the file and its place. */
export function readComponents(root: string): {
  components: Map<string, ComponentInfo>;
  /** Every component of the folder, valid or not. */
  names: Set<string>;
  problems: string[];
} {
  const dir = join(root, "src/components");
  const components = new Map<string, ComponentInfo>();
  const names = new Set<string>();
  const problems: string[] = [];
  const files = existsSync(dir) ? readdirSync(dir).sort() : [];
  for (const name of files) {
    const base = name.replace(/(\.test)?\.(vue|ts)$/, "");
    if (!NAME.test(base) || !/^[A-Za-z0-9]+(\.test\.ts|\.ts|\.vue)$/.test(name)) {
      problems.push(
        `src/components/${name}: not part of a component; src/components/ holds <Name>.vue, its logic <Name>.ts and its test <Name>.test.ts, each Name in PascalCase`,
      );
    }
  }
  const { parse: parseSfc, compileScript } = sfc();
  const { SourceMapConsumer } = require("source-map-js") as typeof import("source-map-js");
  const checked = new Set<string>();
  /** The checks of the module `name` of the folder, once, with the modules it imports. */
  const checkModule = (name: string): void => {
    if (checked.has(name)) return;
    checked.add(name);
    problems.push(
      ...placed(`src/components/${name}`, check(parse(readFileSync(join(dir, name), "utf8"))), (node) =>
        node.loc ? { line: node.loc.start.line, column: node.loc.start.column + 1 } : undefined,
      ),
    );
  };
  /** The findings of `program`; the modules of the folder that it imports are checked in turn. */
  const check = (program: Program): Finding[] => {
    const { found, locals } = findings(program);
    for (const { source, node } of locals) {
      const name = source.slice(2);
      if (!existsSync(join(dir, name))) {
        found.push({
          node,
          message: `${source} does not exist in src/components/; import a file of the folder, with its extension`,
        });
      } else if (name.endsWith(".ts")) checkModule(name);
    }
    return found;
  };
  for (const name of files.filter((candidate) => candidate.endsWith(".vue"))) {
    const component = name.slice(0, -".vue".length);
    if (!NAME.test(component)) continue;
    names.add(component);
    const file = `src/components/${name}`;
    const path = join(dir, name);
    const before = problems.length;
    const source = readFileSync(path, "utf8");
    const { descriptor, errors } = parseSfc(source, { filename: path, sourceMap: true });
    for (const error of errors) {
      const loc = "loc" in error ? error.loc : undefined;
      problems.push(line(file, loc ? { line: loc.start.line, column: loc.start.column } : undefined, error.message));
    }
    if (errors.length > 0) continue;
    const setup = descriptor.scriptSetup;
    if (setup === null || setup.lang !== "ts") {
      problems.push(line(file, undefined, `a component has <script setup lang="ts">`));
      continue;
    }
    if (!existsSync(join(dir, `${component}.test.ts`))) {
      problems.push(
        line(
          file,
          undefined,
          `its test file src/components/${component}.test.ts is missing; every component has one (vue-component-tested)`,
        ),
      );
    }
    let compiled: ReturnType<Sfc["compileScript"]>;
    try {
      compiled = compileScript(descriptor, {
        id: component,
        inlineTemplate: true,
        sourceMap: true,
        isProd: true,
        fs: { fileExists: existsSync, readFile: (name) => readFileSync(name, "utf8") },
      });
    } catch (error) {
      const loc = (error as { loc?: { start: { line: number; column: number } } }).loc;
      const message = (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "";
      problems.push(line(file, loc ? { line: loc.start.line, column: loc.start.column } : undefined, message));
      continue;
    }
    const program = parse(compiled.content);
    const consumer: Consumer | undefined = compiled.map ? new SourceMapConsumer(compiled.map) : undefined;
    problems.push(
      ...placed(file, check(program), (node) => {
        if (!node.loc || consumer === undefined) return undefined;
        const original = consumer.originalPositionFor({ line: node.loc.start.line, column: node.loc.start.column });
        return original.line === null ? undefined : { line: original.line, column: original.column + 1 };
      }),
    );
    // what the compiled component declares: its emits and its options
    let exercise = false;
    let caption = false;
    for (const [node] of nodes(program)) {
      if (node.type !== "ObjectProperty" || node.computed || node.key.type !== "Identifier") continue;
      if (node.key.name === "emits") {
        const value = node.value;
        if (value.type === "ArrayExpression") {
          exercise ||= value.elements.some(
            (element) => element?.type === "StringLiteral" && element.value === "answered",
          );
        } else if (value.type === "ObjectExpression") {
          exercise ||= value.properties.some(
            (property) =>
              property.type === "ObjectProperty" &&
              ((property.key.type === "Identifier" && property.key.name === "answered") ||
                (property.key.type === "StringLiteral" && property.key.value === "answered")),
          );
        }
      } else if (node.key.name === "nojs") {
        if (node.value.type === "StringLiteral" && (node.value.value === "caption" || node.value.value === "replace")) {
          caption = node.value.value === "caption";
        } else {
          const original =
            consumer && node.loc
              ? consumer.originalPositionFor({ line: node.loc.start.line, column: node.loc.start.column })
              : undefined;
          problems.push(
            line(
              file,
              original?.line ? { line: original.line, column: original.column + 1 } : undefined,
              `nojs is "caption" or "replace": whether the component keeps its nojs text, folded as a text description under it, once it runs, or replaces it`,
            ),
          );
        }
      }
    }
    if (exercise && caption) {
      problems.push(
        line(
          file,
          undefined,
          `it emits answered, so it is an exercise, and keeps its nojs text, which gives the task with its solution: an exercise replaces its nojs text, so the solution shows only after the answer; remove nojs: "caption" from defineOptions (vue-component-nojs)`,
        ),
      );
    }
    const props = propTypes(file, path, setup.content, setup.loc.start.line);
    problems.push(...props.problems);
    let logic: string | undefined;
    const blockProps: Record<string, Field> = { ...props.props };
    if (exercise) {
      // the task number comes from the explainer, not from a block
      const seed = blockProps["seed"];
      delete blockProps["seed"];
      if (seed?.type.kind !== "number" || seed.optional) {
        problems.push(
          line(
            file,
            undefined,
            `it emits answered, so it is an exercise, and declares no prop seed: number; the explainer gives an exercise component the seed of its task number as the prop seed, shows it as "Aufgabe Nr." with "Neue Aufgabe" and keeps it in the address, so declare seed: number and show the task generate(seed, props) (vue-component-exercise-contract)`,
          ),
        );
      }
      logic = join(dir, `${component}.ts`);
      const contract = CONTRACT;
      if (!existsSync(logic)) {
        problems.push(
          line(
            file,
            undefined,
            `it emits answered, so it is an exercise, and its logic module src/components/${component}.ts is missing: export ${contract} from it (vue-component-exercise-contract)`,
          ),
        );
      } else {
        // the build runs it, so it is checked as the component's code even when the component does not import it
        checkModule(`${component}.ts`);
        const names = exported(parse(readFileSync(logic, "utf8")));
        const lacking = EXERCISE.filter((function_) => !names.has(function_));
        if (lacking.length > 0) {
          problems.push(
            line(
              `src/components/${component}.ts`,
              undefined,
              `exports no ${lacking.join(", ")}; the logic module of an exercise component exports ${contract} (vue-component-exercise-contract)`,
            ),
          );
        }
      }
    }
    if (problems.length > before) continue;
    components.set(component, {
      name: component,
      file,
      path,
      props: blockProps,
      exercise,
      caption,
      ...(logic === undefined ? {} : { logic }),
    });
  }
  return { components, names, problems };
}

/** A problem with a block's props, at a path below props. */
export interface PropProblem {
  path: readonly (string | number)[];
  message: string;
}

const isText = (value: unknown): value is Text =>
  typeof value === "string" ||
  (typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every((text) => typeof text === "string"));

/** What a value of `type` is, for a message. */
function expected(type: PropType): string {
  switch (type.kind) {
    case "string":
      return "a text";
    case "number":
      return "a number";
    case "boolean":
      return "true or false";
    case "unknown":
      return "a value";
    case "literal":
      return `one of ${type.values.map((value) => JSON.stringify(value)).join(", ")}`;
    case "array":
      return "a list";
    case "object":
      return `fields ${Object.keys(type.fields).join(", ")}`;
    case "union":
      return type.of.map(expected).join(" or ");
  }
}

/** Whether `value` is a `type`. */
function matches(value: unknown, type: PropType): boolean {
  return valueProblems(value, type, [], "", "").length === 0;
}

function valueProblems(
  value: unknown,
  type: PropType,
  path: readonly (string | number)[],
  component: string,
  declaration: string,
): PropProblem[] {
  const wrong = (): PropProblem[] => [
    { path, message: `${component} declares ${declaration}; give ${expected(type)} here (vue-component-props-valid)` },
  ];
  switch (type.kind) {
    case "unknown":
      return [];
    case "string":
      return isText(value) ? [] : wrong();
    case "number":
      return typeof value === "number" ? [] : wrong();
    case "boolean":
      return typeof value === "boolean" ? [] : wrong();
    case "literal":
      return type.values.includes(value as string) ? [] : wrong();
    case "array":
      return Array.isArray(value)
        ? value.flatMap((item, index) => valueProblems(item, type.of, [...path, index], component, declaration))
        : wrong();
    case "union":
      return type.of.some((member) => matches(value, member)) ? [] : wrong();
    case "object":
      if (typeof value !== "object" || value === null || Array.isArray(value)) return wrong();
      return fieldProblems(value as Record<string, unknown>, type.fields, path, component, declaration);
  }
}

function fieldProblems(
  value: Readonly<Record<string, unknown>>,
  fields: Readonly<Record<string, Field>>,
  path: readonly (string | number)[],
  component: string,
  declaration?: string,
): PropProblem[] {
  const problems: PropProblem[] = [];
  const what = path.length === 0 ? "prop" : "field";
  for (const key of Object.keys(value)) {
    if (!(key in fields)) {
      problems.push({
        path: [...path, key],
        message: `${component} has no ${what} ${key}${declaration === undefined ? "" : ` in ${declaration}`}; ${Object.keys(fields).length === 0 ? "it has none" : `its ${what}s are ${Object.keys(fields).join(", ")}`} (vue-component-props-valid)`,
      });
    }
  }
  for (const [key, field] of Object.entries(fields)) {
    if (!(key in value)) {
      if (!field.optional) {
        problems.push({
          path,
          message: `${key} is missing; ${component} declares ${field.source} (vue-component-props-valid)`,
        });
      }
      continue;
    }
    problems.push(...valueProblems(value[key], field.type, [...path, key], component, declaration ?? field.source));
  }
  return problems;
}

/** The problems of a block's `props` against the props of `component`. */
export function propsProblems(props: unknown, component: ComponentInfo): PropProblem[] {
  if (props !== undefined && (typeof props !== "object" || props === null || Array.isArray(props))) {
    return [{ path: [], message: `the props of ${component.name} are a map of its prop names to values` }];
  }
  return fieldProblems((props ?? {}) as Record<string, unknown>, component.props, [], component.name);
}

/** The paths of the learner texts in `value`, a `type`: each string prop, whose languages the build checks. */
export function textPaths(
  value: unknown,
  type: PropType,
  path: readonly (string | number)[] = [],
): (string | number)[][] {
  switch (type.kind) {
    case "string":
      return [[...path]];
    case "array":
      return Array.isArray(value) ? value.flatMap((item, index) => textPaths(item, type.of, [...path, index])) : [];
    case "object":
      return typeof value === "object" && value !== null
        ? Object.entries(type.fields).flatMap(([key, field]) =>
            key in value ? textPaths((value as Record<string, unknown>)[key], field.type, [...path, key]) : [],
          )
        : [];
    case "union": {
      const member = type.of.find((candidate) => matches(value, candidate));
      return member === undefined ? [] : textPaths(value, member, path);
    }
    default:
      return [];
  }
}

/** `value`, a `type`, with each learner text in `lang`. */
function localize(value: unknown, type: PropType, lang: string): unknown {
  switch (type.kind) {
    case "string":
      return inLanguage(value as Text, lang);
    case "array":
      return (value as unknown[]).map((item) => localize(item, type.of, lang));
    case "object":
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => {
          const field = type.fields[key];
          return [key, field === undefined ? item : localize(item, field.type, lang)];
        }),
      );
    case "union": {
      const member = type.of.find((candidate) => matches(value, candidate));
      return member === undefined ? value : localize(value, member, lang);
    }
    default:
      return value;
  }
}

/** A block's props as the component gets them on a page in `lang`. */
export function propsIn(props: unknown, component: ComponentInfo, lang: string): Record<string, unknown> {
  return localize(props ?? {}, { kind: "object", fields: component.props }, lang) as Record<string, unknown>;
}

/** The logic module of an exercise component; describe and about, which readComponents requires, for describedProblems. */
export interface ExerciseLogic {
  generate(seed: number, props: unknown): unknown;
  check(task: unknown, answer: unknown): unknown;
  solution(task: unknown): unknown;
  wrong(task: unknown): unknown;
  describe?(task: unknown, props: unknown, lang: string): unknown;
  about?: unknown;
}

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
  return { description: { about: about as ComponentAbout, seeds, tasks }, problems };
}

/**
 * The property test of an exercise component's logic with the props of a block, over the seeds 1 to `seeds`: the
 * task is the same for the same seed, the solution passes, the wrong answer fails, and nothing throws. The first
 * problem found, or none.
 */
export function propertyProblems(logic: ExerciseLogic, props: unknown, seeds = COMPONENT_SEEDS): string[] {
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
