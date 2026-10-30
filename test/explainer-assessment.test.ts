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
  linkLines,
  pageResults,
  resultQuery,
  stepHint,
  type ItemResult,
} from "../runtime/explainer/assessment.ts";
import { assessmentTutorMarkdown, type AssessmentData } from "../runtime/explainer/assessment-page.ts";
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
      "/zahlen/zahlen-01/#prozent-rechnen",
      "/zahlen/zahlen-09/#prozent-rechnen",
      "src/zahlen/chapter.yaml:LINE: selfAssessment.pages[0].exercises[0]: /zahlen/zahlen-09/#prozent-rechnen names no page of the app; write /<chapter>/<page>/#<exercise>",
    ],
    [
      "an exercise the page does not have",
      "/zahlen/zahlen-01/#prozent-rechnen",
      "/zahlen/zahlen-01/#prozent-raten",
      "src/zahlen/chapter.yaml:LINE: selfAssessment.pages[0].exercises[0]: /zahlen/zahlen-01/#prozent-raten names no exercise of src/zahlen/zahlen-01.yaml; use the id of one of its exercises: generated, a question type, or an exercise component",
    ],
    [
      "a question listed twice",
      "/zahlen/zahlen-01/#prozent-rechnen",
      "/zahlen/zahlen-01/#prozent-von-200",
      "src/zahlen/chapter.yaml:12: selfAssessment.pages[0].exercises[1]: /zahlen/zahlen-01/#prozent-von-200 is listed twice, and a question shows the same task each time; list it once (a generated exercise or an exercise component may be listed again: each listing draws a task of its own)",
    ],
    [
      "an exercise of another chapter",
      "/zahlen/zahlen-01/#prozent-rechnen",
      "/formen/formen-01/#ecken",
      "src/zahlen/chapter.yaml:LINE: selfAssessment.pages[0].exercises[0]: /formen/formen-01/#ecken is not an exercise of the chapter zahlen; a chapter's self-assessment asks only its own pages; the app's is every chapter's together",
    ],
  ])("%s", (_name, from, to, line) => {
    const root = app();
    edit(root, "zahlen/chapter.yaml", from, to);
    const at = readFileSync(join(root, "src/zahlen/chapter.yaml"), "utf8")
      .split("\n")
      .findIndex((text) => text.includes(to));
    expect(problems(root)).toEqual([line.replace("LINE", String(at + 1))]);
  });

  test("a reference of another shape is a problem of the schema", () => {
    const root = app();
    edit(root, "zahlen/chapter.yaml", "/zahlen/zahlen-01/#prozent-rechnen", "zahlen-01#prozent-rechnen");
    expect(problems(root)).toEqual([
      "src/zahlen/chapter.yaml:11: selfAssessment.pages[0].exercises[0]: zahlen-01#prozent-rechnen is no exercise's address; write /<chapter>/<page>/#<exercise>",
    ]);
  });

  test("app.yaml has none: the app's is every chapter's", () => {
    const root = app();
    edit(root, "app.yaml", "chapters: [zahlen, formen]", "chapters: [zahlen, formen]\nselfAssessment: { pages: [] }");
    expect(problems(root)).toHaveLength(1);
    expect(problems(root)[0]).toMatch(/^src\/app\.yaml:\d+: /);
  });

  test("an exercise component can be in it, also twice; an app with one chapter has it in its chapter.yaml", () => {
    const root = mkdtempSync(join(tmpdir(), "explainer-assessment-"));
    cpSync(join(import.meta.dirname, "../explainer/src"), join(root, "src"), { recursive: true });
    expect(problems(root)).toEqual([]);
    edit(root, "prozent/chapter.yaml", "/prozent/prozentsatz/#welche-rechnung", "/prozent/prozentwert/#prozentfeld");
    expect(problems(root), "each listing draws a task of its own").toEqual([]);
    const site = loadSite(root, 0);
    // the app's is the chapter's: no page of its own for the chapter, whose page the app hides
    const [whole] = assessments(site);
    expect(assessments(site).map((assessment) => assessment.local)).toEqual(["einschaetzung/"]);
    expect(whole?.items.filter((item) => item.block.type === "vue-component").map((item) => item.key)).toEqual([
      "a2",
      "a3",
    ]);
    // its page: the component's island in a form of its own, no "Prüfen", and the islands module loads
    const route = routes(site).find((candidate) => candidate.kind === "assessment" && candidate.lang === "de");
    if (route === undefined) throw new Error("no self-assessment page");
    const page = renderPage(site, route);
    expect(page.islands).toBe(true);
    expect(page.body).toContain(
      '<div class="explainer-component" id="aufgabe-a2" data-component="ProzentFeld" data-exercise data-assessment data-seeds="[',
    );
    expect(page.body).not.toMatch(/id="aufgabe-a2"[\s\S]*?question-check[\s\S]*?id="aufgabe-a3"/);
    const data = JSON.parse(
      /<script type="application\/json" class="explainer-assessment-data">([\s\S]*?)<\/script>/.exec(page.body)?.[1] ??
        "{}",
    ) as AssessmentData;
    expect(data.items[1]?.data.kind).toBe("component");
    expect(data.items[1]?.exercise).toBe("prozentfeld");
  });

  test("a generated exercise may be listed again: each listing draws a task of its own", () => {
    const root = app();
    edit(root, "zahlen/chapter.yaml", "/zahlen/zahlen-01/#prozent-von-200", "/zahlen/zahlen-01/#prozent-rechnen");
    expect(problems(root)).toEqual([]);
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
      "zahlen/chapter.yaml",
      "        - /zahlen/zahlen-02/#hauptgruppe\n        - /zahlen/zahlen-02/#gerade-prozente",
      "        - /zahlen/zahlen-02/#hauptgruppe",
    );
    expect(stepHint(loadSite(root, 0))).toBe(
      "lernapps explainer: 1 page of a self-assessment shows fewer than 2 or more than 5 exercises: src/zahlen/chapter.yaml: selfAssessment.pages[1] (1)",
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

  test("the app's is every chapter's, in order; each chapter has its own; each in every language", () => {
    const pages = routes(site)
      .filter((route) => route.kind === "assessment")
      .map((route) => route.path);
    expect(pages).toEqual([
      "einschaetzung/",
      "zahlen/einschaetzung/",
      "formen/einschaetzung/",
      "en/einschaetzung/",
      "en/zahlen/einschaetzung/",
      "en/formen/einschaetzung/",
    ]);
    const [whole, zahlen, formen] = assessments(site);
    expect(whole?.items.map((item) => item.ref)).toEqual(
      [...(zahlen?.items ?? []), ...(formen?.items ?? [])].map((item) => item.ref),
    );
    expect(whole?.steps).toBe(3);
    expect(formen?.items.map((item) => item.key)).toEqual(["a1", "a2", "a3"]);
  });

  test("the start page and each chapter's page offer theirs, in a <template> until the client module runs", () => {
    expect(page("de", "")).toContain(
      '<section class="explainer-assessment-offer" aria-labelledby="selbsteinschaetzung" hidden data-key="self-assessment" data-storage="explainer">',
    );
    expect(page("de", "")).toContain('<a class="explainer-assessment-link" href="einschaetzung/"');
    expect(page("de", "formen/")).toContain('data-key="self-assessment:formen"');
    expect(page("de", "formen/")).toContain('href="../formen/einschaetzung/"');
    expect(page("de", "zahlen/")).toContain('data-key="self-assessment:zahlen"');
    expect(page("de", "zahlen/zahlen-01/")).not.toContain("explainer-assessment-offer");
    // every heading, button and exercise of it in a <template>: no page shows one without JavaScript
    // (explainer-readable-without-js)
    const outside = (body: string) =>
      body.replace(/<template class="explainer-assessment-template">[\s\S]*?<\/template>/g, "");
    for (const local of ["", "formen/", "einschaetzung/", "formen/einschaetzung/"]) {
      expect(outside(page("de", local)), local).not.toMatch(
        /explainer-assessment-(offer|step|item|result|intro)|id="(teil-\d+|ergebnis|selbsteinschaetzung)"/,
      );
    }
  });

  test("its page has one line without JavaScript and no check of a single exercise", () => {
    const html = page("de", "einschaetzung/");
    expect(html).toContain('<p class="explainer-assessment-nojs">Die Selbsteinschätzung braucht JavaScript.');
    // what it covers: the number of tasks, and each content page none of them asks, with its link
    expect(html).toContain(
      "<p>Mit dieser Selbsteinschätzung bekommst du mit 8 Aufgaben einen Überblick, was du schon kannst. Eine Seite fragt sie nicht ab.",
    );
    expect(html).toMatch(
      /<ul class="explainer-assessment-unasked">\n<li><a href="\.\.\/formen\/formen-02\/">[^<]+<\/a><\/li>\n<\/ul>/,
    );
    expect(page("de", "zahlen/einschaetzung/")).toContain("Sie fragt jede Seite ab.</p>");
    expect(page("de", "zahlen/einschaetzung/")).not.toContain("explainer-assessment-unasked");
    expect(page("en", "formen/einschaetzung/")).toContain("It does not ask about one page. So it is worth a look:");
    expect(page("en", "einschaetzung/")).toContain("With this self-assessment, 8 tasks give you an overview");
    expect(html.match(/class="explainer-assessment-step"/g)).toHaveLength(3);
    expect(html.match(/class="explainer-assessment-item"/g)).toHaveLength(8);
    // a question by its key: the same id may be on two pages
    expect(html).toContain('id="frage-a2"');
    expect(html).not.toContain('id="frage-prozent-von-200"');
    expect(html).not.toMatch(/<p class="question-actions">/);
    expect(page("de", "formen/einschaetzung/")).toContain(
      '<li><a href="../../formen/">Formen</a></li><li aria-current="page">Selbsteinschätzung</li>',
    );
  });

  test("its tutor page makes the tutor a guide: chapter by chapter, each with its pages and its self-assessment", () => {
    const [whole, zahlen, formen] = assessments(site);
    if (whole === undefined || zahlen === undefined || formen === undefined) throw new Error("three self-assessments");
    const markdown = assessmentTutorMarkdown(site, whole, "de");
    expect(markdown).toContain("Du bist sein Wegweiser");
    expect(markdown).toContain("Geh Kapitel für Kapitel vor");
    expect(markdown).toContain("„Zurück zum Tutor“");
    expect(markdown).toContain("Du bist Wegweiser, kein Lehrer");
    expect(markdown).toContain("Bilde keine Adresse selbst");
    expect(markdown).toContain(
      "### Kapitel „Zahlen“\n\n- Selbsteinschätzung des Kapitels\n- „Zahlen 1“ · Aufgaben A1, A2\n",
    );
    // a page none of whose exercises is asked; no link at all: the links come from the child's message
    expect(markdown).toContain("- „Formen 2“ · nicht abgefragt");
    // no link but the one back to the self-assessment for parents and teachers
    expect(markdown.match(/\]\(/g)).toHaveLength(1);
    expect(markdown).toContain("- A1: Übung prozent-rechnen der Seite „Zahlen 1“");
    // a question is the same task in every round: the tutor knows right may be remembered
    expect(markdown).toContain("- A2: Übung prozent-von-200 der Seite „Zahlen 1“ (immer dieselbe Aufgabe");
    expect(markdown).not.toContain("prozent-rechnen der Seite „Zahlen 1“ (immer");
    // a guide: no tables of solutions
    expect(markdown).not.toContain("```");
    // a chapter's names the pages of the other chapters without keys
    const chapter = assessmentTutorMarkdown(site, formen, "en");
    expect(chapter).toContain("the self-assessment of the chapter “Shapes”");
    expect(chapter).toContain("- “Shapes 1” · Tasks A1, A2, A3");
    expect(chapter).toContain("- “Numbers 1”\n");
  });
});

describe("a run in the browser", () => {
  const results: ItemResult[] = [
    { key: "a1", ref: "/z/a/#x", number: 17, state: "falsch", input: "120", mistake: 1 },
    { key: "a2", ref: "/z/a/#y", state: "richtig" },
    { key: "a3", ref: "/z/b/#z", number: 3, state: "offen" },
  ];

  test("a page is known with all of two or more right, partly with at least half, to read with less, not asked without one", () => {
    expect([bandOf(2, 2), bandOf(1, 2), bandOf(1, 3), bandOf(0, 1), bandOf(0, 0)]).toEqual([
      "known",
      "partly",
      "read",
      "read",
      "unasked",
    ]);
    // one task alone is too little to say a page is known
    expect(bandOf(1, 1)).toBe("partly");
    expect(pageResults(["z/a/", "z/b/", "z/c/"], { a1: "z/a/", a2: "z/a/", a3: "z/b/" }, results)).toEqual([
      { page: "z/a/", right: 1, partly: 0, total: 2, band: "partly" },
      { page: "z/b/", right: 0, partly: 0, total: 1, band: "read" },
      { page: "z/c/", right: 0, partly: 0, total: 0, band: "unasked" },
    ]);
  });

  test("the tutor page's query has each exercise: its task number, how it went, the mistake", () => {
    expect(resultQuery(results)).toBe("?a1=17-falsch-F1&a2=richtig&a3=3-offen");
    expect(resultQuery([])).toBe("");
  });

  test("a partly right task counts half: its page's band, its value in the query, its line in the prompt", () => {
    const partly = [
      { key: "a1", ref: "/z/a/#x", state: "teilweise" as const, input: "Der Sabbat ist ein Ruhetag.", missed: [2, 4] },
      { key: "a2", ref: "/z/a/#y", state: "falsch" as const },
      { key: "a3", ref: "/z/b/#z", state: "teilweise" as const },
      { key: "a4", ref: "/z/b/#w", state: "falsch" as const },
      { key: "a5", ref: "/z/b/#v", state: "falsch" as const },
    ];
    // half of one of two is not half the page; with one right it is: 1 + 0.5 of 2 and of 3
    expect([bandOf(0, 2, 1), bandOf(1, 2, 1), bandOf(1, 3, 1), bandOf(0, 3, 1), bandOf(1, 1, 0)]).toEqual([
      "read",
      "partly",
      "partly",
      "read",
      "partly",
    ]);
    expect(
      pageResults(["z/a/", "z/b/"], { a1: "z/a/", a2: "z/a/", a3: "z/b/", a4: "z/b/", a5: "z/b/" }, partly),
    ).toEqual([
      { page: "z/a/", right: 0, partly: 1, total: 2, band: "read" },
      { page: "z/b/", right: 0, partly: 1, total: 3, band: "read" },
    ]);
    expect(resultQuery(partly.slice(0, 1))).toBe("?a1=teilweise-P2P4");
    expect(isStoredResult({ version: 1, items: partly })).toBe(true);
    expect(
      isStoredResult({ version: 1, items: [{ key: "a1", ref: "/z/a/#x", state: "teilweise", missed: ["P2"] }] }),
    ).toBe(false);
    const lines = assessmentPrompt(
      "https://a.example/einschaetzung/tutor/",
      [{ key: "a1", page: "Feste", exercise: "x" }],
      partly.slice(0, 1),
      "de",
      [{ page: "z/a/", title: "Feste", right: 1, partly: 1, total: 3, band: "partly" }],
    ).split("\n");
    expect(lines.slice(1)).toEqual([
      "- „Feste“: Schau sie dir noch einmal an (1 von 3 richtig, 1 teilweise).",
      "Meine Aufgaben:",
      "- A1 (Feste, Übung x): teilweise richtig. Nicht erreicht: P2, P4. Eingabe: Der Sabbat ist ein Ruhetag.",
    ]);
  });

  test("the prompt names the tutor page first, then each page's result as the learner saw it, then a line per exercise", () => {
    const items = [
      { key: "a1", page: "Prozentwert", exercise: "x" },
      { key: "a2", page: "Prozentwert", exercise: "y" },
      { key: "a3", page: "Grundwert", exercise: "z" },
    ];
    expect(
      assessmentPrompt("https://a.example/einschaetzung/tutor/?a1=17-falsch-F1", items, results, "de", [
        { page: "z/a/", title: "Prozentwert", right: 1, partly: 0, total: 2, band: "partly" },
        { page: "z/b/", title: "Grundwert", right: 0, partly: 0, total: 1, band: "read" },
        { page: "z/c/", title: "Zinsen", right: 0, partly: 0, total: 0, band: "unasked" },
      ]),
    ).toBe(
      [
        "Lade https://a.example/einschaetzung/tutor/?a1=17-falsch-F1 und sei mein Tutor. Ich habe die Selbsteinschätzung gemacht. Mein Ergebnis je Seite:",
        "- „Prozentwert“: Schau sie dir noch einmal an (1 von 2 richtig).",
        "- „Grundwert“: Lies sie genau (0 von 1 richtig).",
        "- „Zinsen“: nicht abgefragt.",
        "Meine Aufgaben:",
        "- A1 (Prozentwert, Übung x, Nr. 17): falsch. Eingabe: 120",
        "- A2 (Prozentwert, Übung y): richtig.",
        "- A3 (Grundwert, Übung z, Nr. 3): nicht beantwortet.",
      ].join("\n"),
    );
  });

  test("back to a running chat, the lines start with the result and end with the tutor page", () => {
    const items = [
      { key: "a1", page: "Prozentwert", exercise: "x" },
      { key: "a2", page: "Prozentwert", exercise: "y" },
      { key: "a3", page: "Grundwert", exercise: "z" },
    ];
    const pages = [{ page: "z/a/", title: "Prozentwert", right: 1, partly: 0, total: 2, band: "partly" as const }];
    const lines = assessmentPrompt("https://a.example/einschaetzung/tutor/?a1=x", items, results, "de", pages, "back");
    expect(lines.split("\n")).toEqual([
      "Ich habe die Selbsteinschätzung gemacht. Mein Ergebnis je Seite:",
      "- „Prozentwert“: Schau sie dir noch einmal an (1 von 2 richtig).",
      "Meine Aufgaben:",
      "- A1 (Prozentwert, Übung x, Nr. 17): falsch. Eingabe: 120",
      "- A2 (Prozentwert, Übung y): richtig.",
      "- A3 (Grundwert, Übung z, Nr. 3): nicht beantwortet.",
      "Tutor-Seite: https://a.example/einschaetzung/tutor/?a1=x",
    ]);
  });

  test("the links a tutor gets: every chapter's self-assessment and page, full, with via=tutor", () => {
    const chapters = [
      {
        title: "Zahlen",
        assessment: "zahlen/einschaetzung/",
        pages: [{ title: "Zahlen 1", local: "zahlen/zahlen-01/" }],
      },
      { title: "Formen", pages: [{ title: "Formen 1", local: "formen/formen-01/" }] },
    ];
    expect(linkLines("https://lernapps.net/app/", chapters, "einschaetzung/", "de")).toEqual([
      "Links für meinen Tutor, genau diese nehmen:",
      "Kapitel „Zahlen“, Selbsteinschätzung: https://lernapps.net/app/zahlen/einschaetzung/?via=tutor",
      "- „Zahlen 1“: https://lernapps.net/app/zahlen/zahlen-01/?via=tutor",
      "Kapitel „Formen“ (keine Selbsteinschätzung):",
      "- „Formen 1“: https://lernapps.net/app/formen/formen-01/?via=tutor",
      "Selbsteinschätzung der ganzen App: https://lernapps.net/app/einschaetzung/?via=tutor",
    ]);
  });

  test("the device keeps a result of this shape only", () => {
    expect(isStoredResult({ version: 1, items: results })).toBe(true);
    expect(isStoredResult({ version: 2, items: results })).toBe(false);
    expect(isStoredResult({ version: 1, items: [{ key: "a1", state: "richtig" }] })).toBe(false);
    expect(isStoredResult({ version: 1, items: [{ key: "a1", ref: "/z/a/#x", state: "gut" }] })).toBe(false);
    expect(isStoredResult("a1=richtig")).toBe(false);
  });
});
