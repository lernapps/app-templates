// The diff mode of an explainer's build: with EXPLAINER_BASE set to another version of the app, every page of this version
// shows what it changes against that one: its blocks marked as added, changed or moved (with the earlier version of a
// changed block folded in it), the blocks the base has and this version has not as ghosts where they were, the bar and
// the list of the app's pages, and the overview of all changes at aenderungen/, in every language. Without EXPLAINER_BASE
// nothing changes: no mark, no bar, no extra page. The mode in the browser is tested end to end (runtime/explainer/e2e.ts).
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { parse, stringify } from "yaml";
import { diffSites } from "../runtime/explainer/diff.ts";
import { loadSite } from "../runtime/explainer/load.ts";
import { explainer } from "../runtime/explainer/plugin.ts";
import { renderSite } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";

const FIXTURE = join(import.meta.dirname, "fixtures/explainer-all-blocks");

/** An app in a folder of its own with the content of `src`: index.html, src/main.ts and a stylesheet. */
function app(src: string): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-diff-"));
  cpSync(src, join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "index.html"),
    `<!doctype html>\n<html lang="de">\n  <head>\n    <meta charset="utf-8" />\n    <script type="module" src="/src/main.ts"></script>\n  </head>\n  <body>\n    <!-- explainer -->\n  </body>\n</html>\n`,
  );
  writeFileSync(join(root, "src/main.ts"), `import "../style.css";\n`);
  writeFileSync(join(root, "style.css"), "body { color: #1a1a1a; }\n");
  return root;
}

/** A mapping of a content file: its blocks, if it has some, and its other keys. */
interface Node {
  blocks?: Node[];
  [key: string]: unknown;
}

/** Changes the YAML file `file` of the app in `root`: `change` gets the parsed content and may change it. */
function edit(root: string, file: string, change: (content: Node) => void): void {
  const path = join(root, "src", file);
  const content = parse(readFileSync(path, "utf8")) as Node;
  change(content);
  writeFileSync(path, stringify(content, { lineWidth: 0 }));
}

/**
 * The base: the all-blocks fixture, with three differences from the version below: zahlen-01 starts with another text
 * (changed in the version), zahlen-02 has a true-false question that the version has not (removed, an exercise), and the
 * app's title is another (a changed field). The text the version adds at the end of zahlen-01 is missing here (added).
 */
function base(): string {
  const root = app(FIXTURE);
  edit(root, "zahlen/zahlen-01.yaml", (page) => {
    const first = page.blocks?.[0];
    if (first !== undefined) {
      first["text"] = { de: "Der erste Text, wie er früher war.", en: "The first text, as it was before." };
    }
  });
  edit(root, "zahlen/zahlen-02.yaml", (page) => {
    page.blocks?.at(-1)?.blocks?.push({
      type: "true-false",
      id: "nur-in-der-basis",
      text: { de: "Nur die Basis fragt das.", en: "Only the base asks this." },
      answer: false,
      explanation: { de: "Die Version fragt es nicht mehr.", en: "The version does not ask it any more." },
      examples: { accepted: [false], rejected: [true] },
    });
  });
  edit(root, "app.yaml", (content) => {
    content["title"] = { de: "Alle Blöcke (alt)", en: "All blocks (old)" };
  });
  return root;
}

/** The version: the all-blocks fixture with one text more at the end of its first page's blocks (added). */
function version(): string {
  const root = app(FIXTURE);
  edit(root, "zahlen/zahlen-01.yaml", (page) => {
    page.blocks?.push({ type: "text", text: { de: "Neu am Ende.", en: "New at the end." } });
  });
  return root;
}

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

describe("the diff in the pages", () => {
  test("a page shows its added, changed and removed blocks, the bar and the list of the app's pages", () => {
    const [oldRoot, newRoot] = [base(), version()];
    folders.push(oldRoot, newRoot);
    const target = loadSite(newRoot, 0);
    const diff = diffSites(loadSite(oldRoot, 0), target);
    const pages = renderSite(target, new Map(), new Map(), diff);
    const page = pages.find((candidate) => candidate.route.path === "zahlen/zahlen-01/");
    expect(page?.body).toContain('class="explainer-diff-banner"');
    expect(page?.body).toContain('class="explainer-diff-bar"');
    expect(page?.body).toContain('class="explainer-diff-nav"');
    // the text that the version has and the base had otherwise: changed, with its earlier version and the words that differ
    expect(page?.body).toMatch(/data-diff="changed"[^>]*data-block="1"/);
    expect(page?.body).toContain("Der erste Text, wie er früher war.");
    expect(page?.body).toMatch(/<del>[^<]*früher[^<]*<\/del>/);
    // the text only the version has: added
    expect(page?.body).toMatch(/data-diff="added"[^>]*data-block="\d+"[^>]*>[\s\S]*Neu am Ende\./);
    // the question only the base has: a ghost with its line, not a live exercise
    const second = pages.find((candidate) => candidate.route.path === "zahlen/zahlen-02/");
    expect(second?.body).toContain('class="explainer-diff-ghost"');
    expect(second?.body).toContain("Nur die Basis fragt das.");
    expect(second?.body).not.toContain('id="nur-in-der-basis"');
    // the language of the page: English has its words
    const english = pages.find((candidate) => candidate.route.path === "en/zahlen/zahlen-01/");
    expect(english?.body).toContain("Changes view");
    expect(english?.body).toContain("The first text, as it was before.");
  });

  test("the overview lists what changes, in every language", () => {
    const [oldRoot, newRoot] = [base(), version()];
    folders.push(oldRoot, newRoot);
    const target = loadSite(newRoot, 0);
    const diff = diffSites(loadSite(oldRoot, 0), target);
    const overview = routes(target, true).filter((route) => route.kind === "diff");
    expect(overview.map((route) => route.path)).toEqual(["aenderungen/", "en/aenderungen/"]);
    const page = renderSite(target, new Map(), new Map(), diff).find(
      (candidate) => candidate.route.path === "aenderungen/",
    );
    expect(page?.body).toContain("Angaben der App");
    expect(page?.body).toContain("Alle Blöcke (alt)");
    // the way to switch the marks off is on the pages, not on the overview, which has nothing but marks
    expect(page?.body).not.toContain("explainer-diff-toggle");
    const content = renderSite(target, new Map(), new Map(), diff).find(
      (candidate) => candidate.route.path === "zahlen/zahlen-01/",
    );
    expect(content?.body).toContain("explainer-diff-toggle");
    expect(page?.body).toContain('href="../zahlen/zahlen-01/"');
  });

  test("without a diff the pages have no mark, no bar and no overview", () => {
    const root = version();
    folders.push(root);
    const target = loadSite(root, 0);
    expect(routes(target).some((route) => route.kind === "diff")).toBe(false);
    for (const page of renderSite(target)) {
      expect(page.body, page.route.path).not.toContain("explainer-diff");
      expect(page.body, page.route.path).not.toContain("data-diff");
    }
  });
});

describe("the diff in the build", () => {
  const built = async (withBase: boolean): Promise<string> => {
    const [oldRoot, newRoot] = [base(), version()];
    folders.push(oldRoot, newRoot);
    const saved = process.env["EXPLAINER_BASE"];
    if (withBase) process.env["EXPLAINER_BASE"] = oldRoot;
    else delete process.env["EXPLAINER_BASE"];
    try {
      await build({ root: newRoot, base: "./", logLevel: "silent", configFile: false, plugins: [explainer()] });
    } finally {
      if (saved === undefined) delete process.env["EXPLAINER_BASE"];
      else process.env["EXPLAINER_BASE"] = saved;
    }
    return newRoot;
  };

  test("EXPLAINER_BASE writes the marks and the overview", async () => {
    const root = await built(true);
    expect(readFileSync(join(root, "dist/zahlen/zahlen-01/index.html"), "utf8")).toContain('data-diff="added"');
    expect(existsSync(join(root, "dist/aenderungen/index.html"))).toBe(true);
    expect(existsSync(join(root, "dist/en/aenderungen/index.html"))).toBe(true);
  });

  test("without EXPLAINER_BASE the build is as before", async () => {
    const root = await built(false);
    expect(readFileSync(join(root, "dist/zahlen/zahlen-01/index.html"), "utf8")).not.toContain("explainer-diff");
    expect(existsSync(join(root, "dist/aenderungen"))).toBe(false);
  });

  test("a base that is no app is an error that names it", async () => {
    const root = version();
    folders.push(root);
    const saved = process.env["EXPLAINER_BASE"];
    process.env["EXPLAINER_BASE"] = join(root, "nowhere");
    try {
      await expect(
        build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [explainer()] }),
      ).rejects.toThrow(/EXPLAINER_BASE .*nowhere/);
    } finally {
      if (saved === undefined) delete process.env["EXPLAINER_BASE"];
      else process.env["EXPLAINER_BASE"] = saved;
    }
  });
});
