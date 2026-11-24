// The markup of the diff mode (diff.ts has what differs): the marks on blocks, pages and chapters, the earlier version
// of a changed block with the words that differ, the floating bar with the list of the page's changes and the list of
// the app's pages beside it, and the overview of everything that changes. All of it is plain HTML that the build
// writes, complete without JavaScript; the client module (diff-client.ts) only adds stepping from change to change,
// the filters and the menu of a narrow screen. Texts come from the explainer's messages, in the page's language.
import { inLanguage, type Block, type Text } from "./content.ts";
import {
  countsOf,
  total,
  wordDiff,
  type Counts,
  type FieldChange,
  type Part,
  type SiteDiff,
  type PageDiff,
} from "./diff.ts";
import { message, type Messages } from "./messages.ts";
import { plain } from "../shared/text/markdown.ts";

/** How a block, a page or a chapter differs. */
export type Mark = "added" | "changed" | "removed" | "moved";

/** The text of `key` in `lang` as HTML. */
const t = (lang: string, key: keyof Messages, params?: Readonly<Record<string, string>>): string =>
  plain(message(lang, key, params));

const MARK_KEY: Readonly<Record<Mark, keyof Messages>> = {
  added: "diffAdded",
  changed: "diffChanged",
  removed: "diffRemoved",
  moved: "diffMoved",
};

/** The chip that names a mark: its words, so that the colour is never the only sign. */
export const chip = (lang: string, mark: Mark, key: keyof Messages = MARK_KEY[mark]): string =>
  `<span class="explainer-diff-chip" data-diff="${mark}">${t(lang, key)}</span>`;

/** The visible text of some HTML: its tags gone, its entities decoded, its spaces joined. */
export function visibleText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const LANGUAGE_KEY = /^[a-z]{2,3}(-[A-Za-z0-9]+)?$/;

/** The strings of a block's source that a reader sees, in `lang`, in order: the words that change from version to version. */
export function leaves(value: unknown, lang: string): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => leaves(item, lang));
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    if (entries.length > 0 && entries.every(([key, item]) => LANGUAGE_KEY.test(key) && typeof item === "string")) {
      return [inLanguage(value as Text, lang)];
    }
    return entries.filter(([key]) => key !== "type").flatMap(([, item]) => leaves(item, lang));
  }
  return typeof value === "number" || typeof value === "boolean" ? [String(value)] : [];
}

/** The words that differ between two blocks, as HTML: what is only in the new one in <ins>, only in the old in <del>. */
export function differenceOf(before: Block, after: Block, lang: string): string {
  const parts = wordDiff(leaves(before, lang).join("\n"), leaves(after, lang).join("\n"));
  return parts.map((part: Part) => partHtml(part)).join("");
}

function partHtml(part: Part): string {
  const text = plain(part.text).replace(/\n/g, "<br>");
  if (part.kind === "ins") return `<ins>${text}</ins>`;
  if (part.kind === "del") return `<del>${text}</del>`;
  return text;
}

/** The label above a marked block: the chip, and what the block is and where (a position, or where it moved from). */
export function blockLabel(lang: string, mark: Mark, where: string, from?: string): string {
  const moved = from === undefined ? "" : ` · ${from}`;
  return `<p class="explainer-diff-label">${chip(lang, mark)} <span class="explainer-diff-where">${plain(where)}${plain(moved)}</span></p>`;
}

/**
 * The earlier version of a changed block, folded; the client module opens it on a wide screen: the block as it was and
 * the words that differ side by side.
 */
export function earlierVersion(lang: string, oldHtml: string, difference: string): string {
  return [
    `<details class="explainer-diff-old">`,
    `<summary>${t(lang, "diffBefore")}</summary>`,
    `<div class="explainer-diff-compare">`,
    `<div class="explainer-diff-before"><h3>${t(lang, "diffBeforeTitle")}</h3>${oldHtml}</div>`,
    `<div class="explainer-diff-words"><h3>${t(lang, "diffDifference")}</h3><p>${difference}</p></div>`,
    `</div>`,
    `</details>`,
  ].join("");
}

/** What is written beside a block in the list of changes. */
export interface Entry {
  id: string;
  mark: Mark;
  /** What the block is: its type and its first words. */
  text: string;
}

/** The counts as chips. */
export function countChips(lang: string, counts: Counts): string {
  const one = (mark: Mark, key: keyof Messages, n: number) =>
    n === 0 ? "" : `<span class="explainer-diff-chip" data-diff="${mark}">${t(lang, key, { n: String(n) })}</span>`;
  return [
    one("added", "diffCountAdded", counts.added),
    one("changed", "diffCountChanged", counts.changed),
    one("removed", "diffCountRemoved", counts.removed),
    one("moved", "diffCountMoved", counts.moved),
  ].join("");
}

/** The first words of a text, for a list. */
export function shorten(text: string, length = 70): string {
  return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…`;
}

/**
 * The floating bar of a page: the counts, the buttons that step from change to change and open the menu of a narrow
 * screen (hidden until the client module runs), and behind "Liste und Filter" the list of the changes, each a link to
 * its block, and the way to the overview.
 */
export function bar(lang: string, counts: Counts, entries: readonly Entry[], overview: string): string {
  const list =
    entries.length === 0
      ? `<p class="explainer-diff-none">${t(lang, "diffNone")}</p>`
      : `<ul class="explainer-diff-list">${entries
          .map(
            (entry) =>
              `<li><a href="#${entry.id}">${chip(lang, entry.mark)} <span class="explainer-diff-where">${plain(entry.text)}</span></a></li>`,
          )
          .join("")}</ul>`;
  return [
    `<aside class="explainer-diff-bar" aria-labelledby="diff-bar-title">`,
    `<h2 id="diff-bar-title">${t(lang, "diffBar")}</h2>`,
    `<div class="explainer-diff-counts" aria-label="${t(lang, "diffBarLabel")}">${countChips(lang, counts)}</div>`,
    `<div class="explainer-diff-step" hidden>`,
    `<button type="button" class="explainer-diff-menu" aria-expanded="false" aria-controls="diff-nav"><span aria-hidden="true">☰</span><span class="explainer-diff-btn-text"> ${t(lang, "diffMenu")}</span></button>`,
    `<button type="button" class="explainer-diff-prev"><span aria-hidden="true">‹</span><span class="explainer-diff-btn-text"> ${t(lang, "diffPrev")}</span></button>`,
    `<button type="button" class="explainer-diff-next"><span class="explainer-diff-btn-text">${t(lang, "diffNext")} </span><span aria-hidden="true">›</span></button>`,
    `</div>`,
    `<details class="explainer-diff-more">`,
    `<summary>${t(lang, "diffMore")}</summary>`,
    `<div class="explainer-diff-filters" hidden>`,
    `<label><input type="checkbox" class="explainer-diff-only"> ${t(lang, "diffOnlyChanged")}</label>`,
    `<label><input type="checkbox" class="explainer-diff-open-all"> ${t(lang, "diffOpenAll")}</label>`,
    `</div>`,
    list,
    `<p class="explainer-diff-all"><a href="${plain(overview)}">${t(lang, "diffAll")}</a></p>`,
    `</details>`,
    `</aside>`,
  ].join("\n");
}

/** One page or chapter in the list of the app's pages. */
export interface NavEntry {
  title: string;
  /** Where it leads; none for a chapter. */
  href?: string;
  chapter: boolean;
  mark?: Mark;
  /** The chip's own words, instead of the mark's. */
  label?: keyof Messages;
  current: boolean;
  /** The count of marked blocks of a page that changed. */
  count?: number;
}

/** The list of the app's pages with a chip on each that changes, beside the page (a panel on a narrow screen). */
export function nav(lang: string, entries: readonly NavEntry[]): string {
  const items = entries.map((entry) => {
    const mark =
      entry.mark === undefined
        ? ""
        : ` ${chip(lang, entry.mark, entry.label)}${entry.count === undefined || entry.count === 0 ? "" : ` <span class="explainer-diff-n">${entry.count}</span>`}`;
    const title = plain(entry.title);
    const body =
      entry.href === undefined
        ? `<span class="explainer-diff-chapter">${title}</span>`
        : `<a href="${plain(entry.href)}"${entry.current ? ' aria-current="page"' : ""}>${title}</a>`;
    const removed = entry.mark === "removed" ? ' class="explainer-diff-gone"' : "";
    return `<li${removed}${entry.chapter ? ' data-chapter=""' : ""}>${body}${mark}</li>`;
  });
  return `<nav class="explainer-diff-nav" id="diff-nav" aria-label="${t(lang, "diffNav")}"><h2>${t(lang, "diffNav")}</h2><ul>${items.join("")}</ul></nav>`;
}

/** The banner above every page: that this is the view of the changes, and the way to switch the marks off. */
export function banner(lang: string, revision: string | undefined): string {
  const base = revision === undefined ? "" : ` (${t(lang, "diffBaseRevision", { revision })})`;
  return [
    `<p class="explainer-diff-banner" role="status">`,
    `<strong>${t(lang, "diffBanner")}</strong>${base} `,
    `<button type="button" class="explainer-diff-toggle" data-off="${t(lang, "diffOff")}" data-on="${t(lang, "diffOn")}" hidden>${t(lang, "diffOff")}</button>`,
    `</p>`,
  ].join("");
}

/** A value of a changed field, as text. */
function valueText(value: unknown, lang: string): string {
  if (value === undefined) return "–";
  const words = leaves(value, lang);
  return words.length === 0 ? JSON.stringify(value) : words.join(" · ");
}

/** The changed fields of the app, a chapter or a page, before and after, as a table. */
export function fieldTable(lang: string, fields: readonly FieldChange[]): string {
  if (fields.length === 0) return "";
  const rows = fields
    .map(
      (change) =>
        `<tr><th scope="row"><code>${plain(change.field)}</code></th><td><del>${plain(valueText(change.old, lang))}</del></td><td><ins>${plain(valueText(change.new, lang))}</ins></td></tr>`,
    )
    .join("");
  return `<div class="explainer-diff-table" role="region" aria-label="${t(lang, "diffFields")}" tabindex="0"><table><thead><tr><th scope="col">${t(lang, "diffField")}</th><th scope="col">${t(lang, "diffOld")}</th><th scope="col">${t(lang, "diffNew")}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/** The mark of a page of the diff, and the words of its chip. */
export function pageMark(diff: PageDiff): { mark: Mark; label: keyof Messages } | undefined {
  if (diff.status === "added") return { mark: "added", label: "diffPageAdded" };
  if (diff.status === "removed") return { mark: "removed", label: "diffPageRemoved" };
  if (diff.status === "changed") return { mark: "changed", label: "diffPageChanged" };
  return undefined;
}

export { countsOf, total, type SiteDiff };
