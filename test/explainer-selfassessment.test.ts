// The self-assessment of an explainer ("Wie sicher bist du?"): the levels a learner gives each page, kept on the device
// under one key, read back however the stored value looks, and turned into the value of the tutor's parameter stand
// for a chapter; the build writes the question at the end of every page's last section and an overview on the start
// page and each chapter page, readable without JavaScript, and nothing of it when app.yaml says selfAssessment: false.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { check, loadSite } from "../runtime/explainer/load.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";
import { message } from "../runtime/explainer/messages.ts";
import { LEVELS, levelsFrom, pageKey, standOf, withLevel } from "../runtime/explainer/selfassessment.ts";

const ALL_BLOCKS = join(import.meta.dirname, "fixtures/explainer-all-blocks");

/** An app with the content of `src`, its app.yaml and pages changed by `change` (file, text) => text. */
function app(src: string, change: (file: string, text: string) => string = (_file, text) => text): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-self-"));
  cpSync(src, join(root, "src"), { recursive: true });
  for (const file of ["app.yaml", "zahlen/zahlen-01.yaml"]) {
    const path = join(root, "src", file);
    writeFileSync(path, change(file, readFileSync(path, "utf8")));
  }
  return root;
}

/** The body of the page `local` in `lang`. */
function body(root: string, lang: string, local: string): string {
  const site = loadSite(root, 0);
  const route = routes(site).find((candidate) => candidate.lang === lang && candidate.local === local);
  if (route === undefined) throw new Error(`no page ${local} in ${lang}`);
  return renderPage(site, route).body;
}

describe("the levels kept on the device", () => {
  test("three levels, in order", () => {
    expect(LEVELS).toEqual(["sicher", "teils", "ueben"]);
  });

  test("a page's key holds its chapter, as page ids are unique only within a chapter", () => {
    expect(pageKey("wahrscheinlichkeit", "laplace")).toBe("wahrscheinlichkeit/laplace");
  });

  test("a stored value keeps only the pages with a known level", () => {
    expect(levelsFrom({ "a/b": "sicher", "a/c": "teils", "a/d": "gut", "a/e": 3, "a/f": "ueben" })).toEqual({
      "a/b": "sicher",
      "a/c": "teils",
      "a/f": "ueben",
    });
    for (const value of [undefined, null, "sicher", 3, ["sicher"]]) expect(levelsFrom(value)).toEqual({});
  });

  test("a new level replaces the page's old one and keeps the others", () => {
    const before = { "a/b": "sicher", "a/c": "teils" } as const;
    expect(withLevel(before, "a/c", "ueben")).toEqual({ "a/b": "sicher", "a/c": "ueben" });
    expect(before["a/c"]).toBe("teils");
  });
});

describe("the tutor's parameter stand for a chapter", () => {
  const levels = { "zufall/baumdiagramm": "sicher", "zufall/laplace": "teils", "prozent/grundwert": "ueben" } as const;

  test("the chapter's pages with a level, in the chapter's order, page:level", () => {
    expect(standOf(levels, "zufall", ["laplace", "baumdiagramm", "pfadregeln"])).toBe(
      "laplace:teils,baumdiagramm:sicher",
    );
  });

  test("no page of another chapter, and empty when no page of the chapter has a level", () => {
    expect(standOf(levels, "prozent", ["grundwert", "prozentwert"])).toBe("grundwert:ueben");
    expect(standOf(levels, "binom", ["erste", "zweite"])).toBe("");
    expect(standOf({}, "zufall", ["laplace"])).toBe("");
  });
});

describe("the build writes the self-assessment", () => {
  const root = app(ALL_BLOCKS);

  test("each page ends its last section with the question, three options, each named by its visible text", () => {
    const html = body(root, "de", "zahlen/zahlen-01/");
    const fieldset = /<fieldset class="explainer-self"[\s\S]*?<\/fieldset>/.exec(html)?.[0] ?? "";
    expect(fieldset).toContain('data-page="zahlen/zahlen-01"');
    // inside the last section, before it closes
    const last = html.lastIndexOf('<section class="explainer-section">');
    expect(html.indexOf(fieldset)).toBeGreaterThan(last);
    expect(html.indexOf(fieldset)).toBeLessThan(html.indexOf("</main>"));
    const labels = [...fieldset.matchAll(/<label>(<input [^>]*>) ([^<]*)<\/label>/g)];
    expect(labels.map(([, , text]) => text)).toEqual([
      message("de", "selfSicher"),
      message("de", "selfTeils"),
      message("de", "selfUeben"),
    ]);
    for (const [, input = ""] of labels) {
      expect(input).toContain('type="radio"');
      // the name of an option is its visible text: no aria-label beside it (label-content-name-mismatch)
      expect(input).not.toContain("aria-label");
    }
    expect(fieldset).toContain(message("de", "selfNoJs"));
    expect(fieldset).toContain('role="status"');
  });

  test("the question names the page's title, or its own sentence in each language", () => {
    const site = loadSite(root, 0);
    const title = site.chapters[0]?.pages[0]?.title;
    const de = typeof title === "string" ? title : (title?.["de"] ?? "");
    expect(body(root, "de", "zahlen/zahlen-01/")).toContain(message("de", "selfAbout", { title: de }));
    const own = app(ALL_BLOCKS, (file, text) =>
      file === "zahlen/zahlen-01.yaml"
        ? text.replace(
            /^blocks:/m,
            'canDo: { de: "Ich kann Zahlen ordnen.", en: "I can put numbers in order." }\nblocks:',
          )
        : text,
    );
    expect(body(own, "de", "zahlen/zahlen-01/")).toContain("Ich kann Zahlen ordnen.");
    expect(body(own, "en", "zahlen/zahlen-01/")).toContain("I can put numbers in order.");
  });

  test("an own sentence is complete in every language of the app", () => {
    const half = app(ALL_BLOCKS, (file, text) =>
      file === "zahlen/zahlen-01.yaml"
        ? text.replace(/^blocks:/m, 'canDo: { de: "Ich kann Zahlen ordnen." }\nblocks:')
        : text,
    );
    expect(check(half, 0).problems.join("\n")).toMatch(/zahlen-01\.yaml.*canDo/);
  });

  test("the start page and each chapter page have the overview: each page with its link and its level", () => {
    for (const [local, pages] of [
      ["", ["zahlen/zahlen-01", "zahlen/zahlen-02", "formen/formen-01", "formen/formen-02"]],
      ["formen/", ["formen/formen-01", "formen/formen-02"]],
    ] as const) {
      const html = body(root, "de", local);
      const overview = /<section class="explainer-self-overview"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
      expect(overview, local).toContain(`<h2 id="einschaetzung">${message("de", "selfOverview")}</h2>`);
      expect([...overview.matchAll(/<tr data-page="([^"]+)">/g)].map(([, key]) => key)).toEqual(pages);
      expect(overview).toContain(message("de", "selfNoJs"));
      // the table waits for the levels on the device: hidden until the client module fills it
      expect(overview).toMatch(/<table class="explainer-self-table"[^>]* hidden>/);
    }
    expect(body(root, "de", "formen/")).toContain('<th scope="row"><a href="../formen/formen-01/">Formen 1</a></th>');
  });

  test("selfAssessment: false in app.yaml: no question, no overview", () => {
    const off = app(ALL_BLOCKS, (file, text) => (file === "app.yaml" ? `${text}selfAssessment: false\n` : text));
    for (const local of ["", "zahlen/", "zahlen/zahlen-01/"]) {
      const html = body(off, "de", local);
      expect(html).not.toContain("explainer-self");
    }
  });
});
