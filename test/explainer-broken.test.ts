// Broken explainers: each breaks the valid app in test/fixtures/explainer-broken in one way, and its build fails with
// exactly one problem line, which names the file, its line, the place in the file, the language where it matters, and
// what to do.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { explainer } from "../runtime/explainer/plugin.ts";

const FIXTURE = join(import.meta.dirname, "fixtures/explainer-broken");

/** A copy of the fixture as an app: index.html, src/main.ts and the content in src/. */
function app(): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-broken-"));
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

/** The problem lines of a failed build; none when it builds. */
async function problems(root: string): Promise<string[]> {
  try {
    await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [explainer()] });
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return message
      .split("\n")
      .filter((line) => line.startsWith("  - "))
      .map((line) => line.slice(4));
  }
}

const cases: [string, (root: string) => void, string][] = [
  [
    "an exercise id that is a parameter of the address",
    (root) => edit(root, "kapitel/eins.yaml", "id: summe", "id: seed"),
    "src/kapitel/eins.yaml:22: blocks[1].blocks[0].id: seed is a parameter of the page's address (seed, von), and the address holds the task number of each exercise under its id; give the exercise another id",
  ],
  [
    "an unknown LaTeX command",
    (root) => edit(root, "kapitel/eins.yaml", `"a^2 + b^2 = c^2"`, `'\\foo{a} + b'`),
    "src/kapitel/eins.yaml:10: blocks[0].blocks[1].formula: \\foo is not in the formula command list; write the formula with the commands the schema lists ($defs/latex)",
  ],
  [
    "raw HTML",
    (root) => edit(root, "kapitel/eins.yaml", "de: Ein Text mit $a + b$.", "de: Ein Text mit <b>fett</b>."),
    "src/kapitel/eins.yaml:8: blocks[0].blocks[0].text (de): raw HTML (<b>) is not allowed; write restricted Markdown: **bold**, *italics*, lists, links",
  ],
  [
    "a Markdown heading in a text",
    (root) =>
      edit(
        root,
        "kapitel/eins.yaml",
        "text: { de: Ein Text mit $a + b$., en: A text with $a + b$. }",
        "text:\n          de: |\n            Ein Text.\n\n            ## Teil\n          en: A text.",
      ),
    'src/kapitel/eins.yaml:12: blocks[0].blocks[0].text (de): a Markdown heading ("Teil"); use a section block with the title "Teil"',
  ],
  [
    "an image without licence",
    (root) => edit(root, "kapitel/zwei.yaml", "    licence: CC0-1.0\n", ""),
    "src/kapitel/zwei.yaml:3: blocks[0]: licence is missing; a bundled image names its source and its licence",
  ],
  [
    "a quote without origin",
    (root) =>
      edit(
        root,
        "kapitel/zwei.yaml",
        "    origin: { author: René Descartes, work: Discours de la méthode, year: 1637 }\n",
        "",
      ),
    "src/kapitel/zwei.yaml:9: blocks[1]: origin is missing; a quote names who said or wrote it, where and when",
  ],
  [
    "a page missing from the order list",
    (root) => edit(root, "kapitel/chapter.yaml", "pages: [eins, zwei]", "pages: [eins]"),
    "src/kapitel/chapter.yaml:2: pages: zwei is not listed; list each page of src/kapitel/ exactly once",
  ],
  [
    "a page listed twice",
    (root) => edit(root, "kapitel/chapter.yaml", "pages: [eins, zwei]", "pages: [eins, zwei, eins]"),
    "src/kapitel/chapter.yaml:2: pages[2]: eins is listed twice; list each page exactly once",
  ],
  [
    "a third section level",
    (root) =>
      edit(
        root,
        "kapitel/eins.yaml",
        "            text: { de: Noch ein Text., en: Another text. }\n",
        "            text: { de: Noch ein Text., en: Another text. }\n          - type: section\n            id: zu-tief\n            title: { de: Zu tief, en: Too deep }\n            blocks:\n              - type: text\n                text: { de: Text., en: Text. }\n",
      ),
    "src/kapitel/eins.yaml:17: blocks[0].blocks[2].blocks[1]: a section inside a subsection; sections go two levels deep at most, so split the page",
  ],
  [
    "an extra file in src/",
    (root) => writeFileSync(join(root, "src/notizen.txt"), "Ideen\n"),
    "src/notizen.txt: not part of an explainer; src/ holds only app.yaml, the chapter folders, data/, images/, components/ and main.ts",
  ],
  [
    "a missing translation",
    (root) => edit(root, "kapitel/eins.yaml", ", en: A text with $a + b$. }", " }"),
    "src/kapitel/eins.yaml:8: blocks[0].blocks[0].text (en): the translation is missing",
  ],
  [
    "an undeclared language",
    (root) => edit(root, "kapitel/eins.yaml", "title: { de: Eins, en: One }", "title: { de: Eins, en: One, fr: Un }"),
    "src/kapitel/eins.yaml:1: title (fr): fr is not a language of the app; declare it in languages in src/app.yaml, or remove it",
  ],
  [
    "a mistake equal to the answer",
    (root) => edit(root, "kapitel/eins.yaml", `value: "a * b"`, `value: "b + a"`),
    "src/kapitel/eins.yaml:31: blocks[1].blocks[0].mistakes[0].value: for seed 1 the mistake equals the answer (12); a mistake is a wrong answer, so change its value or remove it",
  ],
  [
    "a where that starves",
    (root) => edit(root, "kapitel/eins.yaml", `where: ["a != b"]`, `where: ["a == 1 and b == 2"]`),
    "src/kapitel/eins.yaml:26: blocks[1].blocks[0].where: where holds in 5 of 200 draws; it must hold in at least 1 of 10, so loosen it or narrow given",
  ],
  [
    "an undeclared variable",
    (root) => edit(root, "kapitel/eins.yaml", `value: "a + b"`, `value: "a + c"`),
    "src/kapitel/eins.yaml:29: blocks[1].blocks[0].answer.value: c is not declared; declare it in given, or use one of a, b",
  ],
  [
    "a placeholder left in the task",
    (root) => edit(root, "kapitel/eins.yaml", `de: "Was ist {{a}} + {{b}}?"`, `de: "Was ist {{a}} + {{b.x}}?"`),
    "src/kapitel/eins.yaml:28: blocks[1].blocks[0].task.text (de): for seed 1 the task still has the placeholder {{b.x}}: it has no value there; name a field the records have",
  ],
  [
    "an unknown placeholder",
    (root) => edit(root, "kapitel/eins.yaml", `de: "Was ist {{a}} + {{b}}?"`, `de: "Was ist {{a}} + {{q}}?"`),
    "src/kapitel/eins.yaml:28: blocks[1].blocks[0].task.text (de): {{q}} is an unknown placeholder: q is not declared in given; declare it, or use one of {{a}}, {{b}}, {{answer}}",
  ],
  [
    "a placeholder with one brace",
    (root) => edit(root, "kapitel/eins.yaml", `de: "Was ist {{a}} + {{b}}?"`, `de: "Was ist {{a}} + {b}?"`),
    "src/kapitel/eins.yaml:28: blocks[1].blocks[0].task.text (de): {b} has one pair of braces; a placeholder is written with two: {{b}}",
  ],
  [
    "an unused variable",
    (root) => edit(root, "kapitel/eins.yaml", "b: { int: [1, 9] }", "b: { int: [1, 9] }\n          c: { int: [1, 9] }"),
    "src/kapitel/eins.yaml:26: blocks[1].blocks[0].given.c: c is never used: no placeholder {{c}} in the task, figure, steps, hint or mistakes, and no expression of the figure, answer or mistakes names it; use it, or remove it from given",
  ],
  [
    "a missing translation in an embedded question",
    (root) => edit(root, "kapitel/zwei.yaml", ", en: What does the picture show? }", " }"),
    "src/kapitel/zwei.yaml:16: blocks[2].text (en): the translation is missing",
  ],
  [
    "a credit in German only",
    (root) =>
      edit(root, "kapitel/zwei.yaml", "source: { de: eigene Zeichnung, en: own drawing }", "source: eigene Zeichnung"),
    "src/kapitel/zwei.yaml:7: blocks[0].source (en): the translation is missing; write the text as a map: { de: …, en: … }",
  ],
  [
    "a link's address missing a language",
    (root) => edit(root, "kapitel/zwei.yaml", `, en: "https://en.wikipedia.org/wiki/Point_(geometry)" }`, " }"),
    "src/kapitel/zwei.yaml:20: blocks[2].links[0].url (en): the translation is missing",
  ],
  [
    "a link's address over http",
    (root) => edit(root, "kapitel/zwei.yaml", `en: "https://en.wikipedia.org`, `en: "http://en.wikipedia.org`),
    "src/kapitel/zwei.yaml:20: blocks[2].links[0].url (en): must be an https address",
  ],
  [
    "an accepted example that the check rejects",
    (root) =>
      edit(root, "kapitel/zwei.yaml", "    options:\n", "    examples: { accepted: [Eine Linie] }\n    options:\n"),
    'src/kapitel/zwei.yaml:21: blocks[2].examples.accepted[0]: the check rejects "Eine Linie", but it is listed as accepted; if the task\'s text allows it, change the question (e.g. another type, a tolerance) so that its check accepts it, else move it to rejected',
  ],
  [
    "a rejected example that the check accepts",
    (root) =>
      edit(
        root,
        "kapitel/eins.yaml",
        `answer: { value: "a + b"`,
        `examples: { rejected: ["b + a"] }\n        answer: { value: "a + b"`,
      ),
    'src/kapitel/eins.yaml:29: blocks[1].blocks[0].examples.rejected[0]: for seed 1 (answer 12) the check accepts "12", but it is listed as rejected; if the task\'s text rules it out, change the exercise (e.g. another comparator, a tolerance) so that its check rejects it, else move it to accepted',
  ],
  [
    "a page without an exercise",
    (root) => {
      const file = join(root, "src/kapitel/zwei.yaml");
      const text = readFileSync(file, "utf8");
      writeFileSync(file, text.slice(0, text.indexOf("  - type: single-choice")));
    },
    "src/kapitel/zwei.yaml:3: blocks: the page has no exercise; give it a section with an exercise: one of the question types, or generated",
  ],
];

describe("a broken explainer fails the build with its one line", () => {
  test("the fixture itself builds", async () => {
    expect(await problems(app())).toEqual([]);
  }, 30_000);

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
