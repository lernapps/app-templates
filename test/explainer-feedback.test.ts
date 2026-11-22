// The feedback mode of an explainer: the build gives every block of a content page its address (block-id.ts: its
// position among the sections and boxes, an id from its source, its type and order), finds the app's repository and
// commit (repository.ts), and writes the mode's ways in and its bar, hidden until the client module runs; what the
// mode keeps and writes (feedback.ts): the check of stored notes, their order, the Markdown of the export and the
// address of a new issue. The mode in the browser is tested end to end (runtime/explainer/e2e.ts).
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { blockId, blockPosition, canonical } from "../runtime/explainer/block-id.ts";
import {
  exportMarkdown,
  isNotes,
  issueAddress,
  placeOf,
  shorten,
  sortNotes,
  switchesOn,
  type Note,
} from "../runtime/explainer/feedback.ts";
import { loadSite } from "../runtime/explainer/load.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";
import { githubRepository, repositoryOf, revisionOf } from "../runtime/shared/repository.ts";

/** The site of the all-blocks fixture, which is an app's src/, in a folder without git. */
function site(env?: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "explainer-feedback-"));
  cpSync(join(import.meta.dirname, "fixtures/explainer-all-blocks"), join(root, "src"), { recursive: true });
  const saved = { repository: process.env["GITHUB_REPOSITORY"], sha: process.env["GITHUB_SHA"] };
  delete process.env["GITHUB_REPOSITORY"];
  delete process.env["GITHUB_SHA"];
  Object.assign(process.env, env);
  try {
    return loadSite(root, 0);
  } finally {
    for (const [key, value] of [
      ["GITHUB_REPOSITORY", saved.repository],
      ["GITHUB_SHA", saved.sha],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

/** The body of the page at `path` (from the app's root), as the build writes it. */
function body(path: string, env?: Record<string, string>): string {
  const app = site(env);
  const route = routes(app).find((candidate) => candidate.path === path);
  if (route === undefined) throw new Error(`no page ${path}`);
  return renderPage(app, route).body;
}

/** The addresses of the blocks of a page's body, in order. */
const blocks = (html: string) =>
  [
    ...html.matchAll(
      /<div class="explainer-block" data-block="([^"]+)" data-block-id="([0-9a-f]{8})" data-block-type="([^"]+)" data-block-order="(\d+)">/g,
    ),
  ].map(([, position, id, type, order]) => ({ position, id, type, order: Number(order) }));

describe("the address of a block", () => {
  test("its id is a hash of its source: the same for the same block, whatever the order of its keys", () => {
    const a = { type: "text", text: { de: "Hallo", en: "Hello" } };
    const b = { text: { en: "Hello", de: "Hallo" }, type: "text" };
    expect(canonical(a)).toBe(canonical(b));
    expect(blockId(a)).toMatch(/^[0-9a-f]{8}$/);
    expect(blockId(a)).toBe(blockId(b));
  });

  test("its id changes when the block does, in any language", () => {
    const a = { type: "text", text: { de: "Hallo", en: "Hello" } };
    expect(blockId({ ...a, text: { de: "Hallo", en: "Hi" } })).not.toBe(blockId(a));
  });

  test("its position: the sections and boxes it is in, and its place there", () => {
    expect(blockPosition([], 2)).toBe("2");
    expect(blockPosition(["regel"], 3)).toBe("regel/3");
    expect(blockPosition(["regel", 4], 1)).toBe("regel/4/1");
    expect(placeOf("regel/4/1")).toBe("4.1");
    expect(placeOf("grundlagen/tabelle/1")).toBe("1");
  });

  test("the build wraps every block of a content page but the sections, in the page's order", () => {
    const found = blocks(body("formen/formen-01/"));
    expect(found.slice(0, 5).map(({ position, type }) => [position, type])).toEqual([
      ["1", "text"],
      ["grundlagen/1", "formula"],
      ["grundlagen/2", "definition"],
      ["grundlagen/3", "figure"],
      ["grundlagen/tabelle/1", "table"],
    ]);
    expect(found.map(({ order }) => order)).toEqual(found.map((_, index) => index + 1));
    expect(body("formen/formen-01/")).not.toMatch(/data-block="[^"]*" data-block-id="[^"]*" data-block-type="section"/);
  });

  test("a block has the same id in every language, and the start page has no blocks", () => {
    const de = blocks(body("formen/formen-01/"));
    const en = blocks(body("en/formen/formen-01/"));
    expect(en.map(({ id }) => id)).toEqual(de.map(({ id }) => id));
    expect(blocks(body(""))).toEqual([]);
  });
});

describe("the app's repository and commit", () => {
  test("from a remote on github.com, over HTTPS or SSH", () => {
    expect(githubRepository("https://github.com/lernapps/prozent.git")).toBe("lernapps/prozent");
    expect(githubRepository("https://github.com/lernapps/prozent")).toBe("lernapps/prozent");
    expect(githubRepository("https://x-access-token:abc@github.com/lernapps/prozent.git")).toBe("lernapps/prozent");
    expect(githubRepository("git@github.com:lernapps/prozent.git")).toBe("lernapps/prozent");
    expect(githubRepository("ssh://git@github.com/lernapps/prozent.git")).toBe("lernapps/prozent");
  });

  test("nothing from a remote elsewhere", () => {
    expect(githubRepository("https://gitlab.com/lernapps/prozent.git")).toBeUndefined();
    expect(githubRepository("http://127.0.0.1:1234/git/lernapps/prozent")).toBeUndefined();
    expect(githubRepository("https://github.com/lernapps")).toBeUndefined();
  });

  test("GitHub Actions' variables first; a folder without git gives nothing", () => {
    const folder = mkdtempSync(join(tmpdir(), "no-git-"));
    expect(repositoryOf(folder, { GITHUB_REPOSITORY: "lernapps/prozent" })).toBe("lernapps/prozent");
    expect(revisionOf(folder, { GITHUB_SHA: "643d4f1a2b3c4d5e6f708192a3b4c5d6e7f80912" })).toBe("643d4f1");
    expect(repositoryOf(folder, {})).toBeUndefined();
    expect(revisionOf(folder, {})).toBeUndefined();
  });
});

describe("the ways into the mode and its bar", () => {
  test("a content page: the line at the end of its content, hidden, and the bar in a template, with the page's data", () => {
    const html = body("formen/formen-01/", { GITHUB_REPOSITORY: "lernapps/alle-bloecke", GITHUB_SHA: "abcdef1234567" });
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
    expect(main).toContain(
      '<p class="explainer-feedback-invite" hidden><span>Fehler gefunden oder eine Idee für diese App?</span> <button type="button" class="explainer-feedback-switch">Feedback zu „Alle Blöcke“ geben</button></p>',
    );
    expect(html).toContain(
      '<template class="explainer-feedback-template">\n<aside class="explainer-feedback" aria-labelledby="feedback-titel" hidden>',
    );
    expect(html).toContain('<a class="explainer-feedback-issue"');
    const data = /<script type="application\/json" class="explainer-feedback-data">(.*?)<\/script>/.exec(html)?.[1];
    expect(JSON.parse(data ?? "{}")).toEqual({
      storage: "explainer",
      app: "Alle Blöcke",
      root: "../../",
      repository: "lernapps/alle-bloecke",
      revision: "abcdef1",
      page: { title: "Formen 1", order: 2 },
    });
  });

  test("the start page: its section for teachers and parents in a template; no link to an issue without a repository", () => {
    const html = body("");
    expect(html).toContain(
      '<template class="explainer-feedback-about-template">\n<section class="explainer-feedback-about" aria-labelledby="verbesserungen">',
    );
    expect(html).toContain("Verbesserungen vorschlagen");
    expect(html).not.toContain("explainer-feedback-invite");
    expect(html).not.toContain("explainer-feedback-issue");
  });
});

const note = (fields: Partial<Note>): Note => ({
  id: "n",
  created: "2026-11-22T10:00:00.000Z",
  lang: "de",
  url: "https://lernapps.net/prozent/prozent/prozentwert/",
  page: "Prozentwert",
  pageOrder: 1,
  position: "regel/3",
  blockId: "5be07c92",
  blockType: "text",
  blockOrder: 4,
  excerpt: "Der Grundwert G ist das Ganze, also 100 % …",
  text: "Passt nicht hierher.",
  ...fields,
});

describe("what the mode keeps and writes", () => {
  test("stored notes are checked; anything else is not taken for them", () => {
    expect(isNotes([note({})])).toBe(true);
    expect(isNotes([note({ section: "Regel", selection: "mAh", changed: true })])).toBe(true);
    expect(isNotes([{ ...note({}), pageOrder: "1" }])).toBe(false);
    expect(isNotes({})).toBe(false);
  });

  test("the notes in the app's order: pages, then blocks, then time", () => {
    const later = note({ id: "c", pageOrder: 2, blockOrder: 1 });
    const second = note({ id: "b", blockOrder: 5 });
    const first = note({ id: "a", blockOrder: 1 });
    const again = note({ id: "d", blockOrder: 5, created: "2026-11-22T11:00:00.000Z" });
    expect(sortNotes([later, again, second, first]).map(({ id }) => id)).toEqual(["a", "b", "d", "c"]);
  });

  test("a block's text, shortened at a word", () => {
    expect(shorten("  kurz  und\n gut ", 100)).toBe("kurz und gut");
    expect(shorten("Der Grundwert G ist das Ganze, also 100 %.", 20)).toBe("Der Grundwert G ist …");
  });

  test("the export: Markdown with a heading per page, where each note is, its quote, and the commit unseen", () => {
    const text = exportMarkdown(
      [
        note({ id: "b", section: "Regel", selection: "mAh (Milliamperestunden)", text: "Besser als Fußnote." }),
        note({
          id: "a",
          url: "https://lernapps.net/prozent/prozent/prozentsatz/",
          page: "Prozentsatz",
          pageOrder: 2,
          position: "beispiel/2",
          blockId: "e7710b3f",
          blockType: "single-choice",
          excerpt: "",
          changed: true,
          text: "Die Lösung rundet falsch.",
        }),
      ],
      {
        lang: "de",
        app: "Prozentrechnung",
        address: "https://lernapps.net/prozent/",
        date: "22.11.2026",
        revision: "643d4f1",
      },
    );
    expect(text).toBe(
      [
        "## Feedback zu „Prozentrechnung“",
        "",
        "2 Notizen · https://lernapps.net/prozent/ · 22.11.2026",
        "<!-- Stand: 643d4f1 -->",
        "",
        "### Prozentwert",
        "",
        "https://lernapps.net/prozent/prozent/prozentwert/",
        "",
        "**Regel · Block 3 · Text** `5be07c92`",
        "",
        "> Der Grundwert G ist das Ganze, also 100 % …",
        "> Markiert: „mAh (Milliamperestunden)“",
        "",
        "Besser als Fußnote.",
        "",
        "### Prozentsatz",
        "",
        "https://lernapps.net/prozent/prozent/prozentsatz/",
        "",
        "**Block 2 · Aufgabe** `e7710b3f` · _Stelle seit der Notiz geändert_",
        "",
        "Die Lösung rundet falsch.",
        "",
      ].join("\n"),
    );
  });

  test("in English, with one note and no commit", () => {
    const text = exportMarkdown([note({ lang: "en" })], {
      lang: "en",
      app: "Percentages",
      address: "https://lernapps.net/prozent/en/",
      date: "11/22/2026",
    });
    expect(text.split("\n").slice(0, 4)).toEqual([
      "## Feedback on “Percentages”",
      "",
      "1 note · https://lernapps.net/prozent/en/ · 11/22/2026",
      "",
    ]);
  });

  test("the new issue: the app's repository, its title and a comment to paste the notes in the address", () => {
    const address = new URL(issueAddress("lernapps/prozent", "Prozentrechnung", "de"));
    expect(`${address.origin}${address.pathname}`).toBe("https://github.com/lernapps/prozent/issues/new");
    expect(address.searchParams.get("title")).toBe("Feedback: Prozentrechnung");
    expect(address.searchParams.get("body")).toMatch(/^<!-- Füg hier den Text ein, den die App .* -->$/);
  });

  test("?feedback in the address switches the mode on", () => {
    expect(switchesOn("https://lernapps.net/prozent/?feedback")).toBe(true);
    expect(switchesOn("https://lernapps.net/prozent/?feedback=1")).toBe(true);
    expect(switchesOn("https://lernapps.net/prozent/?feedback=0")).toBe(false);
    expect(switchesOn("https://lernapps.net/prozent/")).toBe(false);
  });
});
