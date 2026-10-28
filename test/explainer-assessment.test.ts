// The self-assessment of an explainer (assessment.ts): what the build checks of selfAssessment in app.yaml and a
// chapter.yaml, the pages it writes (the offer, the page of the self-assessment, its tutor page), and what the browser
// works out of a run: the band of each content page, the query of the tutor page, the prompt and what the device keeps.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import {
  assessmentPrompt,
  assessments,
  bandOf,
  isStoredResult,
  pageResults,
  resultQuery,
  stepHint,
  type ItemResult,
} from "../runtime/explainer/assessment.ts";
import { assessmentTutorMarkdown } from "../runtime/explainer/assessment-page.ts";
import { check, loadSite } from "../runtime/explainer/load.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";

const FIXTURE = join(import.meta.dirname, "fixtures/explainer-all-blocks");

/** A copy of the all-blocks fixture, with its two self-assessments: the app's and the chapter formen's. */
function app(): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-assessment-"));
  cpSync(FIXTURE, join(root, "src"), { recursive: true });
  return root;
}

/** Replaces `from` by `to` in the app's file `file` (from src/); `from` must be there. */
function edit(root: string, file: string, from: string, to: string): void {
  const path = join(root, "src", file);
  const text = readFileSync(path, "utf8");
  if (!text.includes(from)) throw new Error(`${file} has no ${JSON.stringify(from)}`);
  writeFileSync(path, text.replace(from, to));
}

/** The problems of the content of `root`, with a few seeds for the generated exercises. */
const problems = (root: string) => check(root, 5).problems;

describe("the build checks a self-assessment", () => {
  test("the fixture's two are valid", () => {
    expect(problems(app())).toEqual([]);
  });

  test.each([
    [
      "a page that does not exist",
      "app.yaml",
      "/zahlen/zahlen-01/#prozent-rechnen",
      "/zahlen/zahlen-09/#prozent-rechnen",
      "src/app.yaml:22: selfAssessment.pages[0].exercises[0]: /zahlen/zahlen-09/#prozent-rechnen names no page of the app; write /<chapter>/<page>/#<exercise>",
    ],
    [
      "an exercise the page does not have",
      "app.yaml",
      "/zahlen/zahlen-01/#prozent-rechnen",
      "/zahlen/zahlen-01/#prozent-raten",
      "src/app.yaml:22: selfAssessment.pages[0].exercises[0]: /zahlen/zahlen-01/#prozent-raten names no exercise of src/zahlen/zahlen-01.yaml; use the id of one of its exercises: generated, or a question type",
    ],
    [
      "an exercise listed twice",
      "app.yaml",
      "/zahlen/zahlen-01/#prozent-von-200",
      "/zahlen/zahlen-01/#prozent-rechnen",
      "src/app.yaml:23: selfAssessment.pages[0].exercises[1]: /zahlen/zahlen-01/#prozent-rechnen is listed twice; list each exercise once in the self-assessment",
    ],
    [
      "an exercise of another chapter in a chapter's",
      "formen/chapter.yaml",
      "[/formen/formen-01/#ecken,",
      "[/zahlen/zahlen-01/#prozent-rechnen,",
      "src/formen/chapter.yaml:10: selfAssessment.pages[0].exercises[0]: /zahlen/zahlen-01/#prozent-rechnen is not an exercise of the chapter formen; a chapter's self-assessment asks only its own pages, the app's (src/app.yaml) all of them",
    ],
  ])("%s", (_name, file, from, to, line) => {
    const root = app();
    edit(root, file, from, to);
    expect(problems(root)).toEqual([line]);
  });

  test("a reference of another shape is a problem of the schema", () => {
    const root = app();
    edit(root, "app.yaml", "/zahlen/zahlen-01/#prozent-rechnen", "zahlen-01#prozent-rechnen");
    expect(problems(root)).toHaveLength(1);
    expect(problems(root)).toEqual([
      "src/app.yaml:22: selfAssessment.pages[0].exercises[0]: zahlen-01#prozent-rechnen is no exercise's address; write /<chapter>/<page>/#<exercise>",
    ]);
  });

  test("an exercise component cannot be in it yet", () => {
    const root = mkdtempSync(join(tmpdir(), "explainer-assessment-"));
    cpSync(join(import.meta.dirname, "../explainer/src"), join(root, "src"), { recursive: true });
    edit(
      root,
      "app.yaml",
      "chapters: [prozent]",
      "chapters: [prozent]\nselfAssessment:\n  pages:\n    - exercises: [/prozent/prozentwert/#prozentfeld]",
    );
    expect(problems(root)).toEqual([
      "src/app.yaml:10: selfAssessment.pages[0].exercises[0]: /prozent/prozentwert/#prozentfeld is an exercise component, which a self-assessment cannot show yet; choose a generated exercise or a question",
    ]);
  });

  test("an app with one chapter has its self-assessment in app.yaml", () => {
    const root = mkdtempSync(join(tmpdir(), "explainer-assessment-"));
    cpSync(join(import.meta.dirname, "../explainer/src"), join(root, "src"), { recursive: true });
    edit(
      root,
      "prozent/chapter.yaml",
      "pages: [prozentwert, prozentsatz, grundwert]",
      "pages: [prozentwert, prozentsatz, grundwert]\nselfAssessment:\n  pages:\n    - exercises: [/prozent/prozentwert/#prozentwert-ueben]",
    );
    expect(problems(root)).toEqual([
      "src/prozent/chapter.yaml:6: selfAssessment: an app with one chapter has no page for the chapter; put the self-assessment into src/app.yaml",
    ]);
  });

  test("a page or chapter may not take the self-assessment's address", () => {
    const root = app();
    cpSync(join(root, "src/zahlen/zahlen-02.yaml"), join(root, "src/zahlen/einschaetzung.yaml"));
    expect(problems(root)).toContain(
      "src/zahlen/einschaetzung.yaml: einschaetzung is reserved for the chapter's self-assessment; rename the page",
    );
  });

  test("a page with fewer than two or more than five exercises gets a hint", () => {
    const site = loadSite(app(), 0);
    expect(stepHint(site)).toBeUndefined();
    const root = app();
    edit(
      root,
      "formen/chapter.yaml",
      "[/formen/formen-01/#formen-ordnen, /formen/formen-02/#formen-ecken]",
      "[/formen/formen-01/#formen-ordnen]",
    );
    expect(stepHint(loadSite(root, 0))).toBe(
      "lernapps explainer: 1 page of a self-assessment shows fewer than 2 or more than 5 exercises: formen/einschaetzung/ page 2 (1)",
    );
  });
});

describe("the pages of a self-assessment", () => {
  const site = loadSite(app(), 0);
  const page = (lang: string, local: string) => {
    const route = routes(site).find((candidate) => candidate.lang === lang && candidate.local === local);
    if (route === undefined) throw new Error(`no page ${local} in ${lang}`);
    return renderPage(site, route).body;
  };

  test("each has its page in each language, the app's and the chapter's", () => {
    const pages = routes(site)
      .filter((route) => route.kind === "assessment")
      .map((route) => route.path);
    expect(pages).toEqual(["einschaetzung/", "formen/einschaetzung/", "en/einschaetzung/", "en/formen/einschaetzung/"]);
  });

  test("the start page and the chapter's page offer it, hidden until the client module runs; no other page does", () => {
    expect(page("de", "")).toContain(
      '<section class="explainer-assessment-offer" aria-labelledby="selbsteinschaetzung" hidden data-key="self-assessment" data-storage="explainer">',
    );
    expect(page("de", "")).toContain('<a class="explainer-assessment-link" href="einschaetzung/"');
    expect(page("de", "formen/")).toContain('data-key="self-assessment:formen"');
    expect(page("de", "formen/")).toContain('href="../formen/einschaetzung/"');
    expect(page("de", "zahlen/")).not.toContain("explainer-assessment-offer");
    expect(page("de", "zahlen/zahlen-01/")).not.toContain("explainer-assessment-offer");
  });

  test("its page is hidden without JavaScript but for one line, and has no check of a single exercise", () => {
    const html = page("de", "einschaetzung/");
    expect(html).toContain('<p class="explainer-assessment-nojs">Die Selbsteinschätzung braucht JavaScript.');
    expect(html).toContain('<div class="explainer-assessment" hidden>');
    // every heading, button and exercise of it in a <template>: no page shows one without JavaScript
    // (explainer-readable-without-js)
    const outside = (body: string) =>
      body.replace(/<template class="explainer-assessment-template">[\s\S]*?<\/template>/g, "");
    expect(outside(html)).not.toMatch(/explainer-assessment-(step|item|result|intro)|<h2/);
    expect(outside(page("de", ""))).not.toContain("explainer-assessment-offer");
    expect(outside(page("de", "formen/"))).not.toContain("explainer-assessment-offer");
    expect(html.match(/class="explainer-assessment-step"/g)).toHaveLength(2);
    expect(html.match(/class="explainer-assessment-item"/g)).toHaveLength(6);
    // a question by its key: the same id may be on two pages
    expect(html).toContain('id="frage-a2"');
    expect(html).not.toContain('id="frage-prozent-von-200"');
    // "Prüfen" stays hidden: the client module never shows it
    expect(html).not.toMatch(/<p class="question-actions">/);
    // the breadcrumbs of a chapter's
    expect(page("de", "formen/einschaetzung/")).toContain(
      '<li><a href="../../formen/">Formen</a></li><li aria-current="page">Selbsteinschätzung</li>',
    );
  });

  test("its tutor page names the pages in order, the exercises asked of each and each exercise with its table", () => {
    const [app_, formen] = assessments(site);
    if (app_ === undefined || formen === undefined) throw new Error("two self-assessments");
    const markdown = assessmentTutorMarkdown(site, app_, "de");
    expect(markdown).toContain("Selbsteinschätzung der ganzen App gemacht: 6 Aufgaben");
    expect(markdown).toContain(
      "- „Zahlen 1“: [Seite](../../zahlen/zahlen-01/?von=tutor) · [Tutor-Seite](../../zahlen/zahlen-01/tutor/) · Aufgaben A1, A2",
    );
    expect(markdown).toContain("- „Formen 2“: [Seite](../../formen/formen-02/?von=tutor)");
    expect(markdown).toMatch(/Formen 2.*· nicht abgefragt/);
    expect(markdown).toContain("### A1: Übung prozent-rechnen der Seite „Zahlen 1“");
    expect(markdown).toContain(
      "- Link zu Nummer n: `../../zahlen/zahlen-01/?prozent-rechnen=n&von=tutor#prozent-rechnen`",
    );
    expect(markdown).toContain("ohne `einschaetzung/tutor/` und ohne `?…`");
    const chapter = assessmentTutorMarkdown(site, formen, "en");
    expect(chapter).toContain("the self-assessment of the chapter “Shapes”");
    expect(chapter).toContain("[Page](../../../formen/formen-01/?von=tutor)");
  });
});

describe("a run in the browser", () => {
  const results: ItemResult[] = [
    { key: "a1", ref: "/z/a/#x", number: 17, state: "falsch", input: "120", mistake: 1 },
    { key: "a2", ref: "/z/a/#y", state: "richtig" },
    { key: "a3", ref: "/z/b/#z", number: 3, state: "offen" },
  ];

  test("a page is known with all right, partly with at least half, to read with less, not asked without one", () => {
    expect([bandOf(2, 2), bandOf(1, 2), bandOf(1, 3), bandOf(0, 1), bandOf(0, 0)]).toEqual([
      "known",
      "partly",
      "read",
      "read",
      "unasked",
    ]);
    expect(pageResults(["z/a/", "z/b/", "z/c/"], { a1: "z/a/", a2: "z/a/", a3: "z/b/" }, results)).toEqual([
      { page: "z/a/", right: 1, total: 2, band: "partly" },
      { page: "z/b/", right: 0, total: 1, band: "read" },
      { page: "z/c/", right: 0, total: 0, band: "unasked" },
    ]);
  });

  test("the tutor page's query has each exercise: its task number, how it went, the mistake", () => {
    expect(resultQuery(results)).toBe("?a1=17-falsch-F1&a2=richtig&a3=3-offen");
    expect(resultQuery([])).toBe("");
  });

  test("the prompt names the tutor page first, then a line per exercise with the input of a wrong one", () => {
    const items = [
      { key: "a1", page: "Prozentwert", exercise: "x" },
      { key: "a2", page: "Prozentwert", exercise: "y" },
      { key: "a3", page: "Grundwert", exercise: "z" },
    ];
    expect(assessmentPrompt("https://a.example/einschaetzung/tutor/?a1=17-falsch-F1", items, results, "de")).toBe(
      [
        "Lade https://a.example/einschaetzung/tutor/?a1=17-falsch-F1 und sei mein Tutor. Ich habe die Selbsteinschätzung gemacht:",
        "- A1 (Prozentwert, Übung x, Nr. 17): falsch. Eingabe: 120",
        "- A2 (Prozentwert, Übung y): richtig.",
        "- A3 (Grundwert, Übung z, Nr. 3): nicht beantwortet.",
      ].join("\n"),
    );
  });

  test("the device keeps a result of this shape only", () => {
    expect(isStoredResult({ version: 1, items: results })).toBe(true);
    expect(isStoredResult({ version: 2, items: results })).toBe(false);
    expect(isStoredResult({ version: 1, items: [{ key: "a1", state: "richtig" }] })).toBe(false);
    expect(isStoredResult({ version: 1, items: [{ key: "a1", ref: "/z/a/#x", state: "gut" }] })).toBe(false);
    expect(isStoredResult("a1=richtig")).toBe(false);
  });
});
