// The props of a vue-component block against the prop types of its component: what is wrong with a value at a path
// below props, the paths of the learner texts among them, and the props in the page's language. A list prop may be
// given as { data: <name> }, the records of src/data/<name>.yaml (withData).
import { inLanguage, type Text } from "../../shared/languages.ts";
import { type ComponentInfo, type Field, type PropType } from "../content.ts";

export interface PropProblem {
  path: readonly (string | number)[];
  message: string;
}

export const isText = (value: unknown): value is Text =>
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

/**
 * `value`, a `type`, with each { data: <name> } where a list is declared replaced by the records of src/data/<name>.yaml,
 * cut to the fields of the declared item type; a file that does not exist is a problem at the reference.
 */
function dataIn(
  value: unknown,
  type: PropType,
  files: Readonly<Record<string, readonly object[]>>,
  path: readonly (string | number)[],
  problems: PropProblem[],
): unknown {
  if (type.kind === "array" && Array.isArray(value)) {
    return value.map((item, index) => dataIn(item, type.of, files, [...path, index], problems));
  }
  if (type.kind === "array" && typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    const name = (value as { data?: unknown }).data;
    if (keys.length !== 1 || typeof name !== "string") return value;
    const records = files[name];
    if (records === undefined) {
      problems.push({ path, message: `src/data/${name}.yaml does not exist (vue-component-props-valid)` });
      return value;
    }
    const item = type.of;
    return item.kind !== "object"
      ? records
      : records.map((record) =>
          Object.fromEntries(
            Object.keys(item.fields).flatMap((key) =>
              key in record ? [[key, (record as Record<string, unknown>)[key]]] : [],
            ),
          ),
        );
  }
  if (type.kind === "object" && typeof value === "object" && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        const field = type.fields[key];
        return [key, field === undefined ? item : dataIn(item, field.type, files, [...path, key], problems)];
      }),
    );
  }
  return value;
}

/** A block's `props` with the data references replaced by their records, and the problems of the references. */
export function withData(
  props: unknown,
  component: ComponentInfo,
  files: Readonly<Record<string, readonly object[]>>,
): { props: unknown; problems: PropProblem[] } {
  const problems: PropProblem[] = [];
  const resolved = dataIn(props, { kind: "object", fields: component.props }, files, [], problems);
  return { props: resolved, problems };
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
