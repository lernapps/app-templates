// The vocabulary block of an explainer (vocabulary.ts): words as a vocabulary book shows them, as written. The page as
// the build writes it: a table with the caption, the target language heading each row and the source language at the
// end, each word with its language; the middle column only when an entry has an example, a note or a false friend; the
// further forms and the gender after the word; tables of forms folded under their word, an ending marked with **…**
// highlighted; the buttons to cover a column hidden until the client module runs. The tutor page lists the words. A
// table of forms with a short row fails the build (explainer-broken.test.ts).
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { loadSite } from "../runtime/explainer/load.ts";
import { message } from "../runtime/explainer/messages.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { contentPages, routes } from "../runtime/explainer/routes.ts";
import { tutorPageMarkdown } from "../runtime/explainer/tutorpage.ts";

/** The site of the all-blocks fixture, which is an app's src/. */
function site() {
  const root = mkdtempSync(join(tmpdir(), "explainer-vocabulary-"));
  cpSync(join(import.meta.dirname, "fixtures/explainer-all-blocks"), join(root, "src"), { recursive: true });
  return loadSite(root, 0);
}

/** The vocabulary block of the page at `path` (from the app's root), as the build writes it. */
function block(path: string): string {
  const app = site();
  const route = routes(app).find((candidate) => candidate.path === path);
  if (route === undefined) throw new Error(`no page ${path}`);
  const html = /<div class="explainer-vocabulary"[\s\S]*?<\/table><\/div><\/div>/.exec(
    renderPage(app, route).body,
  )?.[0];
  if (html === undefined) throw new Error(`no vocabulary block on ${path}`);
  return html;
}

describe("a vocabulary block on the page", () => {
  test("a table: caption, the target language first, the middle column, the source language last", () => {
    const html = block("zahlen/zahlen-01/");
    expect(html).toContain("<caption>Am Tisch</caption>");
    expect(html).toContain(
      `<thead><tr><th scope="col">Französisch</th><th scope="col">${message("de", "vocabularyHint")}</th><th scope="col">Deutsch</th></tr></thead>`,
    );
    expect(html.match(/<tr class="explainer-vocabulary-entry/g)).toHaveLength(5);
  });

  test("each word as written, with its language; further forms and the gender after it", () => {
    const html = block("zahlen/zahlen-01/");
    expect(html).toContain(
      `<th scope="row" data-side="target" data-row="1"><span lang="fr"><span class="explainer-vocabulary-word">le pain</span></span> <span class="explainer-vocabulary-gender">(m)</span></th>`,
    );
    expect(html).toContain(
      `<span class="explainer-vocabulary-word">l'œil</span><span class="explainer-vocabulary-more">, les yeux</span>`,
    );
    expect(html).toContain(`<td data-side="source" data-row="1" lang="de"><span>das Brot</span></td>`);
  });

  test("the middle column: the example in both languages, the note, the false friend", () => {
    const html = block("zahlen/zahlen-01/");
    expect(html).toContain(`<i lang="fr">Le pain est encore chaud.</i> <span lang="de">Das Brot ist noch warm.</span>`);
    expect(html).toContain("<em>l&#39;</em> steht vor einem Vokal.");
    expect(html).toContain(`<strong>${message("de", "vocabularyFalseFriend")}</strong> Nicht nur die Karte.`);
  });

  test("no middle column when no entry has an example, a note or a false friend", () => {
    const html = block("zahlen/zahlen-02/");
    expect(html).toContain(`<thead><tr><th scope="col">Latein</th><th scope="col">Deutsch</th></tr></thead>`);
    expect(html).not.toContain("explainer-vocabulary-hint");
    expect(html).toContain(`<tr class="explainer-vocabulary-forms-row"><td colspan="2">`);
  });

  test("the forms fold under their word; the first cell heads the row, **…** is highlighted and explained", () => {
    const html = block("zahlen/zahlen-01/");
    expect(html).toContain(
      `<details class="explainer-vocabulary-forms"><summary>Konjugation im Präsens: <span lang="fr">manger</span></summary>`,
    );
    expect(html).not.toMatch(/<details[^>]* open/);
    expect(html).toContain(`<tr><th scope="row">nous</th><td lang="fr">mang<b>e</b>ons</td></tr>`);
    expect(html).toContain(message("de", "vocabularyMarked"));
    const latin = block("zahlen/zahlen-02/");
    expect(latin).toContain(
      `<thead><tr><th scope="col">Kasus</th><th scope="col">Singular</th><th scope="col">Plural</th></tr></thead>`,
    );
  });

  test("the buttons to cover a column are hidden until the client module runs", () => {
    const html = block("zahlen/zahlen-01/");
    expect(html).toMatch(/<p class="explainer-vocabulary-tools" role="group" aria-label="[^"]+" hidden>/);
    expect(html).toContain(`>${message("de", "vocabularyCover", { language: "Französisch" })}</button>`);
    expect(html).toContain(`>${message("de", "vocabularyCover", { language: "Deutsch" })}</button>`);
  });

  test("in English: the English texts and language names around the words as written", () => {
    const html = block("en/zahlen/zahlen-01/");
    expect(html).toContain("<caption>At the table</caption>");
    expect(html).toContain(`<th scope="col">French</th>`);
    expect(html).toContain(`<span class="explainer-vocabulary-word">le pain</span>`);
    expect(html).toContain(`<td data-side="source" data-row="1" lang="de"><span>das Brot</span></td>`);
    expect(html).toContain("Present tense: ");
  });
});

describe("a tutor learns of the words", () => {
  test("the tutor page lists each word with its translation, example, note, false friend and forms", () => {
    const app = site();
    const page = contentPages(app)[0];
    if (page === undefined) throw new Error("no page");
    const de = tutorPageMarkdown(app, page, "de", new Map());
    expect(de).toContain("Vokabeln (Französisch – Deutsch): Am Tisch");
    expect(de).toContain("- le pain (m) – das Brot. Beispiel: Le pain est encore chaud. – Das Brot ist noch warm.");
    expect(de).toContain("- l'œil, les yeux – das Auge");
    expect(de).toContain("- la carte – die Speisekarte. Falscher Freund: Nicht nur die Karte.");
    expect(de).toContain("  - Konjugation im Präsens: je | mange; tu | manges;");
    expect(tutorPageMarkdown(app, page, "en", new Map())).toContain("Vocabulary (French – German): At the table");
  });
});
