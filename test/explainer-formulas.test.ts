// The texts of an explainer's exercises: formulas $…$ in the texts of a quiz question (question, options, background,
// explanation), the sentence above a generated exercise's live task, and its worked tasks with JavaScript.
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { renderExercise } from "../runtime/explainer/exercises.ts";
import { formulaProblems, renderWithFormulas } from "../runtime/shared/text/markdown.ts";
import type { Exercise } from "../runtime/explainer/content.ts";
import { loadSite } from "../runtime/explainer/load.ts";
import { outline } from "../runtime/explainer/outline.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";

const question: Exercise = {
  type: "single-choice",
  id: "bilanz",
  text: "Welche Gleichung ist ausgeglichen? $\\ce{2H2 + O2 -> 2H2O}$",
  options: [
    { text: "$\\ce{H2 + O2 -> H2O}$", correct: false, info: "Rechts fehlt ein $\\ce{O}$." },
    { text: "$\\ce{2H2 + O2 -> 2H2O}$", correct: true, info: "" },
  ],
  explanation: "Vier $\\ce{H}$ auf beiden Seiten & zwei $\\ce{O}$.",
  links: [],
};

const generated: Exercise = {
  type: "generated",
  id: "summe",
  given: { a: { int: [1, 9] }, b: { int: [1, 9] } },
  where: ["a != b"],
  task: { text: "Was ist {{a}} + {{b}}?" },
  answer: { value: "a + b", compare: { number: { format: "integer" } } },
};

const data = (html: string): { texts: { practice: string }; showWorked: boolean } =>
  JSON.parse(
    /<script type="application\/json" class="explainer-exercise-data">(.*?)<\/script>/s.exec(html)?.[1] ?? "{}",
  );

describe("formulas in the texts of a question", () => {
  test("only $…$ is a formula; everything else stays text", () => {
    const html = renderWithFormulas("a < b & $x^2$ **nicht fett**");
    expect(html).toContain("<math");
    expect(html).toContain("a &lt; b &amp; ");
    expect(html).toContain("**nicht fett**");
    expect(renderWithFormulas("ein Preis in €")).toBe("ein Preis in €");
  });

  test("a formula outside the command list is a problem", () => {
    expect(formulaProblems("$x^2$")).toEqual([]);
    expect(formulaProblems("$\\foo{a}$")).toEqual([
      expect.stringContaining("\\foo is not in the formula command list"),
    ]);
  });

  test("the question, its options, their background and the explanation show the formulas as MathML", () => {
    const html = renderExercise(question, "de", {}, (href) => href);
    const body = html.split('<script type="application/json"')[0] ?? "";
    expect(body).not.toContain("$\\ce");
    expect(body.match(/<math/g)?.length).toBeGreaterThanOrEqual(8);
    expect(body).toContain("zwei ");
    expect(body).toContain("&amp; zwei");
  });

  test("the client gets the formula texts as HTML for its feedback", () => {
    const html = renderExercise(question, "de", {}, (href) => href);
    const json = JSON.parse(/class="explainer-exercise-data">(.*?)<\/script>/s.exec(html)?.[1] ?? "{}");
    expect(Object.keys(json.rendered)).toContain("Rechts fehlt ein $\\ce{O}$.");
    expect(json.rendered["Rechts fehlt ein $\\ce{O}$."]).toContain("<math");
  });
});

describe("a generated exercise", () => {
  test("says 'neue Aufgaben', not 'neue Zahlen', unless it says something of its own", () => {
    expect(data(renderExercise(generated, "de", {}, (href) => href)).texts.practice).toBe(
      "Übe selbst, mit immer neuen Aufgaben:",
    );
    const own = {
      ...generated,
      practice: { de: "Übe selbst, mit immer neuen Stoffen:", en: "Practise with new substances:" },
    };
    expect(data(renderExercise(own as Exercise, "de", {}, (href) => href)).texts.practice).toBe(
      "Übe selbst, mit immer neuen Stoffen:",
    );
    expect(data(renderExercise(own as Exercise, "en", {}, (href) => href)).texts.practice).toBe(
      "Practise with new substances:",
    );
  });

  test("shows its worked tasks with JavaScript only when it asks for them", () => {
    expect(data(renderExercise(generated, "de", {}, (href) => href)).showWorked).toBe(false);
    const always = { ...generated, workedTasks: "always" } as Exercise;
    expect(data(renderExercise(always, "de", {}, (href) => href)).showWorked).toBe(true);
  });
});

describe("the outline, which the end-to-end tests compare the page with", () => {
  test("counts as many formulas on a content page as the page renders, those in the texts of a question too", () => {
    const root = mkdtempSync(join(tmpdir(), "explainer-outline-"));
    cpSync(join(import.meta.dirname, "fixtures/explainer-all-blocks"), join(root, "src"), { recursive: true });
    const { pages } = outline(root);
    const site = loadSite(root, 0);
    let withQuestionFormulas = 0;
    for (const route of routes(site).filter((candidate) => candidate.page !== undefined)) {
      const item = (pages[route.lang] ?? []).find((candidate) => candidate.url === route.path);
      const main = /<main[\s\S]*<\/main>/.exec(renderPage(site, route).body)?.[0] ?? "";
      expect(item?.formulas, route.path).toBe(main.split("<math").length - 1);
      if (main.includes("explainer-exercise") && /1 % ist ein Hundertstel: <math/.test(main)) withQuestionFormulas++;
    }
    // the fixture has a question with formulas in its explanation: the case this test is about
    expect(withQuestionFormulas).toBeGreaterThan(0);
  });
});
