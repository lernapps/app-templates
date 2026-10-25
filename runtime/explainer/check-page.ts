// The checks of one page of an explainer's content at build time, what the schema cannot say: its events, its images,
// its blocks with their texts, formulas, links and depth, its exercises (a question of the question types, a generated
// exercise with its expression and its property test, a vue-component block with its component), and that its exercises
// have their anchors once.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { questionTexts } from "../shared/questions/question.ts";
import { questionDetails } from "../shared/questions/validate.ts";
import { checkMaterial, type AppChecks, type MaterialBlock } from "../shared/blocks/index.ts";
import { propsProblems, textPaths, withData } from "./components/props.ts";
import { readComponents } from "./components/read.ts";
import {
  inLanguage,
  termId,
  type Block,
  type BlockOf,
  type ComponentUse,
  type DataRecord,
  type Event,
  type Text,
} from "./content.ts";
import { ExpressionError, parse, variables } from "./expression.ts";
import { dataOf, templatesOf } from "./exercises.ts";
import { exampleProblems, soundness } from "./generated/soundness.ts";
import { templateProblems, unusedVariables } from "./generated/texts.ts";
import { type Generated, type Templates } from "./generated/types.ts";
import { validators } from "./schema.ts";
import { RESERVED_PARAMS } from "./tasks.ts";
import {
  get,
  isObject,
  lineOf,
  pathText,
  schemaProblems,
  type Path,
  type Problems,
  type Texts,
  type YamlFile,
} from "../shared/content.ts";
import { textLanguages } from "../shared/languages.ts";
import { formulaProblems } from "../shared/text/markdown.ts";

/** A date of an event as a number to sort by: year, month, day. */
function dateOrder(date: number | string): number {
  if (typeof date === "number") return date * 10_000;
  const match = /^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(date);
  if (match === null) return 0;
  const year = Number(match[1]);
  return year * 10_000 + Number(match[2] ?? 0) * 100 + Number(match[3] ?? 0);
}

export interface PageCheck {
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

/** What the checks of blocks that show content need from the app: its images, and where a link to a page goes. */
function appChecks(check: PageCheck, at: Path): AppChecks {
  const { yaml, texts } = check;
  return {
    imageExists: (image) => {
      const file = join(check.root, "src", image);
      if (!existsSync(file)) return false;
      check.images.set(image, file);
      return true;
    },
    onLink: (link) =>
      texts.links.push({ yaml, path: [...at, ...link.path], lang: link.lang, offset: 0, href: link.href }),
  };
}

/** A block that shows content, checked with the checks the quiz's questions share. */
function checkMaterialBlock(check: PageCheck, block: MaterialBlock<Text>, at: Path): void {
  const { yaml, problems, texts } = check;
  // the block is the one of the list [block]: its path starts with 0, which `at` already names
  const app = appChecks(check, at);
  const found = checkMaterial([block], {
    languages: texts.languages,
    ...app,
    onLink: (link) => app.onLink?.({ ...link, path: link.path.slice(1) }),
  });
  for (const problem of found) {
    problems.at(yaml, [...at, ...problem.path.slice(1)], problem.message, problem.lang, problem.line);
  }
}

export function checkBlocks(check: PageCheck, blocks: readonly Block[], path: Path, depth: number, box?: string): void {
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
      case "formula":
      case "figure":
      case "labelled-figure":
      case "table":
      case "quote":
      case "code":
        checkMaterialBlock(check, block, at);
        break;
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
      case "generated":
        checkExerciseId(check, block.id, at);
        checkGenerated(check, block, at);
        break;
      case "vue-component":
        checkComponent(check, block, at);
        break;
      default:
        checkExerciseId(check, block.id, at);
        for (const problem of questionDetails(block, texts.languages, undefined, appChecks(check, at))) {
          // a path that ends in the language names it already, as in a block's texts
          const path = [
            ...at,
            ...problem.path,
            ...(problem.lang === undefined || problem.path.at(-1) === problem.lang ? [] : [problem.lang]),
          ];
          problems.at(yaml, path, problem.message, problem.lang, problem.line);
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
  // a list prop given as { data: <name> } is the records of that data file from here on
  const files = Object.fromEntries([...check.dataFiles].map(([name, file]) => [name, file.value as object[]]));
  const resolved = withData(block.props, component, files);
  if (resolved.props !== undefined) block.props = resolved.props as NonNullable<typeof block.props>;
  // one line for a problem all records of a data file share
  const found =
    resolved.problems.length > 0
      ? resolved.problems
      : propsProblems(block.props, component).filter(
          (problem, index, all) => all.findIndex(({ message }) => message === problem.message) === index,
        );
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

const ARBITRARIES = ["int", "decimal", "oneOf", "pick"] as const;

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
    const source = arbitrary.from;
    let size: number | undefined;
    if (source !== undefined && !Array.isArray(source)) {
      size = data((source as { data: string }).data, [...path, "from", "data"])?.length;
    } else if (Array.isArray(source)) size = source.length;
    if (arbitrary.distinct === true && arbitrary.pick !== undefined && size !== undefined && arbitrary.pick > size) {
      problems.at(yaml, path, `${arbitrary.pick} distinct picks from a list of ${size}; pick fewer`);
    }
    const literals = arbitrary.oneOf ?? (Array.isArray(source) ? source : []);
    const listKey = arbitrary.oneOf !== undefined ? "oneOf" : "from";
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
    const options = (compare as Record<string, unknown>)["choice"];
    if (typeof options === "string") checkExpression(check, [...at, "answer", "compare", "choice"], options, declared);
    else if (Array.isArray(options)) {
      options.forEach((item, index) => {
        if (isObject(item)) texts.check(yaml, [...at, "answer", "compare", "choice", index], "plain");
      });
    }
    if ("number" in compare) texts.check(yaml, [...at, "answer", "compare", "number", "unit"], "plain");
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
