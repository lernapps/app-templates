// What an explainer gives a KI tutor (tutor.ts): the tutor file of each page with its sections and exercises, and for
// each seeded exercise its distinct tasks, numbered 1 to N, with their solutions and links; the part of
// llms.txt with the generic rules, the app's own and the links to the tutor files; and the check of their links.
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { describedProblems, propsIn } from "../runtime/explainer/components.ts";
import type { Block, ComponentDescription } from "../runtime/explainer/content.ts";
import { loadSite } from "../runtime/explainer/load.ts";
import { llmsTxt } from "../runtime/explainer/render.ts";
import { contentPages } from "../runtime/explainer/routes.ts";
import { dataOf, taskSeeds } from "../runtime/explainer/exercises.ts";
import {
  DEFAULT_PROVIDERS,
  plainAddress,
  providersOf,
  shortPrompt,
  tutorPrompt,
  withBase,
} from "../runtime/explainer/prompt.ts";
import { anchorsOf, linkProblems, tutorFile, tutorFileOf } from "../runtime/explainer/tutor.ts";
import * as assignLabels from "./fixtures/explainer-history/components/AssignLabels.ts";

/** The site of a fixture, which is an app's src/. */
const fixture = (name: string) => {
  const root = mkdtempSync(join(tmpdir(), "explainer-tutor-"));
  cpSync(join(import.meta.dirname, "fixtures", name), join(root, "src"), { recursive: true });
  return loadSite(root, 0);
};

describe("the tutor file of a page", () => {
  test("a generated exercise and a question: tasks by number with solutions and typical mistakes", () => {
    const site = fixture("explainer-all-blocks");
    const page = contentPages(site)[0];
    if (page === undefined) throw new Error("no page");
    const file = tutorFile(site, page, "de", new Map());
    expect(file).toContain("# Zahlen 1 – Tutor-Datei");
    expect(file).toContain("- [Grundlagen](./#grundlagen)\n  - [Tabelle](./#grundlagen/tabelle)");
    expect(file).toContain("### prozent-von-200 (single-choice)");
    expect(file).toContain("  - ✗ 20 – Das sind 10 % von 200.");
    expect(file).toContain(
      "  - [Aufgabe Nr. 1](./?prozent-rechnen=1#prozent-rechnen): Wie viel sind 1 % von 200? → Lösung: 2\n    - ✗ 200: Du hast nicht durch 100 geteilt.",
    );
    // its distinct tasks, numbered 1 to N
    const generated = [...page.blocks]
      .flatMap((block) => (block.type === "section" ? block.blocks : [block]))
      .find((block) => block.type === "generated");
    if (generated?.type !== "generated") throw new Error("no generated exercise");
    const count = taskSeeds(generated, dataOf(generated, site.data)).length;
    expect(file).toContain(`Aufgaben nach Nummer, 1 bis ${count}: jede eine andere`);
    expect(file).toContain(`[Aufgabe Nr. ${count}](./?prozent-rechnen=${count}#prozent-rechnen)`);
    expect(file).not.toContain(`prozent-rechnen=${count + 1}#prozent-rechnen`);
    // the examples are test cases, never in a tutor file
    expect(file).not.toMatch(/accepted|rejected/);
    expect(tutorFile(site, page, "en", new Map())).toContain("[Task no. 1](./?prozent-rechnen=1#prozent-rechnen)");
  });

  test("an exercise component: its about, and each number's task and solution from its describe", () => {
    const site = fixture("explainer-history");
    const use = site.components[0];
    if (use === undefined) throw new Error("no component");
    const { description } = describedProblems(
      assignLabels,
      (lang) => propsIn(use.block.props, use.component, lang),
      site.app.languages,
    );
    const descriptions = new Map<Block, ComponentDescription>([[use.block, description as ComponentDescription]]);
    const page = contentPages(site).find((candidate) => candidate.id === "staende");
    if (page === undefined) throw new Error("no page staende");
    const file = tutorFile(site, page, "de", descriptions);
    expect(file).toContain("### assign-labels (interaktive Übung AssignLabels)");
    expect(file).toContain(
      "- Was als richtig zählt: Richtig ist es nur, wenn jede Stufe ihre eigene Beschriftung hat.",
    );
    expect(file).toContain("  - Eine Beschriftung zweimal gewählt.");
    const first = description?.tasks["de"]?.[0];
    expect(file).toContain(
      `  - [Aufgabe Nr. 1](./?assign-labels=1#assign-labels): ${first?.task} → Lösung: ${first?.solution}`,
    );
    expect(file.split("](./?assign-labels=").length - 1).toBe(description?.seeds.length);
  });
});

describe("llms.txt for a tutor", () => {
  test("the generic rules, the app's own, and a link to each page's tutor file, every link resolving", () => {
    const site = fixture("explainer-all-blocks");
    const text = llmsTxt(site, "de");
    expect(text).toContain("## Hinweise für einen KI-Tutor");
    expect(text).toContain("Verrate keine Lösung, bevor sich die lernende Person auf eine Antwort festgelegt hat.");
    expect(text).toContain("### Regeln dieser App\n\nGerechnet wird auf Papier");
    for (const page of contentPages(site)) expect(text).toContain(`](${tutorFileOf(page)})`);
    expect(llmsTxt(site, "en")).toContain("## Notes for an AI tutor");
    const files = new Set([
      "llms.txt",
      "tutor.md",
      "",
      ...contentPages(site).flatMap((page) => [`${page.chapter}/${page.id}/`, tutorFileOf(page)]),
      "zahlen/",
      "formen/",
      "glossar/",
    ]);
    const anchors = new Map(contentPages(site).map((page) => [`${page.chapter}/${page.id}/`, anchorsOf(site, page)]));
    expect(linkProblems("llms.txt", text, files, anchors)).toEqual([]);
  });

  test("a link to a file the build does not write, or to an anchor its page does not have, is a problem", () => {
    const files = new Set(["llms.txt", "a/b/", "a/b/tutor.md"]);
    const anchors = new Map([["a/b/", new Set(["uebung"])]]);
    expect(
      linkProblems(
        "a/b/tutor.md",
        "[ok](./?uebung=3#uebung) [x](./#fehlt) [y](../c/) [z](https://example.org/)",
        files,
        anchors,
      ),
    ).toEqual([
      "a/b/tutor.md: the link ./#fehlt names the anchor #fehlt, which a/b/ does not have",
      "a/b/tutor.md: the link ../c/ leads to a/c/, which the build does not write",
    ]);
  });
});

describe("the tutor prompt", () => {
  test("role, approach, the pages as a checklist with links, the rules and the app's own, from a base", () => {
    const site = fixture("explainer-all-blocks");
    const prompt = tutorPrompt(site, "de");
    expect(prompt).toMatch(/^# KI-Tutor: Alle Blöcke\n\n## 1\. Rolle\n/);
    expect(prompt).toContain(
      "1. Zahlen: Zahlen 1 – Seite 1 der Fixture mit allen Blöcken. ([Seite](⟦base⟧zahlen/zahlen-01/), [Tutor-Datei](⟦base⟧zahlen/zahlen-01/tutor.md))",
    );
    expect(prompt).toContain("Lies zuerst ⟦base⟧llms.txt");
    expect(prompt).toContain("Regeln dieser App:\n\nGerechnet wird auf Papier");
    const copied = withBase(prompt, "https://lernapps.net/alle/");
    expect(copied).toContain("https://lernapps.net/alle/llms.txt");
    expect(copied).not.toContain("⟦base⟧");
    // the short prompt names every address the tutor may fetch: it fetches only what the user's message names
    const short = withBase(shortPrompt(site, "en"), "https://lernapps.net/alle/en/");
    expect(short).toContain(
      "Read https://lernapps.net/alle/en/tutor.md and be my tutor for the learning app “All blocks”, exactly as it says.",
    );
    expect(short).toContain("- https://lernapps.net/alle/en/llms.txt");
    for (const page of contentPages(site)) {
      expect(short).toContain(`- https://lernapps.net/alle/en/${tutorFileOf(page)}`);
    }
    expect(prompt).toContain("Alle Adressen in dieser Anleitung darfst du abrufen.");
    // the static tutor.md: every link resolves from the root of its language tree
    const files = new Set([
      "llms.txt",
      ...contentPages(site).flatMap((page) => [`${page.chapter}/${page.id}/`, tutorFileOf(page)]),
    ]);
    expect(linkProblems("tutor.md", withBase(prompt, ""), files, new Map())).toEqual([]);
  });

  test("the providers: Claude by default, a link without the prompt for readers without JavaScript", () => {
    const site = fixture("explainer-all-blocks");
    expect(providersOf(site)).toEqual(DEFAULT_PROVIDERS);
    expect(plainAddress("https://claude.ai/new?q={prompt}")).toBe("https://claude.ai/new");
    expect(plainAddress("https://example.org/chat?model=a&text={prompt}")).toBe("https://example.org/chat?model=a");
    expect(plainAddress("https://example.org/chat")).toBe("https://example.org/chat");
  });
});
