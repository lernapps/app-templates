// Broken interactive apps: each case breaks the template (interactive/) in one way, and its build fails with exactly
// one problem line, which names the file, its line, the place in it, and what to do.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { interactive } from "../runtime/interactive/plugin.ts";
import { edit, interactiveApp } from "./interactive-app.ts";

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
    "src/playthroughs/: no playthrough; write at least one, <name>.yaml: a seed, and steps of keys with the state or announcement expected after them (https://lernapps.net/tooling/schemas/playthrough.v1.schema.json)",
  ],
  [
    "a playthrough of a route the app does not have",
    (root) => edit(root, PLAY, "route: grundreihe", "route: untere-reihe"),
    "src/playthroughs/grundreihe.yaml:4: route: untere-reihe is not a route of src/app.yaml; use one of grundreihe, obere-reihe",
  ],
  [
    "a step that expects nothing",
    (root) => edit(root, PLAY, "    state: { index: 1, score: 1, misses: 1 }\n    announce: Falsch. Tippe a.\n", ""),
    "src/playthroughs/grundreihe.yaml:10: steps[1]: expects nothing; give the state expected after the keys (state), the announcement (announce), or both",
  ],
  [
    "a core without step",
    (root) => edit(root, CORE, "export function step(", "function step("),
    "src/core/index.ts: exports no step; the core exports start(seed, route) and step(state, key), and tick(state, dt) when the app moves on its own (interactive-core-contract)",
  ],
  [
    "a route the core cannot start",
    (root) => edit(root, "data/lessons.json", '"obere-reihe"', '"oben"'),
    'src/app.yaml:19: routes[1].id: start(1, "obere-reihe") throws: no lesson obere-reihe in src/data/lessons.json; the core starts every route (interactive-core-contract)',
  ],
  [
    "a core that throws on a key",
    (root) =>
      edit(
        root,
        CORE,
        "  if (key.length !== 1) return state;",
        '  if (key === "x") throw new Error("no x");\n  if (key.length !== 1) return state;',
      ),
    'src/playthroughs/grundreihe.yaml:10: steps[1].keys[0]: step(state, "x") throws: no x (interactive-core-contract)',
  ],
  [
    "a core that draws from Math.random",
    (root) => edit(root, CORE, "const next = random(seed);", "const next = Math.random;"),
    "src/playthroughs/grundreihe.yaml:7: steps[0]: the state differs between two plays of the same keys; the core gives the same state for the same seed, route and keys, so draw from the seed, never from Math.random or the clock (interactive-core-contract)",
  ],
  [
    "a playthrough whose state does not match",
    (root) => edit(root, PLAY, "state: { index: 2, score: 2 }", "state: { index: 2, score: 3 }"),
    'src/playthroughs/grundreihe.yaml:14: steps[2].state.score: score is 2 after the keys "j", "x", "A", the playthrough expects 3 (interactive-playthroughs-pass)',
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
    "src/ui/App.vue:14:6: fetch: a component makes no network request; give it what it needs through its props (vue-component-no-network)",
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
    "src/core/index.ts:49:27: window outside onMounted; the build renders the component where there is no window, so use it only inside onMounted (vue-component-browser-globals)",
  ],
  [
    "an app whose own code is beyond the budget",
    (root) => {
      // 200 kB that gzip cannot shrink much
      let seed = 1;
      const letters = Array.from({ length: 200_000 }, () => {
        seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
        return String.fromCharCode(97 + ((seed >>> 24) % 26));
      }).join("");
      writeFileSync(join(root, "src/core/noise.ts"), `export const noise = { letters: ${JSON.stringify(letters)} };\n`);
      edit(root, CORE, 'with { type: "json" };', 'with { type: "json" };\nimport { noise } from "./noise.ts";');
      edit(
        root,
        CORE,
        "const lesson = lessonOf(route);",
        'const lesson = lessonOf(route === noise.letters ? "" : route);',
      );
    },
    "src/: 123.9 kB gzip of the app's own code, more than the budget of 100 kB; make it smaller: less code, data in a smaller form (interactive-size)",
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
