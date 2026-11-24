// The difference between two versions of an explainer's content, for the diff mode of a pull request's preview: what the
// target (the branch) adds, changes, moves and removes against the base (the branch it merges into), per app field,
// chapter, page and block. Build code: it needs Node (block-id.ts), and it only reads the two sites.
//
// Blocks are matched by their id (block-id.ts: a hash of the block's source), not by their position, so that a block
// added at the top of a page does not turn every block below it into a change:
//   1. the blocks of one list (a page, a section, a box) are matched by the longest common subsequence of their ids;
//      a section's key is its own id, so that a section whose content changed is still the same section;
//   2. between two matches, blocks of the same type are paired in order (the same id of a block first): a pair is a
//      changed block, with the old one at hand; a box or section that is paired is compared inside, too;
//   3. the rest of the target is added, the rest of the base removed: a removed block stays in the page as a ghost where
//      it was;
//   4. a block removed from one place and added at another (with the same id) is moved, not removed and added.
// A page that only one of the sites has is added or removed as a whole; the pages are matched by <chapter>/<id>.
import { blockId, canonical } from "./block-id.ts";
import type { Block, Chapter, Page, Site } from "./content.ts";

/** How a block of the target differs from the base. */
export interface BlockChange {
  status: "added" | "changed" | "moved";
  /** The block as the base has it, for a changed block (a section or a box: with the old title). */
  old?: Block;
  /** For a moved block: the key (<chapter>/<page>) of the page the base has it on. */
  from?: string;
}

/** A block the base has and the target has not, which the target's page shows where it was. */
export interface Ghost {
  block: Block;
  /** Whether the block is somewhere else in the target (a moved block): then the ghost is not shown. */
  moved: boolean;
}

/** A field of the app, a chapter or a page that differs. */
export interface FieldChange {
  field: string;
  old: unknown;
  new: unknown;
}

export type PageStatus = "added" | "removed" | "changed" | "same";

export interface PageDiff {
  /** <chapter>/<page>. */
  key: string;
  status: PageStatus;
  base?: Page;
  target?: Page;
  /** The fields of the page itself (title, description, competencies …) that differ. */
  fields: FieldChange[];
  /** The blocks of the target's page that are added, changed or moved, at any depth. */
  changes: Map<Block, BlockChange>;
  /** The ghosts to show before this block of the target's page. */
  before: Map<Block, Ghost[]>;
  /** The ghosts to show at the end of this list of blocks of the target's page (the page's or a section's). */
  atEnd: Map<readonly Block[], Ghost[]>;
}

export interface ChapterDiff {
  id: string;
  status: PageStatus;
  base?: Chapter;
  target?: Chapter;
  fields: FieldChange[];
}

export interface SiteDiff {
  /** The revision of the base, when the build found it. */
  baseRevision?: string;
  /** The fields of src/app.yaml that differ (the chapters as their list of ids). */
  app: FieldChange[];
  /** The target's chapters in order, then the chapters only the base has. */
  chapters: ChapterDiff[];
  /** For each chapter in the order of `chapters`: the target's pages in order, then the pages only the base has. */
  pages: PageDiff[];
  /** The diff of a page of the target. */
  of: (page: Page) => PageDiff | undefined;
}

export interface Counts {
  added: number;
  changed: number;
  removed: number;
  moved: number;
}

/** What differs on a page, counted in blocks (a removed block that was moved elsewhere counts once, as moved). */
export function countsOf(diff: PageDiff): Counts {
  const counts: Counts = { added: 0, changed: 0, removed: 0, moved: 0 };
  for (const change of diff.changes.values()) counts[change.status] += 1;
  for (const ghosts of [...diff.before.values(), ...diff.atEnd.values()]) {
    for (const ghost of ghosts) if (!ghost.moved) counts.removed += 1;
  }
  return counts;
}

export const total = (counts: Counts): number => counts.added + counts.changed + counts.removed + counts.moved;

/** The pairs (index in `a`, index in `b`) of the longest common subsequence, in order. */
export function longestCommon(a: readonly string[], b: readonly string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) return [];
  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j]
          ? (table[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(table[(i + 1) * width + j] ?? 0, table[i * width + j + 1] ?? 0);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if ((table[(i + 1) * width + j] ?? 0) >= (table[i * width + j + 1] ?? 0)) i++;
    else j++;
  }
  return pairs;
}

/** A part of a text compared with another: the same in both, only in the new one, or only in the old one. */
export interface Part {
  kind: "same" | "ins" | "del";
  text: string;
}

/** The words of `before` and `after` compared; their spaces stay with the words. Parts of one kind are joined. */
export function wordDiff(before: string, after: string): Part[] {
  const words = (text: string) => text.match(/\s+|[^\s]+/g) ?? [];
  const a = words(before);
  const b = words(after);
  const parts: Part[] = [];
  const push = (kind: Part["kind"], text: string) => {
    const last = parts[parts.length - 1];
    if (last !== undefined && last.kind === kind) last.text += text;
    else parts.push({ kind, text });
  };
  // a text too long to compare word by word is shown as replaced
  if (a.length * b.length > 4_000_000) {
    if (before !== "") push("del", before);
    if (after !== "") push("ins", after);
    return parts;
  }
  let i = 0;
  let j = 0;
  for (const [x, y] of [...longestCommon(a, b), [a.length, b.length] as [number, number]]) {
    while (i < x) push("del", a[i++] ?? "");
    while (j < y) push("ins", b[j++] ?? "");
    if (x < a.length) push("same", a[x] ?? "");
    i = x + 1;
    j = y + 1;
  }
  return parts;
}

const keyOf = (block: Block): string => (block.type === "section" ? `section:${block.id}` : blockId(block));

const idOf = (block: Block): string | undefined => {
  const id = (block as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
};

/** The fields of `base` and `target` (named by `fields`) that differ, in the order of `fields`. */
function fieldChanges(base: object, target: object, fields: readonly string[]): FieldChange[] {
  const get = (object: object, field: string): unknown => (object as Record<string, unknown>)[field];
  return fields
    .filter((field) => canonical(get(base, field)) !== canonical(get(target, field)))
    .map((field) => ({ field, old: get(base, field), new: get(target, field) }));
}

const APP_FIELDS = ["format", "strand", "subject", "title", "intro", "languages", "sources", "tutor", "scope"];
const CHAPTER_FIELDS = ["title", "summary", "scope", "selfAssessment"];
const PAGE_FIELDS = ["title", "description", "competencies", "ahead", "recap", "recapTitles", "scope"];

/** A block of the base that could have been moved, and a block of the target that could have been moved there. */
interface Candidates {
  removed: { key: string; ghost: Ghost; page: string }[];
  added: { key: string; change: BlockChange }[];
}

function ghostBefore(diff: PageDiff, target: Block | readonly Block[], ghosts: Ghost[], atEnd: boolean): void {
  if (ghosts.length === 0) return;
  if (atEnd) {
    const list = target as readonly Block[];
    diff.atEnd.set(list, [...(diff.atEnd.get(list) ?? []), ...ghosts]);
  } else {
    const block = target as Block;
    diff.before.set(block, [...(diff.before.get(block) ?? []), ...ghosts]);
  }
}

/** Compares the blocks of one list of the base with the same list of the target and records what differs in `diff`. */
function diffBlocks(base: readonly Block[], target: readonly Block[], diff: PageDiff, candidates: Candidates): void {
  const matches = longestCommon(base.map(keyOf), target.map(keyOf));
  let b = 0;
  let t = 0;

  const compareInside = (before: Block, after: Block): void => {
    if (before.type === "section" && after.type === "section") {
      if (canonical(before.title) !== canonical(after.title))
        diff.changes.set(after, { status: "changed", old: before });
      diffBlocks(before.blocks, after.blocks, diff, candidates);
    } else if ((before.type === "example" || before.type === "note") && before.type === after.type) {
      if (canonical((before as { title: unknown }).title) !== canonical((after as { title: unknown }).title)) {
        diff.changes.set(after, { status: "changed", old: before });
      }
      diffBlocks(
        (before as { blocks: readonly Block[] }).blocks,
        (after as { blocks: readonly Block[] }).blocks,
        diff,
        candidates,
      );
    } else diff.changes.set(after, { status: "changed", old: before });
  };

  const gap = (baseEnd: number, targetEnd: number): void => {
    const removed = base.slice(b, baseEnd);
    const added = target.slice(t, targetEnd);
    const paired = new Map<number, number>(); // index in `added` -> index in `removed`
    const taken = new Set<number>();
    // the same type and the same id first, then the same type in order
    added.forEach((block, i) => {
      const id = idOf(block);
      if (id === undefined) return;
      const j = removed.findIndex((other, k) => !taken.has(k) && other.type === block.type && idOf(other) === id);
      if (j >= 0) {
        paired.set(i, j);
        taken.add(j);
      }
    });
    let from = 0;
    added.forEach((block, i) => {
      if (paired.has(i)) return;
      for (let j = from; j < removed.length; j++) {
        const other = removed[j];
        if (other === undefined || taken.has(j) || other.type !== block.type) continue;
        // a section of another id is another section
        if (block.type === "section" || idOf(block) !== undefined || idOf(other) !== undefined) {
          if (idOf(block) !== idOf(other)) continue;
        }
        paired.set(i, j);
        taken.add(j);
        from = j + 1;
        return;
      }
    });
    added.forEach((block, i) => {
      const j = paired.get(i);
      const other = j === undefined ? undefined : removed[j];
      if (other !== undefined) compareInside(other, block);
      else {
        const change: BlockChange = { status: "added" };
        diff.changes.set(block, change);
        if (block.type !== "section") candidates.added.push({ key: blockId(block), change });
      }
    });
    const ghosts: Ghost[] = [];
    removed.forEach((block, j) => {
      if (taken.has(j)) return;
      const ghost: Ghost = { block, moved: false };
      ghosts.push(ghost);
      if (block.type !== "section") candidates.removed.push({ key: blockId(block), ghost, page: diff.key });
    });
    const first = added[0];
    if (first !== undefined) ghostBefore(diff, first, ghosts, false);
    else {
      const next = target[targetEnd];
      if (next !== undefined) ghostBefore(diff, next, ghosts, false);
      else ghostBefore(diff, target, ghosts, true);
    }
  };

  for (const [x, y] of matches) {
    if (x > b || y > t) gap(x, y);
    const before = base[x];
    const after = target[y];
    if (before?.type === "section" && after?.type === "section") compareInside(before, after);
    b = x + 1;
    t = y + 1;
  }
  if (b < base.length || t < target.length) gap(base.length, target.length);
}

/** Matches the blocks that were removed on one page and added on another (or at another place): they were moved. */
function findMoves(candidates: Candidates): void {
  const used = new Set<number>();
  for (const add of candidates.added) {
    const index = candidates.removed.findIndex((other, i) => !used.has(i) && other.key === add.key);
    const other = candidates.removed[index];
    if (index < 0 || other === undefined) continue;
    used.add(index);
    other.ghost.moved = true;
    add.change.status = "moved";
    add.change.from = other.page;
  }
}

const emptyPage = (key: string, status: PageStatus, base?: Page, target?: Page): PageDiff => ({
  key,
  status,
  ...(base === undefined ? {} : { base }),
  ...(target === undefined ? {} : { target }),
  fields: [],
  changes: new Map(),
  before: new Map(),
  atEnd: new Map(),
});

const pageKey = (page: Page): string => `${page.chapter}/${page.id}`;

/** What `target` changes against `base`. */
export function diffSites(base: Site, target: Site): SiteDiff {
  const candidates: Candidates = { removed: [], added: [] };
  const app = [
    ...fieldChanges(base.app, target.app, APP_FIELDS),
    ...fieldChanges({ chapters: base.chapters.map((c) => c.id) }, { chapters: target.chapters.map((c) => c.id) }, [
      "chapters",
    ]),
  ];
  const baseChapters = new Map(base.chapters.map((chapter) => [chapter.id, chapter]));
  const targetChapters = new Map(target.chapters.map((chapter) => [chapter.id, chapter]));
  const chapters: ChapterDiff[] = [];
  const pages: PageDiff[] = [];
  const byTarget = new Map<Page, PageDiff>();

  const addPages = (before: Chapter | undefined, after: Chapter | undefined): void => {
    const baseOf = new Map((before?.pages ?? []).map((page) => [page.id, page]));
    const targetOf = new Map((after?.pages ?? []).map((page) => [page.id, page]));
    for (const page of after?.pages ?? []) {
      const other = baseOf.get(page.id);
      const diff = emptyPage(pageKey(page), other === undefined ? "added" : "same", other, page);
      if (other !== undefined) {
        diff.fields = fieldChanges(other, page, PAGE_FIELDS);
        diffBlocks(other.blocks, page.blocks, diff, candidates);
      }
      pages.push(diff);
      byTarget.set(page, diff);
    }
    for (const page of before?.pages ?? []) {
      if (!targetOf.has(page.id)) pages.push(emptyPage(pageKey(page), "removed", page));
    }
  };

  for (const chapter of target.chapters) {
    const other = baseChapters.get(chapter.id);
    chapters.push({
      id: chapter.id,
      status: other === undefined ? "added" : "same",
      ...(other === undefined ? {} : { base: other }),
      target: chapter,
      fields: other === undefined ? [] : fieldChanges(other, chapter, CHAPTER_FIELDS),
    });
    addPages(other, chapter);
  }
  for (const chapter of base.chapters) {
    if (targetChapters.has(chapter.id)) continue;
    chapters.push({ id: chapter.id, status: "removed", base: chapter, fields: [] });
    addPages(chapter, undefined);
  }
  findMoves(candidates);

  // the status of a page and a chapter that both sites have: changed, once anything differs
  for (const diff of pages) {
    if (diff.status === "same" && (diff.fields.length > 0 || diff.changes.size > 0 || total(countsOf(diff)) > 0)) {
      diff.status = "changed";
    }
  }
  for (const chapter of chapters) {
    if (chapter.status !== "same") continue;
    const inside = pages.some((page) => page.target?.chapter === chapter.id && page.status !== "same");
    const lost = pages.some((page) => page.base?.chapter === chapter.id && page.status === "removed");
    if (chapter.fields.length > 0 || inside || lost) chapter.status = "changed";
  }
  return {
    ...(base.revision === undefined ? {} : { baseRevision: base.revision }),
    app,
    chapters,
    pages,
    of: (page) => byTarget.get(page),
  };
}

/** Whether anything differs. */
export const hasChanges = (diff: SiteDiff): boolean =>
  diff.app.length > 0 || diff.chapters.some((c) => c.status !== "same") || diff.pages.some((p) => p.status !== "same");
