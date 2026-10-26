// The tutor page of a content page (<chapter>/<page>/tutor/, tutorpage.ts), the one address a tutor's prompt names
// and the one source of what the tutor gets: a short guide, visible to everyone, the page's content as context, and
// its exercises with every task number, a generated one as its template and a table of inputs and outputs.
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { describedProblems } from "../runtime/explainer/components/exercise.ts";
import { propsIn } from "../runtime/explainer/components/props.ts";
import type { Block, ComponentDescription, Site } from "../runtime/explainer/content.ts";
import { dataOf, taskSeeds } from "../runtime/explainer/exercises.ts";
import { Fraction } from "../runtime/explainer/fraction.ts";
import { generate } from "../runtime/explainer/generated/values.ts";
import { loadSite } from "../runtime/explainer/load.ts";
import { contentPages, routes } from "../runtime/explainer/routes.ts";
import {
  bytesOf,
  tutorPage,
  TUTOR_PAGE_BUDGET,
  tutorPageDocument,
  tutorPageHtml,
  tutorPageMarkdown,
} from "../runtime/explainer/tutorpage.ts";
import { anchorsOf, linkProblems, tutorPageOf } from "../runtime/explainer/tutor.ts";
import * as assignLabels from "./fixtures/explainer-history/components/AssignLabels.ts";

const fixture = (name: string): Site => {
  const root = mkdtempSync(join(tmpdir(), "explainer-tutorpage-"));
  cpSync(join(import.meta.dirname, "fixtures", name), join(root, "src"), { recursive: true });
  return loadSite(root, 0);
};

/** The history fixture with what its component describes, as the build reads it. */
function history(): { site: Site; descriptions: Map<Block, ComponentDescription> } {
  const site = fixture("explainer-history");
  const use = site.components[0];
  if (use === undefined) throw new Error("no component");
  const { description } = describedProblems(
    assignLabels,
    (lang) => propsIn(use.block.props, use.component, lang),
    site.app.languages,
  );
  return { site, descriptions: new Map([[use.block, description as ComponentDescription]]) };
}

/** The files and page folders of a language tree, and each page folder's anchors, for the check of links. */
function tree(site: Site, lang: string) {
  const files = new Set([
    ...routes(site)
      .filter((route) => route.lang === lang)
      .map((route) => route.local),
    ...contentPages(site).map((page) => tutorPageOf(page)),
  ]);
  const anchors = new Map(contentPages(site).map((page) => [`${page.chapter}/${page.id}/`, anchorsOf(site, page)]));
  return { files, anchors };
}

/** The first content page of `site` and its tutor page in German, as Markdown. */
function firstPage(site: Site, descriptions: Map<Block, ComponentDescription> = new Map()) {
  const page = contentPages(site)[0];
  if (page === undefined) throw new Error("no page");
  return { page, text: tutorPageMarkdown(site, page, "de", descriptions) };
}

describe("the tutor page of a content page", () => {
  test("who the tutor helps, how it guides, where the child is: short, and visible to everyone", () => {
    const site = fixture("explainer-all-blocks");
    const { page, text } = firstPage(site);
    expect(text).toMatch(/^# Zahlen 1 – für deinen KI-Tutor\n\nDu hilfst einem Kind beim Lernen\./);
    expect(text).toContain("Lern-App „Alle Blöcke“ von lernapps.net, gerade auf der Seite „Zahlen 1“");
    expect(text).toContain("## So leitest du an");
    expect(text).toContain("- Antworte kurz: höchstens drei Sätze und eine Frage. Keine Überschriften, keine Listen.");
    // two starts: learning the page leads through it first; help at a task starts at the task
    expect(text).toContain("## So beginnst du");
    expect(text).toContain("Frag zuerst, was das Kind über das Thema schon weiß.");
    expect(text).toContain("geh die Seite der Reihe nach durch, ein Abschnitt pro Nachricht");
    expect(text).toContain("ein „Ja“ reicht nicht");
    expect(text).toContain("Setz direkt bei dieser Aufgabe an.");
    expect(text).toContain("Erfinde keine eigenen.");
    expect(text).toContain("Verrate keine Lösung.");
    expect(text).toContain("Bitte das Kind nie, eine Aufgabe abzuschreiben.");
    expect(text).toContain("## Wo das Kind gerade ist");
    expect(text).toContain(
      "je Übung die Nummer der Aufgabe, die das Kind gerade vor sich hat, z. B. `?prozent-rechnen=12`",
    );
    expect(text).toContain("Schlag die Nummern unten bei den Übungen nach.");
    expect(text).toContain("Gerechnet wird in der App");
    expect(text).toContain("Rechne nichts selbst aus");
    expect(text).toContain("dieser Tutor-Seite ohne `tutor/` und ohne `?…`");
    expect(text).toContain("z. B. `…/zahlen-01/?prozent-rechnen=12&von=tutor#prozent-rechnen`");
    expect(text).toContain("nimm eine andere Nummer der Übung");
    expect(text).toContain("„Die App sagt: …“");
    expect(text).toContain("kommt von „Zurück“ in der App");
    expect(text).toContain("„Löse sie in der App und drück dann ‚Zurück‘. Füg die Zeile hier ein.“");
    // the app's own rules
    expect(text).toContain("## Regeln dieser App\n\nGerechnet wird auf Papier");
    expect(text).toContain("## Kontext: die Seite „Zahlen 1“");
    // only this page
    expect(text).not.toContain("Zahlen 2");
    expect(tutorPageMarkdown(site, page, "en", new Map())).toContain("## How you guide");
  });

  test("the page's content as context", () => {
    const site = fixture("explainer-all-blocks");
    const { page, text } = firstPage(site);
    // a section and its content: formulas as $…$, a definition, a figure by its words, a table, examples and notes
    expect(text).toContain("### Grundlagen\n\n$\\frac{1}{100} \\cdot 200 = 2$\n");
    expect(text).toContain("- **Begriff 1**: Ein Begriff, den Seite 1 erklärt, mit $1\\,\\%$.");
    expect(text).toContain("Bild: Ein Hunderterfeld, 1 von 100 Kästchen gefärbt. Bildunterschrift: 1 % des Ganzen.");
    expect(text).toContain("#### Tabelle");
    expect(text).toContain("- Prozentsatz | 1 | $p = 1$");
    expect(text).toContain("**Beispiel: Beispiel 1**");
    expect(text).toContain("**Merke: Merke**");
    expect(text).toContain("Weiter geht es mit der nächsten Seite.");
    expect(text).toContain("> Πάντα ῥεῖ\n>\n> – Heraklit, um 500 v. Chr.");
    expect(text).toContain("```python\ndef doppelt(n):\n    return 2 * n\n");
    expect(text).toContain("Beschriftungen: 1 Kreis, 2 Quadrat, 3 Dreieck");
    expect(text).not.toMatch(/\.\.\s/);
    const { files, anchors } = tree(site, "de");
    expect(linkProblems(tutorPageOf(page), text, files, anchors)).toEqual([]);
  });

  test("a generated exercise: once as its template, then its inputs and outputs by number", () => {
    const site = fixture("explainer-all-blocks");
    const { page, text } = firstPage(site);
    const block = page.blocks
      .flatMap((candidate) => (candidate.type === "section" ? candidate.blocks : [candidate]))
      .find((candidate) => candidate.type === "generated");
    if (block?.type !== "generated") throw new Error("no generated exercise");
    expect(text).toContain("### Übung prozent-rechnen\n");
    expect(text).toContain("- Aufgabe: „Wie viel sind {p} % von {G}?“");
    expect(text).toContain("  - F1: „Du hast nicht durch 100 geteilt.“");
    expect(text).toContain("- Tipp der App: „1 % von {G} ist $\\frac{{G}}{100}$.“");
    expect(text).toContain("- Link zu Nummer n: `../?prozent-rechnen=n&von=tutor#prozent-rechnen`");
    expect(text).toContain("`{answer}` ist die Lösung.");
    // nothing for the tutor to work out: no expressions, no conditions
    expect(text).not.toContain("`G * p / 100`");
    expect(text).not.toContain("`G * p`");
    // the examples are test cases
    expect(text).not.toContain("G / 100 * p");
    // one row by number: the values of its placeholders, the solution and what each mistake gives
    const seeds = taskSeeds(block, dataOf(block, site.data));
    const table = /\n```\nNr\. \| p \| G \| Lösung \| F1\n([^`]*)```/.exec(text)?.[1]?.trim().split("\n") ?? [];
    expect(table.length).toBe(seeds.length);
    table.forEach((row, index) => {
      const task = generate(block, seeds[index] ?? 0, dataOf(block, site.data));
      const number = (name: string) => (task.values[name] as Fraction).toNumber();
      const G = number("G");
      const p = number("p");
      expect(row).toBe(`${index + 1} | ${p} | ${G} | ${(G * p) / 100} | ${G * p}`);
    });
    // never a task's text by number
    expect(text).not.toMatch(/Wie viel sind (?!1 % von 200\?)\d+ % von \d+\?/);
    // a question without numbers: in full, linked as the exercise on its page
    expect(text).toContain("### Übung prozent-von-200\n");
    expect(text).toContain("- Link: [../?von=tutor#prozent-von-200](../?von=tutor#prozent-von-200)");
  });

  test("an exercise component: what it says about itself, and each number's task and solution from its describe", () => {
    const { site, descriptions } = history();
    const page = contentPages(site).find((candidate) => candidate.id === "staende");
    const use = site.components[0];
    if (page === undefined || use === undefined) throw new Error("no page staende");
    const { markdown: text, cut } = tutorPage(site, page, "de", descriptions);
    expect(cut).toEqual([]);
    expect(text).toContain("### Übung assign-labels");
    expect(text).toContain(
      "- Was als richtig zählt: Richtig ist es nur, wenn jede Stufe ihre eigene Beschriftung hat.",
    );
    expect(text).toContain("- Link zu Nummer n: `../?assign-labels=n&von=tutor#assign-labels`");
    const tasks = descriptions.get(use.block)?.tasks["de"] ?? [];
    expect(tasks.length).toBeGreaterThan(1);
    for (const task of tasks) {
      const one = (value: string) => value.replace(/\s+/g, " ").trim();
      expect(text).toContain(`  - Nr. ${task.number}: ${one(task.task)} → Lösung: ${one(task.solution)}`);
    }
    const { files, anchors } = tree(site, "de");
    expect(linkProblems(tutorPageOf(page), text, files, anchors)).toEqual([]);
  });

  test("an exercise component beyond the budget: as many numbers as fit, and the page says so", () => {
    const { site, descriptions } = history();
    const page = contentPages(site).find((candidate) => candidate.id === "staende");
    if (page === undefined) throw new Error("no page staende");
    const whole = tutorPage(site, page, "de", descriptions);
    const budget = bytesOf(tutorPageDocument(whole.markdown, site, page, "de")) - 400;
    const { markdown, cut } = tutorPage(site, page, "de", descriptions, budget);
    expect(cut.length).toBe(1);
    const [only] = cut;
    expect(only?.id).toBe("assign-labels");
    expect(only?.shown).toBeGreaterThan(0);
    expect(only?.shown).toBeLessThan(only?.count ?? 0);
    expect(markdown).toContain(`  - Nr. ${only?.shown ?? 0}: `);
    expect(markdown).not.toContain(`  - Nr. ${(only?.shown ?? 0) + 1}: `);
    expect(markdown).toContain(
      `- Hier stehen die Nummern 1 bis ${only?.shown ?? 0} von ${only?.count ?? 0}. Sitzt das Kind an einer anderen Nummer, schick ihm den Link zu einer Nummer von hier.`,
    );
    expect(bytesOf(tutorPageDocument(markdown, site, page, "de"))).toBeLessThanOrEqual(budget);
  });

  test("lean HTML: its language and title, no script, no menu, a formula as written; small", () => {
    const site = fixture("explainer-all-blocks");
    for (const lang of site.app.languages) {
      for (const page of contentPages(site)) {
        const html = tutorPageHtml(site, page, lang, new Map());
        expect(html).toMatch(new RegExp(`^<!doctype html>\\n<html lang="${lang}">`));
        expect(html).toMatch(/<title>[^<]+<\/title>/);
        expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1" />');
        expect(html).not.toMatch(/<script|<nav|<link /);
        expect(html).toContain('<main id="anleitung">');
        expect(bytesOf(html)).toBeLessThan(TUTOR_PAGE_BUDGET);
        expect(html).not.toMatch(/(Aufgabe Nr\.|Task no\.) \d+\]/);
      }
    }
    const page = contentPages(site)[0];
    if (page === undefined) throw new Error("no page");
    expect(tutorPageDocument("Mit $a_1 * b_2 * c$ und *x*.", site, page, "de")).toContain(
      "<p>Mit $a_1 * b_2 * c$ und <em>x</em>.</p>",
    );
  });
});
