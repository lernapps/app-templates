// Broken interactive apps: each case breaks the template (interactive/) in one way, and its build fails with exactly
// one problem line, which names the file, its line, the place in it, and what to do.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { interactive } from "../runtime/interactive/plugin.ts";
import { edit, interactiveApp, withDependency } from "./interactive-app.ts";

/** The problem lines of a failed build; none when it builds. */
async function problems(root: string): Promise<string[]> {
  try {
    await build({
      root,
      base: "./",
      logLevel: "silent",
      configFile: false,
      plugins: [interactive()],
      build: { write: false },
    });
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return message
      .split("\n")
      .filter((line) => line.startsWith("  - "))
      .map((line) => line.slice(4));
  }
}

const PLAY = "playthroughs/grundreihe.yaml";
const CORE = "core/index.ts";

const cases: [string, (root: string) => void, string][] = [
  [
    "an app.yaml without howto",
    (root) => {
      const app = join(root, "src/app.yaml");
      writeFileSync(app, readFileSync(app, "utf8").replace(/^howto: \|\n(  .*\n)+/m, ""));
    },
    "src/app.yaml:2: howto is missing",
  ],
  [
    "a Markdown heading in a text",
    (root) => edit(root, "app.yaml", "  - Tippe den Buchstaben,", "  ## Spielen\n  - Tippe den Buchstaben,"),
    'src/app.yaml:7: howto (de): a Markdown heading ("Spielen"); use a section block with the title "Spielen"',
  ],
  [
    "a heading in a language the app does not have",
    (root) => edit(root, "app.yaml", "description: |", "heading: { de: Tippe los!, en: Go }\ndescription: |"),
    "src/app.yaml:3: heading (en): en is not a language of the app; declare it in languages in src/app.yaml, or remove it",
  ],
  [
    "a route twice",
    (root) => edit(root, "app.yaml", "id: obere-reihe", "id: grundreihe"),
    "src/app.yaml:19: routes[1].id: grundreihe is used twice in routes; give each its own id",
  ],
  [
    "no playthrough",
    (root) => {
      rmSync(join(root, "src", PLAY));
      rmSync(join(root, "src/playthroughs/obere-reihe.yaml"));
    },
    "src/playthroughs/: no playthrough; write at least one, <name>.yaml: a seed, and steps of keys, inputs or ticks with the state or announcement expected after them (https://lernapps.net/tooling/schemas/playthrough.v1.schema.json)",
  ],
  [
    "a playthrough of a route the app does not have",
    (root) => edit(root, PLAY, "route: grundreihe", "route: untere-reihe"),
    "src/playthroughs/grundreihe.yaml:5: route: untere-reihe is not a route of src/app.yaml; use one of grundreihe, obere-reihe",
  ],
  [
    "a step that expects nothing",
    (root) => edit(root, PLAY, "    state: { index: 1, score: 1, misses: 1 }\n    announce: Falsch. Tippe a.\n", ""),
    "src/playthroughs/grundreihe.yaml:11: steps[1]: expects nothing; give the state expected after the step (state), the announcement (announce), or both",
  ],
  [
    "a step with keys and inputs",
    (root) => edit(root, PLAY, "  - keys: [x]\n", "  - keys: [x]\n    inputs: [{ kind: action, name: again }]\n"),
    "src/playthroughs/grundreihe.yaml:12: steps[1].inputs: keys and inputs in one step; write the keys as key inputs ({ kind: key, key: a }) in inputs, or give each its own step",
  ],
  [
    "a step that does nothing",
    (root) => edit(root, PLAY, "  - ticks: 100\n    state:", "  - state:"),
    "src/playthroughs/grundreihe.yaml:14: steps[2]: does nothing; give the keys (keys) or inputs (inputs) of the step, the ticks that pass (ticks), or both",
  ],
  [
    "a core without step",
    (root) => edit(root, CORE, "export function step(", "function step("),
    "src/core/index.ts: exports no step; the core exports start(seed, route) and step(state, input), and tick(state, dt) when the app moves on its own (interactive-core-contract)",
  ],
  [
    "a route the core cannot start",
    (root) => edit(root, "data/lessons.json", '"obere-reihe"', '"oben"'),
    'src/app.yaml:19: routes[1].id: start(1, "obere-reihe") throws: no lesson obere-reihe in src/data/lessons.json; the core starts every route (interactive-core-contract)',
  ],
  [
    "a core without tick, and a playthrough with ticks",
    (root) => edit(root, CORE, "export function tick(", "function tick("),
    "src/playthroughs/grundreihe.yaml:14: steps[2].ticks: the core exports no tick, so no time passes in the app; export tick(state, dt) from src/core/index.ts, or leave the ticks out (interactive-core-contract)",
  ],
  [
    "a core that throws on a key",
    (root) =>
      edit(
        root,
        CORE,
        "  const key = input.key;\n",
        '  const key = input.key;\n  if (key === "x") throw new Error("no x");\n',
      ),
    'src/playthroughs/grundreihe.yaml:11: steps[1].keys[0]: step(state, "x") throws: no x (interactive-core-contract)',
  ],
  [
    "a core that throws on a tick",
    (root) =>
      edit(
        root,
        CORE,
        "  if (state.done) return state;\n  const left",
        '  if (state.left <= 4000) throw new Error("no time");\n  if (state.done) return state;\n  const left',
      ),
    "src/playthroughs/grundreihe.yaml:14: steps[2].ticks: tick(state, 20) throws at tick 51: no time (interactive-core-contract)",
  ],
  [
    "a core that draws from Math.random",
    (root) => edit(root, CORE, "const next = random(seed);", "const next = Math.random;"),
    "src/playthroughs/grundreihe.yaml:8: steps[0]: the state differs between two plays of the same steps; the core gives the same state for the same seed, route, inputs and ticks, so draw from the seed, never from Math.random or the clock (interactive-core-contract)",
  ],
  [
    "a playthrough whose state does not match",
    (root) => edit(root, PLAY, "state: { index: 3, score: 2 }", "state: { index: 3, score: 3 }"),
    'src/playthroughs/grundreihe.yaml:20: steps[4].state.score: score is 2 after "j", "x", 100 ticks, 150 ticks, "F", the playthrough expects 3 (interactive-playthroughs-pass)',
  ],
  [
    "a component that fetches",
    (root) =>
      edit(
        root,
        "ui/App.vue",
        "const t = translator(de);\n",
        'const t = translator(de);\nvoid fetch("https://example.org/log");\n',
      ),
    "src/ui/App.vue:15:6: fetch: a component makes no network request; give it what it needs through its props (vue-component-no-network)",
  ],
  [
    "a component that imports a library from a URL",
    (root) => {
      withDependency(root);
      edit(root, "ui/App.vue", "const t = translator(de);\n", 'const t = translator(de);\nvoid parse("a: 1");\n');
      edit(
        root,
        "ui/App.vue",
        'import de from "../messages/de.json";\n',
        'import de from "../messages/de.json";\nimport { parse } from "https://esm.sh/yaml@2";\n',
      );
    },
    "src/ui/App.vue:11:1: an import from https://esm.sh/yaml@2; a component loads nothing from the network, so bundle what it needs (vue-component-no-network)",
  ],
  [
    "a component that imports a library the app does not depend on",
    (root) => {
      edit(root, "ui/App.vue", "const t = translator(de);\n", 'const t = translator(de);\nvoid parse("a: 1");\n');
      edit(
        root,
        "ui/App.vue",
        'import de from "../messages/de.json";\n',
        'import de from "../messages/de.json";\nimport { parse } from "yaml";\n',
      );
    },
    "src/ui/App.vue:11:1: an import from yaml; a component imports only from vue, @lernapps/app-templates, @lernapps/tooling/storage, @lernapps/tooling/i18n, @lernapps/tooling/a11y and the app's own files in src/ or a library in the dependencies of package.json (vue-component-imports)",
  ],
  [
    "a core, imported by a component, that touches window",
    (root) =>
      edit(
        root,
        CORE,
        "export function start(",
        "export const wide = () => window.innerWidth;\n\nexport function start(",
      ),
    "src/core/index.ts:51:27: window outside onMounted; the build renders the component where there is no window, so use it only inside onMounted (vue-component-browser-globals)",
  ],
];

describe("a broken interactive app fails the build with its one line", () => {
  test.each(cases)(
    "%s",
    async (_name, breakIt, line) => {
      const root = interactiveApp();
      breakIt(root);
      expect(await problems(root)).toEqual([line]);
    },
    30_000,
  );
});
