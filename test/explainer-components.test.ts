// The vue-component block, at build time only: each case breaks the history fixture (test/fixtures/explainer-history,
// with its component AssignLabels) in one way, and its build fails with exactly one problem line, which names the file
// and the place in it; and the property test of an exercise component's logic module.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { describedProblems, exampleProblems, propertyProblems } from "../runtime/explainer/components.ts";
import { TASK_NUMBERS } from "../runtime/explainer/tasks.ts";
import { explainer } from "../runtime/explainer/plugin.ts";

const FIXTURE = join(import.meta.dirname, "fixtures/explainer-history");

/** A copy of the fixture as an app: index.html, src/main.ts and the content in src/. */
function app(): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-components-"));
  cpSync(FIXTURE, join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "index.html"),
    `<!doctype html>\n<html lang="de">\n  <head>\n    <meta charset="utf-8" />\n    <script type="module" src="/src/main.ts"></script>\n  </head>\n  <body>\n    <!-- explainer -->\n  </body>\n</html>\n`,
  );
  writeFileSync(join(root, "src/main.ts"), `document.documentElement.dataset["js"] = "on";\n`);
  return root;
}

/** Replaces `from` by `to` in the app's file `file` (from src/); `from` must be there. */
function edit(root: string, file: string, from: string, to: string): void {
  const path = join(root, "src", file);
  const text = readFileSync(path, "utf8");
  if (!text.includes(from)) throw new Error(`${file} has no ${JSON.stringify(from)}`);
  writeFileSync(path, text.replace(from, to));
}

/** The problem lines of a build that fails while it reads the content; none when it gets past that. */
async function problems(root: string): Promise<string[]> {
  try {
    // write: false: the cases fail before anything is written, and the valid fixture's build is in explainer-build
    await build({
      root,
      base: "./",
      logLevel: "silent",
      configFile: false,
      plugins: [explainer()],
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

const VUE = "components/AssignLabels.vue";
const LOGIC = "components/AssignLabels.ts";

const cases: [string, (root: string) => void, string][] = [
  [
    "props that do not match the component's prop types",
    (root) => edit(root, "revolution/staende.yaml", "level: { de: Stufe, en: Level }", "level: 3"),
    "src/revolution/staende.yaml:59: blocks[0].blocks[3].props.level: AssignLabels declares level: string; give a text here (vue-component-props-valid)",
  ],
  [
    "a vue-component that is no exercise without nojs",
    (root) => {
      writeFileSync(
        join(root, "src/components/Note.vue"),
        `<script setup lang="ts">\ndefineProps<{ text: string }>();\n</script>\n\n<template>\n  <p>{{ text }}</p>\n</template>\n`,
      );
      writeFileSync(
        join(root, "src/components/Note.test.ts"),
        `import { test } from "vite-plus/test";\ntest("notes", () => {});\n`,
      );
      edit(
        root,
        "revolution/staende.yaml",
        "      - type: vue-component\n        component: AssignLabels\n",
        "      - type: vue-component\n        component: Note\n        props: { text: { de: Hallo, en: Hello } }\n      - type: vue-component\n        component: AssignLabels\n",
      );
    },
    "src/revolution/staende.yaml:50: blocks[0].blocks[3]: nojs is missing; a vue-component that is no exercise says in nojs, for readers without JavaScript, what it shows, and gives its content (vue-component-nojs)",
  ],
  [
    "an exercise component without the prop seed",
    (root) => edit(root, VUE, "  /** The task number, which the explainer gives. */\n  seed: number;\n", ""),
    'src/components/AssignLabels.vue: it emits answered, so it is an exercise, and declares no prop seed: number; the explainer gives an exercise component its task number as the prop seed, shows it as "Aufgabe Nr." with "Neue Aufgabe" and keeps it in the address, so declare seed: number and show the task generate(seed, props) (vue-component-exercise-contract)',
  ],
  [
    "a block that gives an exercise component its seed",
    (root) =>
      edit(
        root,
        "revolution/staende.yaml",
        "          level: { de: Stufe, en: Level }\n",
        "          level: { de: Stufe, en: Level }\n          seed: 3\n",
      ),
    "src/revolution/staende.yaml:60: blocks[0].blocks[3].props.seed: AssignLabels has no prop seed; its props are alt, question, level, button, parts (vue-component-props-valid)",
  ],
  [
    "a logic module without describe",
    (root) => edit(root, LOGIC, "export function describe(", "function describe("),
    "src/components/AssignLabels.ts: exports no describe; the logic module of an exercise component exports generate(seed, props), check(task, answer), solution(task), wrong(task), describe(task, props, lang) and about (vue-component-exercise-contract)",
  ],
  [
    "an about without a translation",
    (root) => edit(root, LOGIC, `    en: "It is right only when every level has its own label.",\n`, ""),
    "src/revolution/staende.yaml:50: blocks[0].blocks[3]: AssignLabels.ts: about.correct (en): the translation is missing (vue-component-exercise-contract)",
  ],
  [
    "a describe that throws in one language",
    (root) => edit(root, LOGIC, "?? GERMAN;\n", '?? GERMAN;\n  if (lang === "en") throw new Error("no English");\n'),
    'src/revolution/staende.yaml:50: blocks[0].blocks[3]: AssignLabels.ts: for seed 1 describe(task, props, "en") throws: no English (vue-component-exercise-contract)',
  ],
  [
    "a missing test file",
    (root) => rmSync(join(root, "src/components/AssignLabels.test.ts")),
    "src/components/AssignLabels.vue: its test file src/components/AssignLabels.test.ts is missing; every component has one (vue-component-tested)",
  ],
  [
    "an interactive component without its logic module",
    (root) => {
      writeFileSync(
        join(root, "src/components/Tap.vue"),
        `<script setup lang="ts">\ndefineProps<{ seed: number }>();\nconst emit = defineEmits<{ answered: [{ correct: boolean }] }>();\n</script>\n\n<template>\n  <button type="button" @click="emit('answered', { correct: true })">Tippen</button>\n</template>\n`,
      );
      writeFileSync(
        join(root, "src/components/Tap.test.ts"),
        `import { test } from "vite-plus/test";\ntest("taps", () => {});\n`,
      );
    },
    "src/components/Tap.vue: it emits answered, so it is an exercise, and its logic module src/components/Tap.ts is missing: export generate(seed, props), check(task, answer), solution(task), wrong(task), describe(task, props, lang) and about from it (vue-component-exercise-contract)",
  ],
  [
    "an exercise component that keeps its nojs text, with the solution, once it runs",
    (root) =>
      edit(root, VUE, "const emit = defineEmits", 'defineOptions({ nojs: "caption" });\nconst emit = defineEmits'),
    'src/components/AssignLabels.vue: it emits answered, so it is an exercise, and keeps its nojs text, which gives the task with its solution: an exercise replaces its nojs text, so the solution shows only after the answer; remove nojs: "caption" from defineOptions (vue-component-nojs)',
  ],
  [
    "an exercise component's block without examples",
    (root) =>
      edit(
        root,
        "revolution/staende.yaml",
        "        examples:\n          accepted:\n            - answer: [0, 1, 2]\n          rejected:\n            - answer: [2, 1, 0]\n            - answer: [0, 0, 2]\n",
        "",
      ),
    "src/revolution/staende.yaml:50: blocks[0].blocks[3]: examples is missing; an exercise component's block lists answers its check must accept (the other correct answers the text allows) and must reject (typical wrong ones), e.g. examples: { accepted: [{ answer: … }], rejected: [{ answer: … }] } (vue-component-exercise-contract)",
  ],
  [
    "an accepted example that the component's check rejects",
    (root) => edit(root, "revolution/staende.yaml", "- answer: [0, 1, 2]", "- answer: [1, 0, 2]"),
    "src/revolution/staende.yaml:70: blocks[0].blocks[3].examples.accepted[0]: AssignLabels.ts: for seed 1 check(task, answer) rejects [1,0,2], but it is listed as accepted; if the task's text allows it, fix check so that it accepts it, else move it to rejected (vue-component-exercise-contract)",
  ],
  [
    "a component that fetches",
    (root) =>
      edit(root, VUE, "  done.value = true;\n", '  done.value = true;\n  void fetch("https://example.org/log");\n'),
    "src/components/AssignLabels.vue:44:8: fetch: a component makes no network request; give it what it needs through its props (vue-component-no-network)",
  ],
  [
    "a component that imports another package",
    (root) => edit(root, VUE, 'from "vue";\n', 'from "vue";\nimport { shuffle } from "lodash-es";\n'),
    "src/components/AssignLabels.vue:6:1: an import from lodash-es; a component imports only from vue, @lernapps/app-templates, @lernapps/tooling/storage, @lernapps/tooling/i18n, @lernapps/tooling/a11y and its own folder (vue-component-imports)",
  ],
  [
    "a component that touches window outside onMounted",
    (root) =>
      edit(
        root,
        VUE,
        "const done = ref(false);\n",
        "const done = ref(false);\nconst wide = window.innerWidth > 600;\n",
      ),
    "src/components/AssignLabels.vue:29:14: window outside onMounted; the build renders the component where there is no window, so use it only inside onMounted (vue-component-browser-globals)",
  ],
];

describe("a broken component fails the build with its one line", () => {
  test.each(cases)(
    "%s",
    async (_name, breakIt, line) => {
      const root = app();
      breakIt(root);
      expect(await problems(root)).toEqual([line]);
    },
    30_000,
  );
});

describe("the property test of an exercise component's logic", () => {
  const props = { parts: ["a", "b", "c"] };
  test("a sound logic passes", async () => {
    const logic = await import("./fixtures/explainer-history/components/AssignLabels.ts");
    expect(propertyProblems(logic, props, 50)).toEqual([]);
  });

  test("a wrong answer that passes, a task that changes and a throw are each one problem", () => {
    let calls = 0;
    expect(
      propertyProblems({ generate: () => ({ n: 1 }), check: () => true, solution: () => 0, wrong: () => 1 }, props, 50),
    ).toEqual(["for seed 1 check(task, wrong(task)) is true; wrong(task) must give an answer that check rejects"]);
    expect(
      propertyProblems(
        { generate: () => ({ n: calls++ }), check: (_task, answer) => answer === 0, solution: () => 0, wrong: () => 1 },
        props,
        50,
      ),
    ).toEqual([
      "for seed 1 generate(seed, props) gives another task each time; it must give the same task for the same seed",
    ]);
    expect(
      propertyProblems(
        {
          generate: () => {
            throw new Error("no task");
          },
          check: () => true,
          solution: () => 0,
          wrong: () => 1,
        },
        props,
        50,
      ),
    ).toEqual(["for seed 1 generate(seed, props) throws: no task"]);
  });
});

describe("the examples of an exercise component's block", () => {
  const props = { parts: ["a", "b", "c"] };
  test("each runs through check, for its seed or for every seed", async () => {
    const logic = await import("./fixtures/explainer-history/components/AssignLabels.ts");
    expect(
      exampleProblems(logic, props, { accepted: [{ answer: [0, 1, 2] }], rejected: [{ answer: [2, 1, 0], seed: 3 }] }),
    ).toEqual([]);
    expect(exampleProblems(logic, props, { rejected: [{ answer: [0, 1, 2], seed: 7 }] })).toEqual([
      {
        kind: "rejected",
        index: 0,
        message:
          "for seed 7 check(task, answer) accepts [0,1,2], but it is listed as rejected; if the task's text rules it out, fix check so that it rejects it, else move it to accepted",
      },
    ]);
  });
});

describe("what an exercise component's logic describes", () => {
  const props = (lang: string) => ({
    parts: lang === "de" ? ["a", "b", "c"] : ["x", "y", "z"],
    question: lang === "de" ? "Welche?" : "Which?",
    level: lang === "de" ? "Stufe" : "Level",
  });
  test("about, and each task number's task and solution in each language", async () => {
    const logic = await import("./fixtures/explainer-history/components/AssignLabels.ts");
    const { description, problems } = describedProblems(logic, props, ["de", "en"]);
    expect(problems).toEqual([]);
    expect(description?.about).toBe(logic.about);
    expect(description?.tasks["de"]).toHaveLength(TASK_NUMBERS);
    expect(description?.tasks["en"]?.[0]).toEqual({
      seed: 1,
      ...logic.describe(logic.generate(1, props("en")), props("en"), "en"),
    });
    expect(description?.tasks["en"]?.[0]?.solution).toBe("Level 1: x; Level 2: y; Level 3: z");
  });

  test("a missing about, and a describe that gives what restricted Markdown does not allow", () => {
    const logic = { generate: () => ({}), check: () => true, solution: () => 0, wrong: () => 1 };
    expect(
      describedProblems({ ...logic, describe: () => ({ task: "# Aufgabe", solution: "1" }) }, props, ["de"]).problems,
    ).toEqual([
      "about is missing; export const about = { task, answer, correct, mistakes }: what the learner does, the answer's format, what counts as right, and the typical mistakes, each a text (a map by language when the app has more than one)",
      'for seed 1 the task of describe(task, props, "de"): a Markdown heading ("Aufgabe"); use a section block with the title "Aufgabe"',
    ]);
    const about = { task: "t", answer: "a", correct: "c", mistakes: [] };
    expect(describedProblems({ ...logic, about, describe: () => ({ task: "t" }) }, props, ["de"]).problems).toEqual([
      'for seed 1 describe(task, props, "de") is {"task":"t"}; describe returns { task, solution }: the task as the learner sees it and its solution, each a text in the page\'s language',
    ]);
  });
});
