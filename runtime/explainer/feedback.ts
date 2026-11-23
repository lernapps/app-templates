// The feedback mode of an explainer: teachers and parents note what to improve, block by block, and hand all their
// notes over at once as the text of a new issue in the app's repository. This module is what the mode keeps and what
// it writes, without the page (feedback-client.ts runs it there): a note and the check of what is stored, the order of
// the notes (the pages in the app's order, the blocks in the page's), the Markdown of the export and the address of a
// new issue with its title. The mode keeps its notes on the device only (@lernapps/tooling/storage, the app's prefix),
// and only once it is switched on; nothing leaves the page but what the person copies.
import { message, type Messages } from "./messages.ts";

/** The key of the mode's state: on, and whether its help was seen. */
export const FEEDBACK_KEY = "feedback";
/** The key of the notes. */
export const NOTES_KEY = "feedback-notes";
/** The parameter of an address that switches the mode on: ?feedback. */
export const FEEDBACK_PARAM = "feedback";
/** The longest beginning of a block's text a note keeps, and the longest marked text. */
export const EXCERPT_LENGTH = 100;
export const SELECTION_LENGTH = 300;

/** The mode's state on the device. */
export interface FeedbackState {
  on: boolean;
  /** Whether the help was shown once: the panel opens on it the first time. */
  seen?: boolean;
}

/** One note: where it is (the page and the block, as the build addressed it: block-id.ts) and what it says. */
export interface Note {
  id: string;
  /** When it was written, ISO 8601. */
  created: string;
  lang: string;
  /** The page's address, without query and fragment. */
  url: string;
  /** The page's title, and its place among the app's content pages, from 0. */
  page: string;
  pageOrder: number;
  /** The title of the section the block is in, if it is in one. */
  section?: string;
  /** The block's position (regel/3), id, type and place on the page. */
  position: string;
  blockId: string;
  blockType: string;
  blockOrder: number;
  /** The beginning of the block's text, shortened. */
  excerpt: string;
  /** The text marked in the block when the note was begun. */
  selection?: string;
  text: string;
  /** Whether the block was changed since: its page no longer has a block of that id. */
  changed?: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export const isFeedbackState = (value: unknown): value is FeedbackState =>
  isObject(value) &&
  typeof value["on"] === "boolean" &&
  (value["seen"] === undefined || typeof value["seen"] === "boolean");

/** Whether `value` is a note as the mode writes it. */
export function isNote(value: unknown): value is Note {
  if (!isObject(value)) return false;
  const strings = ["id", "created", "lang", "url", "page", "position", "blockId", "blockType", "excerpt", "text"];
  return (
    strings.every((key) => isString(value[key])) &&
    isNumber(value["pageOrder"]) &&
    isNumber(value["blockOrder"]) &&
    (value["section"] === undefined || isString(value["section"])) &&
    (value["selection"] === undefined || isString(value["selection"])) &&
    (value["changed"] === undefined || typeof value["changed"] === "boolean")
  );
}

/** Whether `value` is a list of notes; a list with one entry that is not a note is not one (the device keeps it as it is). */
export const isNotes = (value: unknown): value is Note[] => Array.isArray(value) && value.every(isNote);

/** The notes in the order of the export: the pages in the app's order, the blocks in the page's, then by time. */
export function sortNotes(notes: readonly Note[]): Note[] {
  return [...notes].sort(
    (a, b) =>
      a.pageOrder - b.pageOrder ||
      a.url.localeCompare(b.url) ||
      a.blockOrder - b.blockOrder ||
      a.created.localeCompare(b.created),
  );
}

/** `text` on one line, at most `length` characters, cut at a word with "…". */
export function shorten(text: string, length: number): string {
  const line = text.replace(/\s+/g, " ").trim();
  if (line.length <= length) return line;
  const cut = line.slice(0, length);
  const space = cut.lastIndexOf(" ");
  return `${(space > length / 2 ? cut.slice(0, space) : cut).trimEnd()} …`;
}

/** The place of a block within its section, for a reader: "3", "4.1" (the numbers of its position). */
export const placeOf = (position: string): string =>
  position
    .split("/")
    .filter((part) => /^\d+$/.test(part))
    .join(".");

const TYPE_KEYS: Readonly<Record<string, keyof Messages>> = {
  text: "feedbackTypeText",
  formula: "feedbackTypeFormula",
  figure: "feedbackTypeFigure",
  "labelled-figure": "feedbackTypeFigure",
  table: "feedbackTypeTable",
  timeline: "feedbackTypeTimeline",
  definition: "feedbackTypeDefinition",
  quote: "feedbackTypeQuote",
  code: "feedbackTypeCode",
  video: "feedbackTypeVideo",
  "self-test": "feedbackTypeSelfTest",
  note: "feedbackTypeNote",
  example: "feedbackTypeExample",
  "vue-component": "feedbackTypeComponent",
};

/** What kind of block a type is, for a reader: "Text", "Abbildung"; every exercise is "Aufgabe". */
export const typeName = (type: string, lang: string): string =>
  message(lang, TYPE_KEYS[type] ?? "feedbackTypeExercise");

/** Where a note is, for a reader: "Regel · Block 3 · Text". */
export const placeLabel = (note: Note, lang: string): string =>
  [
    ...(note.section === undefined ? [] : [note.section]),
    message(lang, "feedbackBlock", { place: placeOf(note.position) }),
    typeName(note.blockType, lang),
  ].join(" · ");

/** What the export says of the app. */
export interface ExportContext {
  lang: string;
  /** The app's title and the address of its start page. */
  app: string;
  address: string;
  /** The day of the export, as the page's language writes it. */
  date: string;
  /** The commit the pages are of, if the build knew it: in the text, unseen (an HTML comment). */
  revision?: string;
}

/** Every line of `text` quoted in Markdown. */
const quoted = (text: string): string[] => text.split(/\r?\n/).map((line) => `> ${line}`.trimEnd());

/**
 * The text of the export, Markdown for the description of an issue: a heading with the app, the number of notes, the
 * app's address and the day, the commit unseen; then a heading per page with its address and, for each of its notes,
 * where it is, the block's id, the beginning of the block and the marked text as a quote, and the note.
 */
export function exportMarkdown(notes: readonly Note[], context: ExportContext): string {
  const { lang } = context;
  const count =
    notes.length === 1
      ? message(lang, "feedbackCountOne")
      : message(lang, "feedbackCount", { count: `${notes.length}` });
  const lines = [
    `## ${message(lang, "feedbackExportTitle", { app: context.app })}`,
    "",
    `${count} · ${context.address} · ${context.date}`,
    ...(context.revision === undefined
      ? []
      : [`<!-- ${message(lang, "feedbackRevision", { revision: context.revision })} -->`]),
  ];
  let url: string | undefined;
  for (const note of sortNotes(notes)) {
    if (note.url !== url) {
      url = note.url;
      lines.push("", `### ${note.page}`, "", note.url);
    }
    const changed = note.changed === true ? ` · _${message(lang, "feedbackChanged")}_` : "";
    const quote = [
      ...(note.excerpt === "" ? [] : [note.excerpt]),
      ...(note.selection === undefined ? [] : [message(lang, "feedbackMarked", { text: note.selection })]),
    ];
    lines.push(
      "",
      `**${placeLabel(note, lang)}** \`${note.blockId}\`${changed}`,
      ...(quote.length === 0 ? [] : ["", ...quoted(quote.join("\n"))]),
      "",
      note.text.trim(),
    );
  }
  return `${lines.join("\n")}\n`;
}

/**
 * The address of a new issue in `repository` (owner/repo) on GitHub: its title "Feedback: <app>", and as its body a
 * comment that says to paste the text the app copied when it opened the issue. The notes themselves go by the
 * clipboard: an address is too short for them.
 */
export function issueAddress(repository: string, app: string, lang: string): string {
  const title = message(lang, "feedbackIssueTitle", { app });
  const body = message(lang, "feedbackIssueBody");
  return `https://github.com/${repository}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/** Whether the address `href` switches the mode on: it has ?feedback (with any value but "0"). */
export function switchesOn(href: string): boolean {
  const value = new URL(href).searchParams.get(FEEDBACK_PARAM);
  return value !== null && value !== "0";
}
