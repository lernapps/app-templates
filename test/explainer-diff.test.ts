// The difference between two versions of an explainer's content (diff.ts): blocks are matched by their id, not their
// position, so that an added block does not turn the blocks below it into changes; a changed block keeps its old
// version, a removed one stays as a ghost where it was, a block that left one place for another is moved; pages and
// chapters that only one version has are added or removed; the fields of the app and of a page that differ are listed.
import { describe, expect, test } from "vite-plus/test";
import type { Block, Chapter, Page, Site } from "../runtime/explainer/content.ts";
import { countsOf, diffSites, longestCommon, wordDiff } from "../runtime/explainer/diff.ts";

const text = (de: string): Block => ({ type: "text", text: de });
const section = (id: string, title: string, blocks: Block[]): Block => ({ type: "section", id, title, blocks });

function page(id: string, blocks: Block[], extra: Partial<Page> = {}, chapter = "c"): Page {
  return { id, chapter, file: `src/${chapter}/${id}.yaml`, title: id, blocks, ...extra };
}

function site(pages: Page[], extra: { app?: Record<string, unknown>; chapters?: Chapter[] } = {}): Site {
  const chapters = extra.chapters ?? [{ id: "c", title: "C", pages }];
  return {
    app: {
      title: "App",
      intro: "Intro",
      languages: ["de"],
      chapters: chapters.map((chapter) => chapter.id),
      ...extra.app,
    },
    chapters,
    data: {},
    images: new Map(),
    audio: new Map(),
    components: [],
  } as unknown as Site;
}

/** The diff of the one page "p" of two sites. */
function diffOf(before: Block[], after: Block[]) {
  const target = page("p", after);
  const diff = diffSites(site([page("p", before)]), site([target]));
  const pageDiff = diff.of(target);
  if (pageDiff === undefined) throw new Error("no diff of the page");
  return pageDiff;
}

describe("the longest common subsequence", () => {
  test("pairs what both have, in order", () => {
    expect(longestCommon(["a", "b", "c", "d"], ["b", "x", "d"])).toEqual([
      [1, 0],
      [3, 2],
    ]);
    expect(longestCommon([], ["a"])).toEqual([]);
  });
});

describe("the words of a text compared", () => {
  test("marks what is only in the old text and what is only in the new", () => {
    expect(wordDiff("Der Grundwert mal Prozentsatz", "Der Grundwert durch 100 mal Prozentsatz")).toEqual([
      { kind: "same", text: "Der Grundwert " },
      { kind: "ins", text: "durch 100 " },
      { kind: "same", text: "mal Prozentsatz" },
    ]);
    expect(wordDiff("a b", "a c").map((part) => part.kind)).toEqual(["same", "del", "ins"]);
    expect(wordDiff("same", "same")).toEqual([{ kind: "same", text: "same" }]);
  });
});

describe("the blocks of a page", () => {
  test("equal pages differ in nothing", () => {
    const diff = diffOf([text("a"), text("b")], [text("a"), text("b")]);
    expect(diff.status).toBe("same");
    expect(diff.changes.size).toBe(0);
  });

  test("a block added at the top does not change the blocks below it", () => {
    const after = [text("new"), text("a"), text("b")];
    const diff = diffOf([text("a"), text("b")], after);
    expect(diff.status).toBe("changed");
    expect([...diff.changes.values()].map((change) => change.status)).toEqual(["added"]);
    expect(diff.changes.get(after[0] as Block)?.status).toBe("added");
    expect(countsOf(diff)).toEqual({ added: 1, changed: 0, removed: 0, moved: 0 });
  });

  test("a block of the same type in the same place is changed, with its old version", () => {
    const before = text("old");
    const after = text("new");
    const diff = diffOf([text("a"), before, text("b")], [text("a"), after, text("b")]);
    expect(diff.changes.get(after)).toEqual({ status: "changed", old: before });
    expect(countsOf(diff)).toEqual({ added: 0, changed: 1, removed: 0, moved: 0 });
  });

  test("a removed block is a ghost before the block that follows it, or at the end of the list", () => {
    const gone = text("gone");
    const b = text("b");
    const last = text("last");
    const diff = diffOf([text("a"), gone, b], [text("a"), b]);
    expect(diff.before.get(b)?.map((ghost) => ghost.block)).toEqual([gone]);
    const tail = [text("a")];
    const atEnd = diffOf([text("a"), last], tail);
    expect(atEnd.atEnd.get(tail)?.map((ghost) => ghost.block)).toEqual([last]);
    expect(countsOf(diff).removed).toBe(1);
  });

  test("a block of another type is added, and the old one removed", () => {
    const diff = diffOf([{ type: "quote", text: "x", source: "y" } as Block], [text("x")]);
    expect(countsOf(diff)).toEqual({ added: 1, changed: 0, removed: 1, moved: 0 });
  });

  test("a section is the same section by its id: its title and what is inside are compared", () => {
    const before = section("regel", "Regel", [text("a"), text("b")]);
    const inner = text("c");
    const after = section("regel", "Die Regel", [text("a"), inner, text("b")]);
    const diff = diffOf([before], [after]);
    expect(diff.changes.get(after)).toEqual({ status: "changed", old: before });
    expect(diff.changes.get(inner)?.status).toBe("added");
  });

  test("a section only the target has is added, a section only the base has is a ghost", () => {
    const keep = section("a", "A", [text("x")]);
    const added = section("b", "B", [text("y")]);
    const removed = section("c", "C", [text("z")]);
    const diff = diffOf([keep, removed], [keep, added]);
    expect(diff.changes.get(added)?.status).toBe("added");
    expect([...diff.before.values(), ...diff.atEnd.values()].flat().map((ghost) => ghost.block)).toEqual([removed]);
  });

  test("a box is compared inside: only its changed block is marked", () => {
    const box = (blocks: Block[]): Block => ({ type: "example", title: "Beispiel", blocks });
    const inner = text("new");
    const diff = diffOf([box([text("old"), text("same")])], [box([inner, text("same")])]);
    expect(diff.changes.size).toBe(1);
    expect(diff.changes.get(inner)?.status).toBe("changed");
  });

  test("a block removed on one page and added on another is moved", () => {
    const moved = text("moved");
    const target = page("b", [moved]);
    const diff = diffSites(
      site([page("a", [text("x"), text("moved")]), page("b", [])]),
      site([page("a", [text("x")]), target]),
    );
    expect(diff.of(target)?.changes.get(moved)).toEqual({ status: "moved", from: "c/a" });
    const [a] = diff.pages;
    expect(a === undefined ? undefined : countsOf(a)).toEqual({ added: 0, changed: 0, removed: 0, moved: 0 });
  });
});

describe("the pages, chapters and fields", () => {
  test("a page only the target has is added, a page only the base has is removed", () => {
    const diff = diffSites(
      site([page("old", [text("a")]), page("same", [])]),
      site([page("same", []), page("new", [])]),
    );
    expect(diff.pages.map((p) => [p.key, p.status])).toEqual([
      ["c/same", "same"],
      ["c/new", "added"],
      ["c/old", "removed"],
    ]);
    expect(diff.chapters.map((chapter) => chapter.status)).toEqual(["changed"]);
  });

  test("a chapter only one site has is added or removed, with its pages", () => {
    const base = site([], { chapters: [{ id: "a", title: "A", pages: [page("x", [], {}, "a")] }] });
    const target = site([], { chapters: [{ id: "b", title: "B", pages: [page("y", [], {}, "b")] }] });
    const diff = diffSites(base, target);
    expect(diff.chapters.map((chapter) => [chapter.id, chapter.status])).toEqual([
      ["b", "added"],
      ["a", "removed"],
    ]);
    expect(diff.pages.map((p) => [p.key, p.status])).toEqual([
      ["b/y", "added"],
      ["a/x", "removed"],
    ]);
    expect(diff.app.map((change) => change.field)).toEqual(["chapters"]);
  });

  test("the fields of the app and of a page that differ are listed", () => {
    const base = site([page("p", [], { title: "Alt" })], { app: { title: "Alt" } });
    const target = site([page("p", [], { title: "Neu" })], { app: { title: "Neu" } });
    const diff = diffSites(base, target);
    expect(diff.app).toEqual([{ field: "title", old: "Alt", new: "Neu" }]);
    expect(diff.pages[0]?.fields).toEqual([{ field: "title", old: "Alt", new: "Neu" }]);
    expect(diff.pages[0]?.status).toBe("changed");
  });
});
