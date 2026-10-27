// The vue-component block, at build time only: each case breaks the history fixture (test/fixtures/explainer-history,
// with its component AssignLabels) in one way, and its build fails with exactly one problem line, which names the file
// and the place in it; and the property test of an exercise component's logic module.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { describedProblems, exampleProblems, propertyProblems } from "../runtime/explainer/components/exercise.ts";
import { explainer } from "../runtime/explainer/plugin.ts";
import { withData } from "../runtime/explainer/components/props.ts";
import type { ComponentInfo } from "../runtime/explainer/content.ts";

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

/** Adds the component Dates, which lists the titles of events, and a block of it with `props` to the history page. */
function withDates(root: string, declared: string, props: string): void {
  writeFileSync(
    join(root, "src/components/Dates.vue"),
    `<script setup lang="ts">\ndefineProps<{ events: { ${declared} }[] }>();\n</script>\n\n<template>\n  <ul>\n    <li v-for="(event, index) in events" :key="index">{{ event.title }}</li>\n  </ul>\n</template>\n`,
  );
  writeFileSync(
    join(root, "src/components/Dates.test.ts"),
    `import { test } from "vite-plus/test";\ntest("dates", () => {});\n`,
  );
  edit(
    root,
    "revolution/staende.yaml",
    "      - type: vue-component\n        component: AssignLabels\n",
    `      - type: vue-component\n        component: Dates\n        props: { events: ${props} }\n        nojs: { de: Die Ereignisse als Liste., en: The events as a list. }\n      - type: vue-component\n        component: AssignLabels\n`,
  );
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
    'src/components/AssignLabels.vue: it emits answer, so it is an exercise, and declares no prop seed: number; the explainer gives an exercise component the seed of its task number as the prop seed, shows it as "Aufgabe Nr." with "Neue Aufgabe" and keeps it in the address, so declare seed: number and show the task generate(seed, props) (vue-component-exercise-contract)',
  ],
  [
    "an exercise component that still emits answered",
    (root) => edit(root, VUE, "defineEmits<{ answer:", "defineEmits<{ answered: [{ correct: boolean }]; answer:"),
    `src/components/AssignLabels.vue: it emits answered, which the explainer no longer takes: an exercise component is the input of its task; emit answer with the learner's answer each time it changes, drop its own "Prüfen" and the call of check, and export reason(task, answer, props, lang) from its logic module, which gives the app's message for a wrong answer; the explainer draws "Prüfen", checks and gives the feedback (vue-component-exercise-contract)`,
  ],
  [
    "an exercise component whose prop checked is no boolean",
    (root) => edit(root, VUE, "  checked: boolean;\n", "  checked: string;\n"),
    "src/components/AssignLabels.vue: its prop checked is no boolean; the explainer gives an exercise component checked: true once it checked the answer the component has now, and false when the answer changes, so declare checked: boolean (vue-component-exercise-contract)",
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
    "src/revolution/staende.yaml:60: blocks[0].blocks[3].props.seed: AssignLabels has no prop seed; its props are alt, question, level, parts, reasons (vue-component-props-valid)",
  ],
  [
    "a logic module without describe",
    (root) => edit(root, LOGIC, "export function describe(", "function describe("),
    "src/components/AssignLabels.ts: exports no describe; the logic module of an exercise component exports generate(seed, props), check(task, answer), solution(task), wrong(task), reason(task, answer, props, lang), describe(task, props, lang) and about (vue-component-exercise-contract)",
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
    "a typical mistake whose answer check accepts",
    (root) => edit(root, LOGIC, "  return [[...right].reverse(),", "  return [right,"),
    "src/revolution/staende.yaml:50: blocks[0].blocks[3]: AssignLabels.ts: for seed 1 check(task, mistakes(task, props)[0]) is true; the answer of a typical mistake must be one that check rejects (vue-component-exercise-contract)",
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
        `<script setup lang="ts">\ndefineProps<{ seed: number }>();\nconst emit = defineEmits<{ answer: [number] }>();\n</script>\n\n<template>\n  <button type="button" @click="emit('answer', 1)">Tippen</button>\n</template>\n`,
      );
      writeFileSync(
        join(root, "src/components/Tap.test.ts"),
        `import { test } from "vite-plus/test";\ntest("taps", () => {});\n`,
      );
    },
    "src/components/Tap.vue: it emits answer, so it is an exercise, and its logic module src/components/Tap.ts is missing: export generate(seed, props), check(task, answer), solution(task), wrong(task), reason(task, answer, props, lang), describe(task, props, lang) and about from it (vue-component-exercise-contract)",
  ],
  [
    "an exercise component that keeps its nojs text, with the solution, once it runs",
    (root) =>
      edit(root, VUE, "const emit = defineEmits", 'defineOptions({ nojs: "caption" });\nconst emit = defineEmits'),
    'src/components/AssignLabels.vue: it emits answer, so it is an exercise, and keeps its nojs text, which gives the task with its solution: an exercise replaces its nojs text, so the solution shows only after the answer; remove nojs: "caption" from defineOptions (vue-component-nojs)',
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
    "src/revolution/staende.yaml:74: blocks[0].blocks[3].examples.accepted[0]: AssignLabels.ts: for seed 1 check(task, answer) rejects [1,0,2], but it is listed as accepted; if the task's text allows it, fix check so that it accepts it, else move it to rejected (vue-component-exercise-contract)",
  ],
  [
    "a component that fetches",
    (root) =>
      edit(
        root,
        VUE,
        "// an answer once a level has a label\n",
        '// an answer once a level has a label\nvoid fetch("https://example.org/log");\n',
      ),
    "src/components/AssignLabels.vue:31:6: fetch: a component makes no network request; give it what it needs through its props (vue-component-no-network)",
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
        "// an answer once a level has a label\n",
        "// an answer once a level has a label\nconst wide = window.innerWidth > 600;\n",
      ),
    "src/components/AssignLabels.vue:31:14: window outside onMounted; the build renders the component where there is no window, so use it only inside onMounted (vue-component-browser-globals)",
  ],
  [
    "a list prop that names a data file that does not exist",
    (root) => withDates(root, "title: string", "{ data: gibtsnicht }"),
    "src/revolution/staende.yaml:52: blocks[0].blocks[3].props.events: src/data/gibtsnicht.yaml does not exist (vue-component-props-valid)",
  ],
  [
    "a data file with a text in a list that lacks a language",
    (root) => {
      writeFileSync(
        join(root, "src/data/profile.yaml"),
        "- title: { de: Eins, en: One }\n  uses:\n    - { de: Nur deutsch }\n",
      );
    },
    "src/data/profile.yaml:3: [0].uses[0] (en): the translation is missing",
  ],
  [
    "a list prop whose data file has records without a declared field",
    (root) => withDates(root, "title: string; ort: string", "{ data: ereignisse }"),
    "src/revolution/staende.yaml:52: blocks[0].blocks[3].props.events[0]: ort is missing; Dates declares ort: string (vue-component-props-valid)",
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

  test("a reason that gives no text for a wrong answer, or throws, is one problem", () => {
    const sound = { generate: () => ({ n: 1 }), check: (_task: unknown, answer: unknown) => answer === 0 };
    const answers = { solution: () => 0, wrong: () => 1 };
    expect(propertyProblems({ ...sound, ...answers, reason: () => 3 }, props, 50)).toEqual([
      `for seed 1 reason(task, wrong(task), props, "de") is 3; reason gives the app's message for a wrong answer as a text, or undefined for none`,
    ]);
    expect(
      propertyProblems(
        {
          ...sound,
          ...answers,
          reason: () => {
            throw new Error("no message");
          },
        },
        props,
        50,
      ),
    ).toEqual([`for seed 1 reason(task, wrong(task), props, "de") throws: no message`]);
    expect(propertyProblems({ ...sound, ...answers, reason: () => undefined }, props, 50)).toEqual([]);
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
    // three labels in any order but their own: five distinct tasks, numbered 1 to 5
    expect(description?.seeds).toHaveLength(5);
    expect(description?.tasks["de"]).toHaveLength(5);
    expect(description?.tasks["en"]?.[0]).toEqual({
      number: 1,
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

describe("the table of tasks an exercise component declares for a tutor", () => {
  const props = (lang: string) => ({
    parts: lang === "de" ? ["a", "b", "c"] : ["x", "y", "z"],
    question: lang === "de" ? "Welche?" : "Which?",
    level: lang === "de" ? "Stufe" : "Level",
  });
  const load = () => import("./fixtures/explainer-history/components/AssignLabels.ts");

  test("its task once with a placeholder, and each number's inputs, solution and mistakes, in each language", async () => {
    const logic = await load();
    const { description, problems } = describedProblems(logic, props, ["de", "en"]);
    expect(problems).toEqual([]);
    const de = description?.exercise?.["de"];
    expect(de?.template).toBe(
      "Welche? Die Stufen, von oben nach unten: Stufe 1, Stufe 2, Stufe 3. Zur Wahl stehen, in dieser Reihenfolge: {Wahl}.",
    );
    expect(de?.inputs).toEqual(["Wahl"]);
    expect(de?.tasks).toHaveLength(5);
    const task = logic.generate(1, props("de"));
    expect(de?.tasks[0]).toEqual({
      inputs: [task.order.map((label) => ["a", "b", "c"][label]).join("; ")],
      solution: "Stufe 1: a; Stufe 2: b; Stufe 3: c",
      mistakes: ["Stufe 1: c; Stufe 2: b; Stufe 3: a", "Stufe 1: a; Stufe 2: a; Stufe 3: c"],
    });
    expect(description?.exercise?.["en"]?.inputs).toEqual(["choices"]);
    expect(description?.exercise?.["en"]?.tasks[0]?.solution).toBe("Level 1: x; Level 2: y; Level 3: z");
  });

  test("without its exports: no table, and no problem", async () => {
    const { template: _t, params: _p, mistakes: _m, show: _s, ...logic } = await load();
    const { description, problems } = describedProblems(logic, props, ["de", "en"]);
    expect(problems).toEqual([]);
    expect(description?.exercise).toBeUndefined();
  });

  test.each<[string, (logic: Record<string, unknown>) => Record<string, unknown>, string]>([
    [
      "only some of its exports",
      ({ show: _s, mistakes: _m, ...logic }) => logic,
      "exports template and params but not mistakes and show; for a tutor's table of tasks export all four: template(props, lang), params(task, props, lang), mistakes(task, props) and show(answer, task, props, lang)",
    ],
    [
      "a placeholder that params does not give",
      (logic) => ({ ...logic, template: () => "Ordne {Wahl} nach {Zeit}." }),
      'template(props, "de") has the placeholder {Zeit}, which params(task, props, "de") does not give; its names are Wahl',
    ],
    [
      "other names for another task",
      (logic) => ({
        ...logic,
        params: (task: { order: number[] }) => (task.order[0] === 0 ? { Wahl: "a" } : { Wahl: "b", Rest: 1 }),
      }),
      'for seed 10 params(task, props, "de") gives the names Wahl, and for seed 1 Wahl, Rest; give the same names for every task',
    ],
    [
      "an empty input",
      (logic) => ({ ...logic, params: () => ({ Wahl: " " }) }),
      'for seed 1 params(task, props, "de").Wahl is " "; give each input as a number or a text that is not empty',
    ],
    [
      "a mistake that check accepts",
      (logic) => ({
        ...logic,
        mistakes: (task: { order: number[] }) => [task.order.map((_label, part) => part), undefined],
      }),
      "for seed 1 check(task, mistakes(task, props)[0]) is true; the answer of a typical mistake must be one that check rejects",
    ],
    [
      "fewer mistakes than about names",
      (logic) => ({ ...logic, mistakes: () => [[2, 1, 0]] }),
      "for seed 1 mistakes(task, props) gives 1 answer; give one for each of the 2 typical mistakes of about.mistakes, in order, undefined for one without a single answer",
    ],
    [
      "a show that gives no text",
      (logic) => ({ ...logic, show: () => "" }),
      'for seed 1 show(solution(task), task, props, "de") is ""; show gives an answer as text, as the learner gives it',
    ],
  ])("%s: its problem", async (_name, change, problem) => {
    const logic = change({ ...(await load()) }) as unknown as Parameters<typeof describedProblems>[0];
    const { description, problems } = describedProblems(logic, props, ["de", "en"]);
    expect(problems).toEqual([problem]);
    expect(description).toBeUndefined();
  });
});

describe("a list prop given as { data: <name> }", () => {
  const component = {
    name: "Dates",
    props: {
      events: {
        type: {
          kind: "array",
          of: {
            kind: "object",
            fields: { title: { type: { kind: "string" }, optional: false, source: "title: string" } },
          },
        },
        optional: false,
        source: "events: { title: string }[]",
      },
    },
  } as unknown as ComponentInfo;
  const files = {
    ereignisse: [
      { title: "Ballhausschwur", date: "1789-06-20" },
      { title: "Bastille", date: "1789-07-14" },
    ],
  };

  test("is the records of the file, cut to the fields the component declares", () => {
    expect(withData({ events: { data: "ereignisse" } }, component, files)).toEqual({
      props: { events: [{ title: "Ballhausschwur" }, { title: "Bastille" }] },
      problems: [],
    });
  });

  test("keeps the lists and records a declared field holds", () => {
    const nested = {
      name: "Dates",
      props: {
        events: {
          type: {
            kind: "array",
            of: {
              kind: "object",
              fields: {
                title: { type: { kind: "string" }, optional: false, source: "title: string" },
                uses: { type: { kind: "array", of: { kind: "string" } }, optional: false, source: "uses: string[]" },
              },
            },
          },
          optional: false,
          source: "events: { title: string; uses: string[] }[]",
        },
      },
    } as unknown as ComponentInfo;
    const rich = { ereignisse: [{ title: "Eins", date: "1789", uses: ["a", "b"] }] };
    expect(withData({ events: { data: "ereignisse" } }, nested, rich)).toEqual({
      props: { events: [{ title: "Eins", uses: ["a", "b"] }] },
      problems: [],
    });
  });

  test("leaves a list written out in the block as it is", () => {
    const props = { events: [{ title: "Eins" }] };
    expect(withData(props, component, files)).toEqual({ props, problems: [] });
  });

  test("builds, for a data file whose records have the declared fields", async () => {
    const root = app();
    withDates(root, "title: string", "{ data: ereignisse }");
    expect(await problems(root)).toEqual([]);
  }, 30_000);

  test("reads a record of texts as a record, not as a text by language: its fields are no languages", async () => {
    const root = app();
    writeFileSync(join(root, "src/data/orte.yaml"), "- { name: Paris, land: Frankreich }\n");
    expect(await problems(root)).toEqual([]);
  }, 30_000);
});
