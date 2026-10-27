// The components of an explainer at build time (src/components/<Name>.vue, vue-component blocks): what the build reads
// from each single-file component with Vue's own SFC compiler, and what it checks there. Every component has
// <script setup lang="ts"> and its test file <Name>.test.ts. The checks run on the compiler's output, the script with
// the template compiled into it, mapped back to the line and column of the .vue file, and on the TypeScript modules of
// the component's folder that it imports: no network (fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon, an
// import from a URL), no code or HTML from strings (eval, new Function, innerHTML, v-html), imports only from vue, the
// runtime @lernapps/app-templates, @lernapps/tooling/storage, i18n and a11y and the component's own folder, and browser
// globals (window, document, localStorage, …) only inside onMounted and the hooks that run after it, because the build
// renders the component without a browser. A component that emits answer is an exercise: it is the input of its
// task and nothing more. It declares the prop seed: number, the task number the explainer gives it (tasks.ts), shows
// the task generate(seed, props), and emits answer with the learner's answer each time it changes (undefined while there
// is none); it may declare the prop checked: boolean, true once the explainer checked the answer it has now. The
// explainer draws "Prüfen" under it, calls check, reason and show of its logic module, and gives the feedback. Its
// logic module <Name>.ts exports generate(seed, props), check(task, answer), solution(task), wrong(task), which the
// build tests over fixed seeds (propertyProblems), reason(task, answer, props, lang), the app's message for a wrong
// answer, describe(task, props, lang), the task and its solution as a learner reads them, and about, what the
// exercise is, for a tutor (describedProblems). A component keeps its nojs text, folded as a
// text description under it, when it declares defineOptions({ nojs: "caption" }); by default it replaces it.
//
// The interactive archetype runs the same code checks on its components (codeProblems, with sourceScope): they may
// import any of the app's own files in src/ instead of their own folder only, and the libraries the app lists in the
// dependencies of its package.json (a bare import of such a package, bundled by the build; their licences are
// lernapps check's dependency-licence). An import from a URL stays forbidden.
//
// The props of a block are checked against the component's prop types (defineProps<…>()), which the SFC compiler
// resolves, as Vue itself does for its runtime props, rather than vue-component-meta, which needs TypeScript's
// language service: the types a block can give from YAML are data, which the compiler's type resolution reads in
// milliseconds, without a program. A prop type is a string, number or boolean, a literal type, a union of these, an
// array, or an object type of them (inline, an interface or type of the component, or an object type it imports); a
// string is a learner text, given in YAML as a string or a map by language like every text of the explainer, and the
// component gets it in the page's language.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Node, type Program } from "@babel/types";
import { type ComponentInfo, type Field, type PropType } from "../content.ts";
import {
  codeChecker,
  type CodeScope,
  line,
  nodes,
  parse,
  type Place,
  readSfc,
  sfc,
  type Sfc,
} from "../../shared/vue-code.ts";
import { CONTRACT } from "./exercise.ts";

type TypeResolveContext = Parameters<Sfc["resolveTypeElements"]>[0];

/** The budget of a component's own code, gzipped, in bytes; Vue is loaded once per page and not counted. */
export const SIZE_BUDGET = 20_000;

const NAME = /^[A-Z][A-Za-z0-9]*$/;
const EXERCISE = ["generate", "check", "solution", "wrong", "reason", "describe", "about"];

/** The scope of an explainer's components: the files of src/components/ itself. */
const componentsScope = (root: string): CodeScope => ({
  own: "its own folder",
  resolve(_file, source) {
    if (!source.startsWith("./") || source.slice(2).includes("/")) return undefined;
    return existsSync(join(root, "src/components", source.slice(2)))
      ? { file: `src/components/${source.slice(2)}` }
      : { problem: `${source} does not exist in src/components/; import a file of the folder, with its extension` };
  },
});

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
  const code = codeChecker(root, componentsScope(root), problems);
  for (const name of files.filter((candidate) => candidate.endsWith(".vue"))) {
    const component = name.slice(0, -".vue".length);
    if (!NAME.test(component)) continue;
    names.add(component);
    const file = `src/components/${name}`;
    const path = join(dir, name);
    const before = problems.length;
    const read = readSfc(root, file, problems);
    if (read === undefined) continue;
    const { descriptor, setup } = read;
    if (!existsSync(join(dir, `${component}.test.ts`))) {
      problems.push(
        line(
          file,
          undefined,
          `its test file src/components/${component}.test.ts is missing; every component has one (vue-component-tested)`,
        ),
      );
    }
    const compiled = code.compile(file, descriptor);
    if (compiled === undefined) continue;
    const { program, consumer } = compiled;
    // what the compiled component declares: its emits and its options
    const emitted = new Set<string>();
    let caption = false;
    for (const [node] of nodes(program)) {
      if (node.type !== "ObjectProperty" || node.computed || node.key.type !== "Identifier") continue;
      if (node.key.name === "emits") {
        const value = node.value;
        if (value.type === "ArrayExpression") {
          for (const element of value.elements) if (element?.type === "StringLiteral") emitted.add(element.value);
        } else if (value.type === "ObjectExpression") {
          for (const property of value.properties) {
            if (property.type !== "ObjectProperty") continue;
            if (property.key.type === "Identifier") emitted.add(property.key.name);
            else if (property.key.type === "StringLiteral") emitted.add(property.key.value);
          }
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
    const exercise = emitted.has("answer");
    if (emitted.has("answered")) {
      problems.push(
        line(
          file,
          undefined,
          `it emits answered, which the explainer no longer takes: an exercise component is the input of its task; emit answer with the learner's answer each time it changes, drop its own "Prüfen" and the call of check, and export reason(task, answer, props, lang) from its logic module, which gives the app's message for a wrong answer; the explainer draws "Prüfen", checks and gives the feedback (vue-component-exercise-contract)`,
        ),
      );
    }
    if (exercise && caption) {
      problems.push(
        line(
          file,
          undefined,
          `it emits answer, so it is an exercise, and keeps its nojs text, which gives the task with its solution: an exercise replaces its nojs text, so the solution shows only after the answer; remove nojs: "caption" from defineOptions (vue-component-nojs)`,
        ),
      );
    }
    const props = propTypes(file, path, setup.content, setup.loc.start.line);
    problems.push(...props.problems);
    let logic: string | undefined;
    const blockProps: Record<string, Field> = { ...props.props };
    // whether the explainer tells it that the answer it has is checked
    const checked = exercise && blockProps["checked"] !== undefined;
    if (exercise) {
      const flag = blockProps["checked"];
      delete blockProps["checked"];
      if (flag !== undefined && flag.type.kind !== "boolean") {
        problems.push(
          line(
            file,
            undefined,
            `its prop checked is no boolean; the explainer gives an exercise component checked: true once it checked the answer the component has now, and false when the answer changes, so declare checked: boolean (vue-component-exercise-contract)`,
          ),
        );
      }
      // the task number comes from the explainer, not from a block
      const seed = blockProps["seed"];
      delete blockProps["seed"];
      if (seed?.type.kind !== "number" || seed.optional) {
        problems.push(
          line(
            file,
            undefined,
            `it emits answer, so it is an exercise, and declares no prop seed: number; the explainer gives an exercise component the seed of its task number as the prop seed, shows it as "Aufgabe Nr." with "Neue Aufgabe" and keeps it in the address, so declare seed: number and show the task generate(seed, props) (vue-component-exercise-contract)`,
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
            `it emits answer, so it is an exercise, and its logic module src/components/${component}.ts is missing: export ${contract} from it (vue-component-exercise-contract)`,
          ),
        );
      } else {
        // the build runs it, so it is checked as the component's code even when the component does not import it
        code.module(`src/components/${component}.ts`);
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
      checked,
      caption,
      ...(logic === undefined ? {} : { logic }),
    });
  }
  return { components, names, problems };
}

/** A problem with a block's props, at a path below props. */
