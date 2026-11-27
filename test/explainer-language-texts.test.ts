// The texts of a language task that the runtime owns, as the child reads them: the prompt of an item that starts from a marker
// of a labelled figure (languageMarker) and the note under a wrong sentence that has no known reason (languageOwnVersion).
// A speaking task keeps its "Lösung": it lists what each model says, which a model without a shown text has nowhere else.
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { loadSite } from "../runtime/explainer/load.ts";
import { message } from "../runtime/explainer/messages.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";

const here = import.meta.dirname;

function body(path: string): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-language-texts-"));
  cpSync(join(here, "../explainer/examples/franzoesisch/src"), join(root, "src"), { recursive: true });
  const site = loadSite(root, 0);
  const route = routes(site).find((candidate) => candidate.path === path);
  if (route === undefined) throw new Error(`no page ${path}`);
  return renderPage(site, route).body;
}

describe("the marker of a labelled figure", () => {
  test("is named by what the figure shows, a letter or a number, not as a part", () => {
    expect(message("de", "languageMarker", { marker: "A" })).toBe("Markierung A in der Abbildung");
    expect(message("de", "languageMarker", { marker: "1" })).toBe("Markierung 1 in der Abbildung");
    expect(message("en", "languageMarker", { marker: "A" })).toBe("Marker A in the figure");
  });

  test("is the prompt of an item that names a marker", () => {
    expect(body("bonjour/a-table/")).toContain(
      '<span class="explainer-language-marker">Markierung A in der Abbildung</span>',
    );
  });
});

describe("the note on a wrong sentence without a known reason", () => {
  test("tells the child to check the spelling and that another correct version may be unknown", () => {
    for (const lang of ["de", "en"]) {
      const text = message(lang, "languageOwnVersion");
      expect(text, lang).toMatch(/Schreibung|spelling/);
      expect(text, lang).toMatch(/Fassung|version/);
    }
  });
});
