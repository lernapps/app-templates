// The self-test block of an explainer (selftest.ts) on a recap page: allowed where an exercise is not, no exercise; the
// page as the build writes it (question, option buttons hidden until the client module runs, the answer folded with
// every reason, no radio group); the component Kurztest of the mathe-explainers as the same block when the app has no
// such component; exactly one right option.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { check, loadSite } from "../runtime/explainer/load.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";
import { kurztestAsSelfTest } from "../runtime/explainer/selftest.ts";
import type { Block } from "../runtime/explainer/content.ts";

const TITLE = "title: { de: Kaputt, en: Broken }";

/** The valid fixture in format 2 (strand mathematik/stochastik) with a recap page as the chapter's last page. */
function withRecap(blockLines: string[], languages = "de, en"): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-selftest-"));
  cpSync(join(import.meta.dirname, "fixtures/explainer-broken"), join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "index.html"),
    `<!doctype html>\n<html lang="de">\n  <head>\n    <meta charset="utf-8" />\n    <script type="module" src="/src/main.ts"></script>\n  </head>\n  <body>\n    <!-- explainer -->\n  </body>\n</html>\n`,
  );
  writeFileSync(join(root, "src/main.ts"), `document.documentElement.dataset["js"] = "on";\n`);
  const edit = (file: string, from: string, to: string) => {
    const path = join(root, "src", file);
    const text = readFileSync(path, "utf8");
    if (!text.includes(from)) throw new Error(`${file} has no ${JSON.stringify(from)}`);
    writeFileSync(path, text.replace(from, to));
  };
  if (languages === "de") edit("app.yaml", "languages: [de, en]", "languages: [de]");
  edit("app.yaml", TITLE, `format: 2\nstrand: mathematik/stochastik\n${TITLE}`);
  edit("kapitel/eins.yaml", "title: { de: Eins, en: One }", "title: { de: Eins, en: One }\ncompetencies: [laplace]");
  edit(
    "kapitel/zwei.yaml",
    "title: { de: Zwei, en: Two }",
    "title: { de: Zwei, en: Two }\ncompetencies: [laplace, baumdiagramm]",
  );
  writeFileSync(
    join(root, "src/kapitel/wdh.yaml"),
    [
      "title: { de: Gewichtskraft – kurz wiederholt, en: Weight – a short recap }",
      "recap: physik/gewichtskraft-berechnen",
      "blocks:",
      "  - type: section",
      "    id: gewichtskraft",
      "    title: { de: Gewichtskraft, en: Weight }",
      "    blocks:",
      ...blockLines.map((line) => `      ${line}`),
      "",
    ].join("\n"),
  );
  edit("kapitel/chapter.yaml", "pages: [eins, zwei]", "pages: [eins, zwei, wdh]");
  return root;
}

const SELF_TEST = [
  "- type: self-test",
  "  question: { de: Welche Einheit hat die Gewichtskraft?, en: Which unit has weight? }",
  "  options:",
  "    - { text: { de: Newton, en: Newton }, correct: true, info: { de: Kräfte misst man in Newton., en: Forces are measured in newtons. } }",
  "    - { text: { de: Kilogramm, en: Kilogram }, correct: false, info: { de: Kilogramm ist die Einheit der Masse., en: The kilogram is the unit of mass. } }",
];

const KURZTEST = [
  "- type: vue-component",
  "  component: Kurztest",
  "  props:",
  "    question: { de: Welche Einheit hat die Gewichtskraft?, en: Which unit has weight? }",
  "    options:",
  "      - { text: { de: Newton, en: Newton }, correct: true, info: { de: Kräfte misst man in Newton., en: Forces are measured in newtons. } }",
  "      - { text: { de: Kilogramm, en: Kilogram }, correct: false, info: { de: Kilogramm ist die Einheit der Masse., en: The kilogram is the unit of mass. } }",
  "    right: { de: Richtig., en: Right. }",
  "    wrong: { de: Nicht richtig., en: Not right. }",
  "  nojs: |",
  "    Kurztest: Welche Einheit hat die Gewichtskraft? Newton oder Kilogramm. Antwort: Newton.",
];

const problemsOf = (blockLines: string[], languages?: string) => check(withRecap(blockLines, languages), 5).problems;

/** The recap page as the build writes it. */
function page(blockLines: string[], languages?: string): string {
  const site = loadSite(withRecap(blockLines, languages), 0);
  const route = routes(site).find((candidate) => candidate.lang === "de" && candidate.path === "kapitel/wdh/");
  if (route === undefined) throw new Error("no recap page");
  return renderPage(site, route).body;
}

describe("a self-test on a recap page", () => {
  test("is allowed where an exercise is not", () => {
    expect(problemsOf(SELF_TEST)).toEqual([]);
  });

  test("shows the question, the option buttons and the folded answer with every reason", () => {
    const html = page(SELF_TEST);
    expect(html).toContain('<p class="explainer-selftest-label">Kannst du das?</p>');
    expect(html).toContain("Welche Einheit hat die Gewichtskraft?");
    expect(html).toContain('<button type="button" class="explainer-selftest-pick" hidden>Newton</button>');
    expect(html).toContain('<details class="explainer-selftest-answer"><summary>Antwort anzeigen</summary>');
    expect(html).toContain("Newton</strong> (richtig):");
    expect(html).toContain("Kilogramm</strong> (nicht richtig):");
    expect(html).toContain("Kilogramm ist die Einheit der Masse.");
    // buttons, not a radio group: the arrow keys do not answer on their way through
    expect(html).not.toContain('type="radio"');
  });

  test("a vue-component Kurztest, the app having no such component, is the same block", () => {
    expect(problemsOf(KURZTEST)).toEqual([]);
    const html = page(KURZTEST);
    expect(html).toContain("explainer-selftest-pick");
    expect(html).toContain("Newton</strong> (richtig):");
    expect(html).not.toContain("explainer-island");
  });

  test("needs exactly one right option; for a Kurztest the problem is where its props are", () => {
    const two = SELF_TEST.map((line) => line.replace("correct: false", "correct: true"));
    expect(problemsOf(two)).toHaveLength(1);
    expect(problemsOf(two)).toEqual([
      expect.stringContaining("2 options are correct: true; a self-test has exactly one right option"),
    ]);
    const none = KURZTEST.map((line) => line.replace("correct: true", "correct: false"));
    expect(problemsOf(none)).toEqual([expect.stringContaining("no option is correct: true")]);
  });

  test("a Kurztest with props of another shape stays a component, which the app does not have", () => {
    const broken = KURZTEST.filter((line) => !line.includes("question:"));
    expect(problemsOf(broken).join("\n")).toContain("Kurztest");
  });
});

describe("kurztestAsSelfTest", () => {
  const kurztest: Block = {
    type: "vue-component",
    component: "Kurztest",
    props: {
      question: "Frage?",
      options: [
        { text: "a", correct: true, info: "weil" },
        { text: "b", correct: false, info: "nein" },
      ],
    },
    nojs: "Text",
  };

  test("turns it into the block inside a section too, and keeps a component of the app", () => {
    const [section] = kurztestAsSelfTest([{ type: "section", id: "s", title: "S", blocks: [kurztest] }], false);
    expect(section).toMatchObject({ blocks: [{ type: "self-test", question: "Frage?", viaComponent: true }] });
    expect(kurztestAsSelfTest([kurztest], true)).toEqual([kurztest]);
  });
});
