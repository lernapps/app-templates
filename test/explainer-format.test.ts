// The formats of an explainer's content. Format 1 (explainer.v1.schema.json) is an app.yaml without `format`, and
// stays as it was: no strand, no competencies, no page list. Format 2 (explainer.v2.schema.json, `format: 2`) places
// the app on the learning map of the catalog: src/app.yaml names the app's strand (<subject>/<strand>, or none), each
// page the competencies it practises (required with a strand, not allowed with none), and the build writes
// lernapps-pages.json at the root of the bundle, the list of the pages for the catalog. Each broken case fails with
// exactly one problem line.
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { check, ContentError } from "../runtime/explainer/load.ts";
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
      "src/app.yaml:1: strand: strand is a field of format 2; add format: 2 to src/app.yaml, with the app's strand",
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
      "src/kapitel/eins.yaml:1: competencies: competencies is a field of format 2; add format: 2 and the app's strand to src/app.yaml, or remove it",
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
      "src/app.yaml:1: strand is missing; name the strand of the learning map the app stays in, <subject>/<strand> (e.g. mathematik/stochastik), or none when the app is on no strand",
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
      "src/kapitel/zwei.yaml:1: competencies is missing; src/app.yaml names the strand mathematik/stochastik, so each page names the competencies of its subject that it practises, e.g. competencies: [laplace]",
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
