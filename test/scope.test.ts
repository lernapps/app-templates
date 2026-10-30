// The scope of an explainer (runtime/explainer/scope.ts): with the app's scope every page has its own; the build
// writes a scope beside each page, chapter and the app, each with what belongs to it and what does not and a link one
// level up; its page is for no menu and no search engine.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { check, loadSite } from "../runtime/explainer/load.ts";
import { scopeDocument, scopeFiles } from "../runtime/explainer/scope.ts";

/** A copy of the example explainer's content, to change. */
function example(): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-scope-"));
  cpSync(join(import.meta.dirname, "../explainer/src"), join(root, "src"), { recursive: true });
  return root;
}

const edit = (root: string, file: string, from: RegExp, to: string) => {
  const path = join(root, "src", file);
  writeFileSync(path, readFileSync(path, "utf8").replace(from, to));
};

describe("the scope", () => {
  test("a scope per page and per chapter, each with the closing parts and a link one level up; the whole at the root", () => {
    const files = scopeFiles(loadSite(example(), 5), "de");
    expect([...files.keys()]).toEqual([
      "prozent/",
      "prozent/prozentwert/",
      "prozent/prozentsatz/",
      "prozent/grundwert/",
      "",
    ]);
    const page = files.get("prozent/prozentsatz/") ?? "";
    expect(page.split("\n")[0]).toBe("# Prozentsatz");
    expect(page).toContain("Gesucht ist, welcher Anteil der Teil vom Ganzen ist");
    expect(page).toContain("## Gehört dazu\n\n- die drei Größen");
    expect(page).toContain("## Gehört nicht dazu\n\n- Zinsen und Zinseszins");
    expect(page.trimEnd().split("\n").at(-1)).toBe("Alle Seiten des Kapitels: [Scope des Kapitels](../../scope/)");
    const chapter = files.get("prozent/") ?? "";
    expect(chapter).toContain("\n## Prozentwert\n");
    expect(chapter).toContain("Die ganze App: [Scope der App](../../scope/)");
    expect(files.get("")).toContain("# Prozentrechnung\n\nDie App führt in die Prozentrechnung ein.");
    expect(files.get("")).toContain("\n### Grundwert\n");
  });

  test("with the app's scope, a page without its own is a problem; a page's without the app's too", () => {
    const missing = example();
    edit(missing, "prozent/grundwert.yaml", /^scope: \|\n(  .*\n|\n)*/m, "");
    expect(check(missing, 5).problems).toEqual([
      "src/prozent/grundwert.yaml: has no scope; src/app.yaml has one, so each page says in scope: what it teaches, in your own words from the material",
    ]);
    const lost = example();
    edit(lost, "app.yaml", /^scope:\n(  .*\n|    .*\n)*/m, "");
    expect(check(lost, 5).problems).toHaveLength(3);
    expect(check(lost, 5).problems[0]).toMatch(
      /^src\/prozent\/prozentwert\.yaml: has a scope, but src\/app\.yaml has none/,
    );
  });

  test("its page: for no search engine, links within the language tree from its folder", () => {
    const html = scopeDocument("Siehe [Jahreskreis](/feste/jahreskreis/).", "Judentum", "de", "feste/chanukka/");
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<a href="../../../feste/jahreskreis/">Jahreskreis</a>');
  });
});
