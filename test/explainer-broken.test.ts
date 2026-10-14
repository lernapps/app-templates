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
    "src/notizen.txt: not part of an explainer; src/ holds only app.yaml, the chapter folders, data/, images/ and main.ts",
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
