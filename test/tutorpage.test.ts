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
  tableHint,
  tutorPage,
  TUTOR_PAGE_BUDGET,
  tutorPageDocument,
  tutorPageHtml,
  tutorPageMarkdown,
} from "../runtime/explainer/tutorpage.ts";
import { anchorsOf, linkProblems, tutorPageOf } from "../runtime/explainer/tutor.ts";
import { NEEDS } from "../runtime/explainer/needs.ts";
import * as assignLabels from "./fixtures/explainer-history/components/AssignLabels.ts";
import type { Props, Task } from "./fixtures/explainer-history/components/AssignLabels.ts";
import { SCOPE_PAGE, scopeFiles } from "../runtime/explainer/scope.ts";

const fixture = (name: string): Site => {
  const root = mkdtempSync(join(tmpdir(), "explainer-tutorpage-"));
  cpSync(join(import.meta.dirname, "fixtures", name), join(root, "src"), { recursive: true });
  return loadSite(root, 0);
};

/** The logic of AssignLabels without its table of tasks: a component that declares no inputs and outputs. */
const { template: _template, params: _params, mistakes: _mistakes, show: _show, ...undeclared } = assignLabels;

/** The history fixture with what its component describes, as the build reads it (`logic`: its logic module). */
function history(logic: Parameters<typeof describedProblems>[0] = assignLabels): {
  site: Site;
  descriptions: Map<Block, ComponentDescription>;
} {
  const site = fixture("explainer-history");
  const use = site.components[0];
  if (use === undefined) throw new Error("no component");
  const { description } = describedProblems(
    logic,
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
    // the scopes beside the app, each chapter and each page, as the build writes them (plugin.ts)
    ...(site.scope === undefined ? [] : [...scopeFiles(site.scope).keys()].map((folder) => `${folder}${SCOPE_PAGE}`)),
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
    expect(text).toContain("Schlag Übung und Nummer unten nach und setz bei dieser Aufgabe an.");
    // help after a wrong input, in the order of what the message brings: the app's message, the input, else a question
    expect(text).toContain(
      "Steht da „Die App sagt: …“, such den Fehler (F1, F2 …) der Übung, zu dem die Meldung passt: Das ist der Fehler des Kindes. Nennt die Nachricht eine Eingabe und steht sie bei dieser Nummer in einer Spalte F…, bestätigt das den Fehler. Sag in einem Satz, was an genau dieser Eingabe nicht zur Aufgabe passt, und wiederhol die Meldung nicht. Fehlt beides, frag, was das Kind eingegeben oder gebaut hat und wo es hängt.",
    );
    // what the child does not see, and what it can do, for an exercise component
    expect(text).toContain(
      "„(verdeckt)“ heißt, steht nicht im Text der Aufgabe: Das Kind sieht ihn nicht, nenn ihn nicht.",
    );
    expect(text).toContain(
      "steht bei der Übung unter „Was zu tun ist“ und „Antwortformat“. Beschreib keine anderen Knöpfe",
    );
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
    expect(text).toContain("z. B. `…/zahlen/zahlen-01/?prozent-rechnen=12&via=tutor#prozent-rechnen`");
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

  test("the needs: a short section for each, which holds when the query names it, after the guide", () => {
    const site = fixture("explainer-all-blocks");
    const { page, text } = firstPage(site);
    const needs = text.indexOf("## Besondere Anforderungen");
    expect(needs).toBeGreaterThan(text.indexOf("## Wo das Kind gerade ist"));
    expect(needs).toBeLessThan(text.indexOf("## Kontext: die Seite"));
    expect(text).toContain("Nennt die Adresse dieser Seite `bedarf=`, gilt jeder Abschnitt, den sie nennt");
    expect(text).toContain("widersprechen sich zwei, gilt der strengere");
    for (const need of NEEDS) expect(text).toContain(`- \`${need}\`: `);
    // short, so that they do not drown the guide: at most two sentences of about 200 characters each
    const sections = text
      .slice(needs)
      .split("\n")
      .filter((line) => /^- `[a-z-]+`: /.test(line));
    expect(sections).toHaveLength(NEEDS.length);
    for (const section of sections) expect(section.length).toBeLessThan(260);
    expect(tutorPageMarkdown(site, page, "en", new Map())).toContain("## Special requirements");
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
    expect(text).toContain("- Link zu Nummer n: `../?prozent-rechnen=n&via=tutor#prozent-rechnen`");
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
    expect(text).toContain("- Link: [../?via=tutor#prozent-von-200](../?via=tutor#prozent-von-200)");
  });

  test("an exercise component with its table of tasks: its task once, its mistakes as F1, F2 …, every number's inputs and outputs", () => {
    const { site, descriptions } = history();
    const page = contentPages(site).find((candidate) => candidate.id === "staende");
    const use = site.components[0];
    if (page === undefined || use === undefined) throw new Error("no page staende");
    // all numbers, however small the budget
    const { markdown: text, cut } = tutorPage(site, page, "de", descriptions, 1000);
    expect(cut).toEqual([]);
    const part = text.slice(text.indexOf("### Übung assign-labels"));
    expect(part).toContain("- Was zu tun ist: Jede Stufe einer Pyramide");
    expect(part).toContain(
      "- Aufgabe: „Welcher Stand gehört auf welche Stufe der Pyramide? Die Stufen, von oben nach unten: Stufe 1, Stufe 2, Stufe 3. Zur Wahl stehen, in dieser Reihenfolge: {Wahl}.“",
    );
    expect(part).toContain(
      "- Typische Fehler (die Meldung der App passt zu einem davon):\n  - F1: Die Reihenfolge umgedreht: unten, was oben hingehört.\n  - F2: Eine Beschriftung zweimal gewählt.",
    );
    expect(part).toContain("- Link zu Nummer n: `../?assign-labels=n&via=tutor#assign-labels`");
    expect(part).toContain(
      "- Aufgaben nach Nummer: die Werte für `{…}`, die Lösung und was bei den Fehlern herauskommt. Ein Fehler ohne Spalte hat keinen festen Wert; die Meldung der App sagt, ob er vorliegt.\n\n```\nNr. | Wahl | Lösung | F1 | F2\n",
    );
    const exercise = descriptions.get(use.block)?.exercise?.["de"];
    expect(exercise?.tasks.length).toBeGreaterThan(1);
    exercise?.tasks.forEach((row, index) =>
      expect(part).toContain(`\n${[String(index + 1), ...row.inputs, row.solution, ...row.mistakes].join(" | ")}\n`),
    );
    // no task by number from describe
    expect(part).not.toContain("  - Nr. 1: ");
    expect(part).not.toContain("Aufgaben nach Nummer, mit Lösung");
    const { files, anchors } = tree(site, "de");
    expect(linkProblems(tutorPageOf(page), text, files, anchors)).toEqual([]);
  });

  test("a mistake without an answer for any number has no column, and an input the task's text does not show is hidden", () => {
    const { site, descriptions } = history({
      ...assignLabels,
      params: (task: Task, props: Props, lang: string) => ({
        ...assignLabels.params(task, props, lang),
        Erste: task.order[0] ?? 0,
      }),
      mistakes: (task: Task) => [assignLabels.mistakes(task)[0], undefined],
    });
    const page = contentPages(site).find((candidate) => candidate.id === "staende");
    if (page === undefined) throw new Error("no page staende");
    const { markdown: text } = tutorPage(site, page, "de", descriptions);
    const part = text.slice(text.indexOf("### Übung assign-labels"));
    // F2 stays as the description of a mistake, without a column
    expect(part).toContain("  - F2: Eine Beschriftung zweimal gewählt.");
    expect(part).toContain("```\nNr. | Wahl | Erste (verdeckt) | Lösung | F1\n1 | ");
  });

  test("an exercise component without its table of tasks: what it says about itself, and each number's task and solution from its describe", () => {
    const { site, descriptions } = history(undeclared);
    const page = contentPages(site).find((candidate) => candidate.id === "staende");
    const use = site.components[0];
    if (page === undefined || use === undefined) throw new Error("no page staende");
    const { markdown: text, cut } = tutorPage(site, page, "de", descriptions);
    expect(cut).toEqual([]);
    expect(text).toContain("### Übung assign-labels");
    expect(text).toContain(
      "- Was als richtig zählt: Richtig ist es nur, wenn jede Stufe ihre eigene Beschriftung hat.",
    );
    // its mistakes numbered all the same, which the app's message names one of
    expect(text).toContain("  - F1: Die Reihenfolge umgedreht: unten, was oben hingehört.");
    expect(text).toContain("- Link zu Nummer n: `../?assign-labels=n&via=tutor#assign-labels`");
    const tasks = descriptions.get(use.block)?.tasks["de"] ?? [];
    expect(tasks.length).toBeGreaterThan(1);
    for (const task of tasks) {
      const one = (value: string) => value.replace(/\s+/g, " ").trim();
      expect(text).toContain(`  - Nr. ${task.number}: ${one(task.task)} → Lösung: ${one(task.solution)}`);
    }
    const { files, anchors } = tree(site, "de");
    expect(linkProblems(tutorPageOf(page), text, files, anchors)).toEqual([]);
  });

  test("an exercise component without its table beyond the budget: as many numbers as fit, and the page says so", () => {
    const { site, descriptions } = history(undeclared);
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

  test("a hint for each exercise component without its table of tasks, none for one with it", () => {
    expect(tableHint(history().site, history().descriptions)).toBeUndefined();
    const { site, descriptions } = history(undeclared);
    expect(tableHint(site, descriptions)).toBe(
      "lernapps explainer: 1 exercise component declares no table of tasks, so its tutor page has its tasks only as text, as many as fit; export template(props, lang), params(task, props, lang), mistakes(task, props) and show(answer, task, props, lang) from its logic module: src/revolution/staende.yaml:50: blocks[0].blocks[3]: AssignLabels (vue-component-tutor-table)",
    );
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
