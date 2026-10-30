// The scope of an explainer (runtime/explainer/scope.ts): each part names a chapter or page of the app, each content
// page has its part, and it ends with what belongs to it and what does not; its page is for no menu and no search.
import { describe, expect, test } from "vite-plus/test";
import type { Chapter } from "../runtime/explainer/content.ts";
import { scopeDocument, scopeFiles, scopeProblems } from "../runtime/explainer/scope.ts";

const chapters = [
  {
    id: "feste",
    title: "Feste",
    pages: [
      { id: "jahreskreis", chapter: "feste", file: "", title: "Jahreskreis", blocks: [] },
      { id: "chanukka", chapter: "feste", file: "", title: "Chanukka", blocks: [] },
    ],
  },
] satisfies Chapter[];

const scope = (parts: string) =>
  [
    "# Judentum",
    "",
    "Einleitung.",
    "",
    parts,
    "",
    "## Gehört dazu",
    "",
    "- Feste",
    "",
    "## Gehört nicht dazu",
    "",
    "- Geschichte",
  ].join("\n");

describe("the scope", () => {
  test("a part for each page, the closing parts: no problem", () => {
    expect(
      scopeProblems(
        scope(
          "## Feste (/feste/)\n\n### Jahreskreis (/feste/jahreskreis/)\n\nText.\n\n### Chanukka (/feste/chanukka/)\n\nText.",
        ),
        chapters,
      ),
    ).toEqual([]);
  });

  test("a part that names no page, a page without its part, no closing parts", () => {
    expect(
      scopeProblems(
        "## Feste (/feste/)\n\n### Purim (/feste/purim/)\n\n### Jahreskreis (/feste/jahreskreis/)",
        chapters,
      ),
    ).toEqual([
      "src/scope.md:3: /feste/purim/ names no page of the app; write ### <title> (/<chapter>/<page>/)",
      "src/scope.md: has no part for /feste/chanukka/; give each content page its part, ### <title> (/<chapter>/<page>/), with what the page teaches in your own words",
      "src/scope.md: ends with what belongs to the scope and what does not: ## Gehört dazu and ## Gehört nicht dazu (in English ## In scope and ## Out of scope)",
    ]);
  });

  test("a scope per page and per chapter, each with the closing parts and a link one level up; the whole at the root", () => {
    const whole = scope(
      "## Feste (/feste/)\n\nDas Jahr.\n\n### Jahreskreis (/feste/jahreskreis/)\n\nSabbat.\n\n### Chanukka (/feste/chanukka/)\n\nLichter.",
    );
    const files = scopeFiles(whole);
    expect([...files.keys()]).toEqual(["", "feste/", "feste/jahreskreis/", "feste/chanukka/"]);
    expect(files.get("")).toBe(whole);
    expect(files.get("feste/jahreskreis/")?.split("\n")).toEqual([
      "# Jahreskreis (/feste/jahreskreis/)",
      "",
      "Sabbat.",
      "",
      "## Gehört dazu",
      "",
      "- Feste",
      "",
      "## Gehört nicht dazu",
      "",
      "- Geschichte",
      "",
      "Alle Seiten des Kapitels: [Scope des Kapitels](../../scope/)",
      "",
    ]);
    expect(files.get("feste/")).toContain("# Feste (/feste/)");
    expect(files.get("feste/")).toContain("\n## Chanukka (/feste/chanukka/)\n");
    expect(files.get("feste/")).toContain("Lichter.");
    expect(files.get("feste/")).toContain("Die ganze App: [Scope der App](../../scope/)");
  });

  test("its page: for no search engine, links within the language tree from its folder", () => {
    const html = scopeDocument("Siehe [Jahreskreis](/feste/jahreskreis/).", "Judentum", "de", "feste/chanukka/");
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<a href="../../../feste/jahreskreis/">Jahreskreis</a>');
  });
});
