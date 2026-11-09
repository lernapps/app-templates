// The formats of an explainer's content. Format 1 (explainer.v1.schema.json) is an app.yaml without `format`, and
// stays as it was: no strand, no competencies, no page list. Format 2 (explainer.v2.schema.json, `format: 2`) places
// the app on the learning map of the catalog: src/app.yaml names the app's strand (<subject>/<strand>, or none) or,
// for a unit app across the strands of a subject, the subject; each page the competencies it practises (required with
// a strand or a subject, not allowed with none), and the build writes
// lernapps-pages.json at the root of the bundle, the list of the pages for the catalog. A recap page (recap:
// <subject>/<competency>) repeats a competency the app does not practise instead: no exercise, a notice with the link to the
// learning map at its top, marked in the contents, left out of the self-assessment. Each broken case fails with
// exactly one problem line.
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { check, ContentError, loadSite } from "../runtime/explainer/load.ts";
import { assessments } from "../runtime/explainer/assessment.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";
import { tutorPage } from "../runtime/explainer/tutorpage.ts";
import { explainer } from "../runtime/explainer/plugin.ts";
import { PAGE_LIST } from "../runtime/explainer/page-list.ts";
import { SCHEMA_FILES } from "../runtime/explainer/schema.ts";

const FIXTURE = join(import.meta.dirname, "fixtures/explainer-broken");

/** A copy of the valid fixture (format 1, two pages, German and English) as an app. */
function app(): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-format-"));
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

const TITLE = "title: { de: Kaputt, en: Broken }";

/** The fixture in format 2 with the strand `strand`; with a strand other than none each page names competencies. */
function v2(strand = "mathematik/stochastik"): string {
  const root = app();
  edit(root, "app.yaml", TITLE, `format: 2\nstrand: ${strand}\n${TITLE}`);
  if (strand !== "none") {
    edit(
      root,
      "kapitel/eins.yaml",
      "title: { de: Eins, en: One }",
      "title: { de: Eins, en: One }\ncompetencies: [laplace]",
    );
    edit(
      root,
      "kapitel/zwei.yaml",
      "title: { de: Zwei, en: Two }",
      "title: { de: Zwei, en: Two }\ncompetencies: [laplace, baumdiagramm]",
    );
  }
  return root;
}

/** The fixture in format 2 as a unit app: subject: franzoesisch instead of a strand, competencies on each page. */
function unit(): string {
  const root = v2();
  edit(root, "app.yaml", "strand: mathematik/stochastik", "subject: franzoesisch");
  return root;
}

/** A recap page, src/kapitel/wdh.yaml, the last of the chapter: repeats physik/gewichtskraft-berechnen. */
const RECAP = [
  "title: { de: Gewichtskraft – kurz wiederholt, en: Weight – a short recap }",
  "recap: physik/gewichtskraft-berechnen",
  "blocks:",
  "  - type: section",
  "    id: gewichtskraft",
  "    title: { de: Gewichtskraft, en: Weight }",
  "    blocks:",
  "      - type: text",
  "        text: { de: Die Gewichtskraft ist $F_G = m \\cdot g$., en: The weight is $F_G = m \\cdot g$. }",
  "",
].join("\n");

/** `root` with the recap page RECAP (or `page`) as the chapter's last page. */
function withRecap(root: string, page = RECAP): string {
  writeFileSync(join(root, "src/kapitel/wdh.yaml"), page);
  edit(root, "kapitel/chapter.yaml", "pages: [eins, zwei]", "pages: [eins, zwei, wdh]");
  return root;
}

/** The generated exercise of the fixture, as a block of a section of the recap page. */
const EXERCISE = [
  "      - type: generated",
  "        id: summe",
  "        given:",
  "          a: { int: [1, 9] }",
  "          b: { int: [1, 9] }",
  '        where: ["a != b"]',
  "        task:",
  '          text: { de: "Was ist {{a}} + {{b}}?", en: "What is {{a}} + {{b}}?" }',
  '        answer: { value: "a + b", compare: { number: { format: integer } } }',
  "",
].join("\n");

/** The problem lines of the content, with few seeds: the property tests are not what this file tests. */
const problemsOf = (root: string) => check(root, 5).problems;

describe("format 1: an app.yaml without format", () => {
  test("is valid as before, and is format 1", () => {
    const result = check(app(), 5);
    expect(result.problems).toEqual([]);
    expect(result.format).toBe(1);
    expect(result.site?.app.strand).toBeUndefined();
  });

  test("names the schema of format 1 when it is not valid", () => {
    const root = app();
    edit(root, "app.yaml", TITLE, `${TITLE}\nfoo: 1`);
    const result = check(root, 5);
    expect(new ContentError(result.problems, result.format).message).toContain(SCHEMA_FILES[1]);
  });

  test.each([
    [
      "a strand",
      (root: string) => edit(root, "app.yaml", TITLE, `strand: mathematik/stochastik\n${TITLE}`),
      "src/app.yaml:1: strand: strand is a field of format 2; add format: 2 to src/app.yaml, with the app's strand or subject",
    ],
    [
      "a subject",
      (root: string) => edit(root, "app.yaml", TITLE, `subject: franzoesisch\n${TITLE}`),
      "src/app.yaml:1: subject: subject is a field of format 2; add format: 2 to src/app.yaml, with the app's strand or subject",
    ],
    [
      "a page with competencies",
      (root: string) =>
        edit(
          root,
          "kapitel/eins.yaml",
          "title: { de: Eins, en: One }",
          "competencies: [laplace]\ntitle: { de: Eins, en: One }",
        ),
      "src/kapitel/eins.yaml:1: competencies: competencies is a field of format 2; add format: 2 and the app's strand or subject to src/app.yaml, or remove it",
    ],
  ])("has no %s", (_name, breakIt, line) => {
    const root = app();
    breakIt(root);
    expect(problemsOf(root)).toEqual([line]);
  });
});

describe("format 2: format: 2 and the strand in app.yaml, competencies on the pages", () => {
  test("is valid with a strand and competencies on every page", () => {
    const result = check(v2(), 5);
    expect(result.problems).toEqual([]);
    expect(result.format).toBe(2);
    expect(result.site?.app.strand).toBe("mathematik/stochastik");
    expect(result.site?.chapters[0]?.pages.map((page) => page.competencies)).toEqual([
      ["laplace"],
      ["laplace", "baumdiagramm"],
    ]);
  });

  test("is valid with strand none and no competencies", () => {
    expect(problemsOf(v2("none"))).toEqual([]);
  });

  test("is valid with a subject instead of a strand and competencies on every page: a unit app", () => {
    const result = check(unit(), 5);
    expect(result.problems).toEqual([]);
    expect(result.site?.app.subject).toBe("franzoesisch");
    expect(result.site?.app.strand).toBeUndefined();
  });

  test("needs competencies on every page with a subject", () => {
    const root = unit();
    edit(root, "kapitel/zwei.yaml", "competencies: [laplace, baumdiagramm]\n", "");
    expect(problemsOf(root)).toEqual([
      "src/kapitel/zwei.yaml:1: competencies is missing; src/app.yaml names the subject franzoesisch, so each page names the competencies of its subject that it practises, e.g. competencies: [laplace]; a page that only repeats a competency the app does not practise says recap: <subject>/<competency> instead",
    ]);
  });

  test("names the schema of format 2 when it is not valid", () => {
    const root = v2();
    edit(root, "app.yaml", "strand: mathematik/stochastik\n", "");
    const result = check(root, 5);
    expect(result.format).toBe(2);
    expect(new ContentError(result.problems, result.format).message).toContain(SCHEMA_FILES[2]);
  });

  const cases: [string, (root: string) => void, string][] = [
    [
      "a missing strand",
      (root) => edit(root, "app.yaml", "strand: mathematik/stochastik\n", ""),
      "src/app.yaml:1: strand or subject is missing; name either strand (one strand of the learning map, <subject>/<strand>, e.g. mathematik/stochastik, or none when the app is on no strand) or subject (a unit app across the strands of a subject whose learning map allows it, e.g. franzoesisch)",
    ],
    [
      "both strand and subject",
      (root) =>
        edit(root, "app.yaml", "strand: mathematik/stochastik", "strand: mathematik/stochastik\nsubject: mathematik"),
      "src/app.yaml:3: subject: name either strand (one strand of the learning map, <subject>/<strand>, e.g. mathematik/stochastik, or none when the app is on no strand) or subject (a unit app across the strands of a subject whose learning map allows it, e.g. franzoesisch), not both; remove one of them",
    ],
    [
      "a subject with a strand",
      (root) => edit(root, "app.yaml", "strand: mathematik/stochastik", "subject: franzoesisch/grammatik"),
      "src/app.yaml:2: subject: franzoesisch/grammatik is no subject; write the subject's id in the learning map, e.g. franzoesisch, without a strand",
    ],
    [
      "a strand without its subject",
      (root) => edit(root, "app.yaml", "strand: mathematik/stochastik", "strand: stochastik"),
      "src/app.yaml:2: strand: stochastik is no strand; write <subject>/<strand> with the ids of the learning map, e.g. mathematik/stochastik, or none",
    ],
    [
      "a strand in capitals",
      (root) => edit(root, "app.yaml", "strand: mathematik/stochastik", "strand: Mathematik/Stochastik"),
      "src/app.yaml:2: strand: Mathematik/Stochastik is no strand; write <subject>/<strand> with the ids of the learning map, e.g. mathematik/stochastik, or none",
    ],
    [
      "another format",
      (root) => edit(root, "app.yaml", "format: 2", "format: 3"),
      "src/app.yaml:1: format: 3 is not a format; write format: 2, or leave format out for format 1",
    ],
    [
      "a page without competencies while the app has a strand",
      (root) => edit(root, "kapitel/zwei.yaml", "competencies: [laplace, baumdiagramm]\n", ""),
      "src/kapitel/zwei.yaml:1: competencies is missing; src/app.yaml names the strand mathematik/stochastik, so each page names the competencies of its subject that it practises, e.g. competencies: [laplace]; a page that only repeats a competency the app does not practise says recap: <subject>/<competency> instead",
    ],
    [
      "a page with competencies while the strand is none",
      (root) => {
        edit(root, "app.yaml", "strand: mathematik/stochastik", "strand: none");
        edit(root, "kapitel/eins.yaml", "competencies: [laplace]\n", "");
      },
      "src/kapitel/zwei.yaml:2: competencies: competencies is not allowed: src/app.yaml has strand: none, so the app is on no strand; remove it, or name the app's strand in src/app.yaml",
    ],
    [
      "an empty list of competencies",
      (root) => edit(root, "kapitel/eins.yaml", "competencies: [laplace]", "competencies: []"),
      "src/kapitel/eins.yaml:2: competencies: must not be empty",
    ],
    [
      "a competency that is no id",
      (root) => edit(root, "kapitel/eins.yaml", "competencies: [laplace]", "competencies: [Laplace-Formel]"),
      "src/kapitel/eins.yaml:2: competencies[0]: Laplace-Formel is no competency id; use the competency's id in the learning map: lower-case letters, digits and hyphens, e.g. laplace",
    ],
    [
      "a competency named twice",
      (root) => edit(root, "kapitel/eins.yaml", "competencies: [laplace]", "competencies: [laplace, laplace]"),
      "src/kapitel/eins.yaml:2: competencies: names a competency twice; name each competency once",
    ],
  ];

  test.each(cases)("fails with %s", (_name, breakIt, line) => {
    const root = v2();
    breakIt(root);
    expect(problemsOf(root)).toEqual([line]);
  });
});

describe("a recap page: recap: <subject>/<competency> instead of competencies", () => {
  test("is valid without an exercise, with a strand and with strand none", () => {
    const result = check(withRecap(v2()), 5);
    expect(result.problems).toEqual([]);
    const page = result.site?.chapters[0]?.pages[2];
    expect(page?.recap).toBe("physik/gewichtskraft-berechnen");
    expect(page?.competencies).toBeUndefined();
    expect(problemsOf(withRecap(v2("none")))).toEqual([]);
  });

  const cases: [string, (root: string) => void, string][] = [
    [
      "competencies and recap both",
      (root) => edit(root, "kapitel/wdh.yaml", "recap:", "competencies: [laplace]\nrecap:"),
      "src/kapitel/wdh.yaml:3: recap: a page has competencies or recap, never both: a page practises competencies of the app's strand or subject, a recap page only repeats a competency the app does not practise; remove one of them",
    ],
    [
      "a recap that is no <subject>/<competency>",
      (root) => edit(root, "kapitel/wdh.yaml", "recap: physik/gewichtskraft-berechnen", "recap: gewichtskraft"),
      "src/kapitel/wdh.yaml:2: recap: gewichtskraft is no competency of the learning map; write <subject>/<competency> with the ids of the learning map, e.g. physik/gewichtskraft-berechnen",
    ],
    [
      "an exercise",
      (root) => writeFileSync(join(root, "src/kapitel/wdh.yaml"), `${RECAP}${EXERCISE}`),
      "src/kapitel/wdh.yaml:10: blocks[0].blocks[1]: the exercise generated is not allowed on a recap page: it repeats physik/gewichtskraft-berechnen with descriptive blocks only, and the apps of that competency's strand practise it; remove the exercise, or make it a page of the app's own competencies",
    ],
  ];

  test.each(cases)("fails with %s", (_name, breakIt, line) => {
    const root = withRecap(v2());
    breakIt(root);
    expect(problemsOf(root)).toEqual([line]);
  });

  test("has no exercise component either", () => {
    // the template: format 2, with the exercise component ProzentFeld
    const root = mkdtempSync(join(tmpdir(), "explainer-format-recap-"));
    cpSync(join(import.meta.dirname, "../explainer/src"), join(root, "src"), { recursive: true });
    const block = /      - type: vue-component\n[\s\S]*?(?=      - type: open-task)/.exec(
      readFileSync(join(root, "src/prozent/prozentwert.yaml"), "utf8"),
    )?.[0];
    expect(block).toBeDefined();
    writeFileSync(
      join(root, "src/prozent/wdh.yaml"),
      [
        "title: Brüche – kurz wiederholt",
        "recap: mathematik/brueche-erweitern",
        "scope: Wiederholt, wie man einen Bruch erweitert.",
        "blocks:",
        "  - type: section",
        "    id: brueche",
        "    title: Brüche",
        "    blocks:",
        "      - type: text",
        "        text: Ein Bruch bleibt gleich, wenn du Zähler und Nenner mit derselben Zahl malnimmst.",
        `${block ?? ""}`,
      ].join("\n"),
    );
    edit(
      root,
      "prozent/chapter.yaml",
      "pages: [prozentwert, prozentsatz, grundwert]",
      "pages: [prozentwert, prozentsatz, grundwert, wdh]",
    );
    expect(problemsOf(root)).toEqual([
      "src/prozent/wdh.yaml:11: blocks[0].blocks[1]: the exercise component ProzentFeld is not allowed on a recap page: it repeats mathematik/brueche-erweitern with descriptive blocks only, and the apps of that competency's strand practise it; remove the exercise, or make it a page of the app's own competencies",
    ]);
  }, 30_000);

  test("is a field of format 2", () => {
    const root = withRecap(app());
    expect(problemsOf(root)).toEqual([
      "src/kapitel/wdh.yaml:2: recap: recap is a field of format 2; add format: 2 and the app's strand or subject to src/app.yaml, or remove it",
    ]);
  });

  test("is not in a self-assessment", () => {
    const root = withRecap(v2());
    writeFileSync(join(root, "src/kapitel/wdh.yaml"), RECAP);
    edit(
      root,
      "kapitel/chapter.yaml",
      "pages: [eins, zwei, wdh]",
      "pages: [eins, zwei, wdh]\nselfAssessment:\n  pages:\n    - exercises: [/kapitel/eins/#summe, /kapitel/zwei/#punkt, /kapitel/wdh/#gewichtskraft]",
    );
    expect(problemsOf(root)).toEqual([
      "src/kapitel/chapter.yaml:5: selfAssessment.pages[0].exercises[2]: /kapitel/wdh/#gewichtskraft is on a recap page, which has no exercise and is left out of the self-assessment; choose an exercise of a page of the app's own competencies",
    ]);
  });

  test("shows that it is a recap and links the competency on the learning map; the contents mark it", () => {
    const root = withRecap(v2());
    const site = loadSite(root, 0);
    const body = (lang: string, path: string) =>
      renderPage(site, routes(site).find((route) => route.lang === lang && route.path === path) ?? routes(site)[0]!)
        .body;
    const page = body("de", "kapitel/wdh/");
    const notice = /<aside class="explainer-recap"[\s\S]*?<\/aside>/.exec(page)?.[0] ?? "";
    expect(notice).toContain("Wiederholung");
    expect(notice).toContain(
      '<a href="https://lernapps.net/apps/map/physik/c/gewichtskraft-berechnen/" rel="noopener">Baustein auf der Lernlandkarte von lernapps.net</a>',
    );
    // at the top: before the first section
    expect(page.indexOf("explainer-recap")).toBeLessThan(page.indexOf('id="gewichtskraft"'));
    expect(body("en", "en/kapitel/wdh/")).toContain(">Recap<");
    // a page of the app's own competencies has no notice
    expect(body("de", "kapitel/eins/")).not.toContain('class="explainer-recap"');
    // the contents of the start page mark the recap page, and no other
    const start = body("de", "");
    expect(start.match(/explainer-recap-note/g)?.length).toBe(1);
    expect(start).toMatch(
      /Gewichtskraft – kurz wiederholt<\/a> <span class="explainer-recap-note">\(Wiederholung\)<\/span>/,
    );
  });

  test("tells the tutor that it is a recap, with the link to the learning map", () => {
    const site = loadSite(withRecap(v2()), 0);
    const page = site.chapters[0]?.pages[2];
    if (page === undefined) throw new Error("no recap page");
    const { markdown } = tutorPage(site, page, "de", new Map());
    expect(markdown).toContain(
      "Diese Seite ist eine Wiederholung: Sie wiederholt etwas, das das Kind schon können sollte, und hat keine Übung.",
    );
    expect(markdown).toContain("https://lernapps.net/apps/map/physik/c/gewichtskraft-berechnen/");
  });

  test("is left out of the self-assessment", () => {
    const root = withRecap(v2());
    edit(
      root,
      "kapitel/chapter.yaml",
      "pages: [eins, zwei, wdh]",
      "pages: [eins, zwei, wdh]\nselfAssessment:\n  pages:\n    - exercises: [/kapitel/eins/#summe, /kapitel/zwei/#punkt]",
    );
    const site = loadSite(root, 0);
    const [assessment] = assessments(site);
    expect(assessment?.pages.map((page) => page.id)).toEqual(["eins", "zwei"]);
  });
});

describe("the page list for the catalog", () => {
  const built = async (root: string) => {
    await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [explainer()] });
    return join(root, "dist");
  };

  test("format 2 writes lernapps-pages.json beside index.html: strand, and each page in order with its address, title and competencies", async () => {
    const dist = await built(v2());
    expect(existsSync(join(dist, "index.html"))).toBe(true);
    expect(JSON.parse(readFileSync(join(dist, PAGE_LIST), "utf8"))).toEqual({
      format: 1,
      strand: "mathematik/stochastik",
      pages: [
        { path: "kapitel/eins/", title: { de: "Eins", en: "One" }, competencies: ["laplace"] },
        { path: "kapitel/zwei/", title: { de: "Zwei", en: "Two" }, competencies: ["laplace", "baumdiagramm"] },
      ],
    });
    // once, at the root: not in a language tree
    expect(existsSync(join(dist, "en", PAGE_LIST))).toBe(false);
  }, 30_000);

  test("format 2 with a subject writes subject instead of strand", async () => {
    const dist = await built(unit());
    expect(JSON.parse(readFileSync(join(dist, PAGE_LIST), "utf8"))).toEqual({
      format: 1,
      subject: "franzoesisch",
      pages: [
        { path: "kapitel/eins/", title: { de: "Eins", en: "One" }, competencies: ["laplace"] },
        { path: "kapitel/zwei/", title: { de: "Zwei", en: "Two" }, competencies: ["laplace", "baumdiagramm"] },
      ],
    });
  }, 30_000);

  test("format 2 with strand none writes the list without competencies", async () => {
    const dist = await built(v2("none"));
    expect(JSON.parse(readFileSync(join(dist, PAGE_LIST), "utf8"))).toEqual({
      format: 1,
      strand: "none",
      pages: [
        { path: "kapitel/eins/", title: { de: "Eins", en: "One" } },
        { path: "kapitel/zwei/", title: { de: "Zwei", en: "Two" } },
      ],
    });
  }, 30_000);

  test("names a recap page with recap instead of competencies, with a strand and with strand none", async () => {
    for (const strand of ["mathematik/stochastik", "none"]) {
      const dist = await built(withRecap(v2(strand)));
      const list = JSON.parse(readFileSync(join(dist, PAGE_LIST), "utf8")) as { pages: unknown[] };
      expect(list.pages.at(-1)).toEqual({
        path: "kapitel/wdh/",
        title: { de: "Gewichtskraft – kurz wiederholt", en: "Weight – a short recap" },
        recap: "physik/gewichtskraft-berechnen",
      });
    }
  }, 60_000);

  test("format 1 writes no list", async () => {
    const dist = await built(app());
    expect(existsSync(join(dist, "index.html"))).toBe(true);
    expect(existsSync(join(dist, PAGE_LIST))).toBe(false);
  }, 30_000);

  test("the template is format 2: its strand, and the competencies of its three pages", async () => {
    const root = mkdtempSync(join(tmpdir(), "explainer-format-template-"));
    cpSync(join(import.meta.dirname, "../explainer/src"), join(root, "src"), { recursive: true });
    const site = check(root, 5).site;
    expect(site?.app.format).toBe(2);
    expect(site?.app.strand).toBe("mathematik/arithmetik");
    expect(site?.chapters.flatMap((chapter) => chapter.pages.map((page) => page.competencies))).toEqual([
      ["prozent-prozentwert"],
      ["prozent-prozentsatz"],
      ["prozent-grundwert"],
    ]);
  }, 30_000);
});
