// Reads an interactive app's src/app.yaml and its playthroughs (src/playthroughs/*.yaml) at build time and validates
// them: each file against its schema (interactive.v1.schema.json, playthrough.v1.schema.json), then what a schema
// cannot say: German first and each declared language complete, restricted Markdown in the texts, unique ids, at
// least one playthrough, each step doing something (keys or inputs, not both, or ticks) and expecting something, a
// playthrough's route one of the app's. The YAML helpers are
// the explainer's (../explainer/load.ts). Each problem is one line: the file, its line, the place in the file, the
// language where it matters, and what to do.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import schema from "./interactive.v1.schema.json" with { type: "json" };
import playthroughSchema from "./playthrough.v1.schema.json" with { type: "json" };
import { Problems, readYaml, schemaProblems, Texts, type YamlFile } from "../explainer/load.ts";
import { languageListProblems, type Text } from "../shared/languages.ts";
import type { Playthrough } from "./contract.ts";
import { MESSAGES } from "./messages.ts";

export const SCHEMA_URL = schema.$id;
export const RULE_URL = "https://lernapps.net/tooling/rules/#interactive-app-valid";
export const APP = "src/app.yaml";
export const PLAYTHROUGHS = "src/playthroughs";

export interface Route {
  id: string;
  title: Text;
  description?: Text;
}

export interface Section {
  id: string;
  title: Text;
  text: Text;
}

/** src/app.yaml: what the start page says, the languages and the routes. */
export interface App {
  title: Text;
  /** The h1 of the app page when it should differ from the title (the header links the title there). */
  heading?: Text;
  description: Text;
  howto: Text;
  competencies: readonly Text[];
  languages: readonly string[];
  routes?: readonly Route[];
  sections?: readonly Section[];
}

/** A playthrough with its file, for the lines of its problems. */
export interface PlaythroughFile {
  yaml: YamlFile;
  playthrough: Playthrough;
}

export interface Interactive {
  app: App;
  appYaml: YamlFile;
  playthroughs: readonly PlaythroughFile[];
}

/** The app is not valid: one problem per line in `problems`. */
export class InteractiveError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(
      [
        `the interactive app in src/ is not valid (${RULE_URL}):`,
        ...problems.map((problem) => `  - ${problem}`),
        `Fix it as the schemas say: ${SCHEMA_URL}, ${playthroughSchema.$id}`,
      ].join("\n"),
    );
    this.problems = problems;
  }
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
const validators: Record<"app" | "playthrough", ValidateFunction> = {
  app: ajv.compile(schema),
  playthrough: ajv.compile(playthroughSchema),
};

function validate(yaml: YamlFile, kind: keyof typeof validators, problems: Problems): boolean {
  const check = validators[kind];
  if (check(yaml.value)) return true;
  const before = problems.lines.length;
  schemaProblems(yaml, check.errors ?? [], problems);
  if (problems.lines.length === before) problems.at(yaml, [], "does not match the schema");
  return false;
}

/** The problems of a list of ids: each once. */
function uniqueIds(yaml: YamlFile, key: string, items: readonly { id: string }[], problems: Problems): void {
  items.forEach((item, index) => {
    if (items.findIndex((other) => other.id === item.id) !== index) {
      problems.at(yaml, [key, index, "id"], `${item.id} is used twice in ${key}; give each its own id`);
    }
  });
}

/** The app in `root`, or the problems that keep it from building. */
export function check(root: string): { interactive?: Interactive; problems: string[] } {
  const problems = new Problems();
  if (!existsSync(join(root, APP))) {
    problems.add(`${APP} is missing: the start page of the app comes from it (${SCHEMA_URL})`);
    return { problems: problems.lines };
  }
  const appYaml = readYaml(root, APP, problems);
  if (appYaml === undefined || !validate(appYaml, "app", problems)) return { problems: problems.lines };
  const app = appYaml.value as App;
  const languageList = languageListProblems(app.languages, Object.keys(MESSAGES));
  for (const problem of languageList) {
    problems.at(appYaml, ["languages", Math.max(app.languages.lastIndexOf(problem.lang), 0)], problem.message);
  }
  if (languageList.length > 0) return { problems: problems.lines };
  const texts = new Texts(app.languages, problems);
  texts.check(appYaml, ["title"], "plain");
  if (app.heading !== undefined) texts.check(appYaml, ["heading"], "plain");
  texts.check(appYaml, ["description"], "markdown");
  texts.check(appYaml, ["howto"], "markdown");
  app.competencies.forEach((_, index) => texts.check(appYaml, ["competencies", index], "plain"));
  (app.routes ?? []).forEach((_, index) => {
    texts.check(appYaml, ["routes", index, "title"], "plain");
    texts.check(appYaml, ["routes", index, "description"], "plain");
  });
  (app.sections ?? []).forEach((_, index) => {
    texts.check(appYaml, ["sections", index, "title"], "plain");
    texts.check(appYaml, ["sections", index, "text"], "markdown");
  });
  uniqueIds(appYaml, "routes", app.routes ?? [], problems);
  uniqueIds(appYaml, "sections", app.sections ?? [], problems);
  // the playthroughs only of a valid app.yaml: they refer to its routes
  if (problems.lines.length > 0) return { problems: problems.lines };

  const routes = (app.routes ?? []).map((route) => route.id);
  const files = existsSync(join(root, PLAYTHROUGHS))
    ? readdirSync(join(root, PLAYTHROUGHS))
        .filter((file) => file.endsWith(".yaml"))
        .sort()
    : [];
  if (files.length === 0) {
    problems.add(
      `${PLAYTHROUGHS}/: no playthrough; write at least one, <name>.yaml: a seed, and steps of keys, inputs or ticks with the state or announcement expected after them (${playthroughSchema.$id})`,
    );
  }
  const playthroughs: PlaythroughFile[] = [];
  for (const file of files) {
    const yaml = readYaml(root, `${PLAYTHROUGHS}/${file}`, problems);
    if (yaml === undefined || !validate(yaml, "playthrough", problems)) continue;
    const playthrough = yaml.value as Playthrough;
    if (playthrough.route !== undefined && !routes.includes(playthrough.route)) {
      problems.at(
        yaml,
        ["route"],
        routes.length === 0
          ? `${playthrough.route}: ${APP} has no routes; leave route out`
          : `${playthrough.route} is not a route of ${APP}; use one of ${routes.join(", ")}`,
      );
    }
    playthrough.steps.forEach((step, index) => {
      if (step.keys !== undefined && step.inputs !== undefined) {
        problems.at(
          yaml,
          ["steps", index, "inputs"],
          "keys and inputs in one step; write the keys as key inputs ({ kind: key, key: a }) in inputs, or give each its own step",
        );
      } else if (step.keys === undefined && step.inputs === undefined && step.ticks === undefined) {
        problems.at(
          yaml,
          ["steps", index],
          "does nothing; give the keys (keys) or inputs (inputs) of the step, the ticks that pass (ticks), or both",
        );
      } else if (step.state === undefined && step.announce === undefined) {
        problems.at(
          yaml,
          ["steps", index],
          "expects nothing; give the state expected after the step (state), the announcement (announce), or both",
        );
      }
    });
    playthroughs.push({ yaml, playthrough });
  }
  if (problems.lines.length > 0) return { problems: problems.lines };
  return { interactive: { app, appYaml, playthroughs }, problems: [] };
}

/** The app in `root`; an InteractiveError with every problem when it is not valid. */
export function loadInteractive(root: string): Interactive {
  const { interactive, problems } = check(root);
  if (interactive === undefined) throw new InteractiveError(problems);
  return interactive;
}
