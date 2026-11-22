// The vocabulary block of an explainer: words to learn as a vocabulary book shows them. The build writes a table: the
// word in the target language with its further forms and its gender, a middle column with an example, a note and a
// false friend (only when an entry has one of them), and the word in the source language. Every word carries its
// language (lang). The words are shown as written: the creator writes the article with a noun, nothing is derived. An
// entry may have tables of its forms (a conjugation, a declension), folded under it in <details>; **…** in a cell
// highlights an ending. That is the whole block without JavaScript. The client module shows the buttons that cover the
// column of one language; each covered cell gets a button that uncovers it. Nothing is checked and nothing is stored:
// words to write and check are a language task. The tutor page lists the words as lines (vocabularyLines).
// Browser-safe: render.ts writes the table at build, explainer.ts starts the buttons in the browser.
import type { BlockOf, Text, VocabularyEntry, VocabularyForms } from "./content.ts";
import { escape } from "../shared/html.ts";
import { message } from "./messages.ts";
import { languageName } from "./needs.ts";

/** How a page turns the texts of the block into HTML: a plain text, and restricted Markdown without a paragraph. */
export interface VocabularyContext {
  lang: string;
  text: (text: Text) => string;
  inline: (text: Text) => string;
}

/** The gender as the page shows it after the word: (m), (f), (n). */
export const genderLabel = (gender: NonNullable<VocabularyEntry["gender"]>): string => `(${gender})`;

/** Whether an entry has something for the middle column: an example, a note or a false friend. */
const hasHint = (entry: VocabularyEntry): boolean =>
  entry.example !== undefined || entry.note !== undefined || entry.falseFriend !== undefined;

/** Whether a table of forms highlights something with **…**. */
const isMarked = (forms: VocabularyForms): boolean =>
  forms.rows.some((row) => row.some((cell) => /\*\*.+?\*\*/.test(cell)));

/** A cell of a table of forms as HTML: escaped, with **…** as the highlighted part. */
const formCell = (cell: string): string => escape(cell).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

/** The word as written, its further forms and its gender, in the target language. */
function term(entry: VocabularyEntry, target: string): string {
  const forms =
    entry.forms === undefined
      ? ""
      : `<span class="explainer-vocabulary-more">, ${entry.forms.map(escape).join(", ")}</span>`;
  const gender =
    entry.gender === undefined ? "" : ` <span class="explainer-vocabulary-gender">${genderLabel(entry.gender)}</span>`;
  return `<span lang="${escape(target)}"><span class="explainer-vocabulary-word">${escape(entry.target)}</span>${forms}</span>${gender}`;
}

/** The middle column: the example with its translation, the note and the false friend. */
function hint(
  context: VocabularyContext,
  entry: VocabularyEntry,
  languages: { source: string; target: string },
): string {
  const parts: string[] = [];
  if (entry.example !== undefined)
    parts.push(
      `<p class="explainer-vocabulary-example"><i lang="${escape(languages.target)}">${escape(entry.example.target)}</i>` +
        ` <span lang="${escape(languages.source)}">${escape(entry.example.source)}</span></p>`,
    );
  if (entry.note !== undefined) parts.push(`<p>${context.inline(entry.note)}</p>`);
  if (entry.falseFriend !== undefined)
    parts.push(
      `<p class="explainer-vocabulary-false-friend"><strong>${escape(message(context.lang, "vocabularyFalseFriend"))}</strong> ${context.inline(entry.falseFriend)}</p>`,
    );
  return parts.join("");
}

/** A table of forms: its caption, its header, its rows with the first cell heading each. */
function formsTable(context: VocabularyContext, forms: VocabularyForms, target: string): string {
  const head =
    forms.header === undefined
      ? ""
      : `<thead><tr>${forms.header.map((cell) => `<th scope="col">${context.text(cell)}</th>`).join("")}</tr></thead>`;
  const rows = forms.rows
    .map(
      ([first = "", ...rest]) =>
        `<tr><th scope="row">${formCell(first)}</th>${rest.map((cell) => `<td lang="${escape(target)}">${formCell(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table><caption>${context.text(forms.caption)}</caption>${head}<tbody>${rows}</tbody></table>`;
}

/** The forms of an entry, folded: the captions and the word as summary, the tables, and what a highlight means. */
function formsOf(context: VocabularyContext, entry: VocabularyEntry, target: string): string {
  const inflection = entry.inflection ?? [];
  const captions = inflection.map((forms) => context.text(forms.caption)).join(", ");
  const marked = inflection.some(isMarked)
    ? `<p class="explainer-vocabulary-marked">${escape(message(context.lang, "vocabularyMarked"))}</p>`
    : "";
  return [
    `<details class="explainer-vocabulary-forms">`,
    `<summary>${captions}: <span lang="${escape(target)}">${escape(entry.target)}</span></summary>`,
    `<div class="explainer-vocabulary-tables">${inflection.map((forms) => formsTable(context, forms, target)).join("")}</div>`,
    marked,
    `</details>`,
  ].join("");
}

/**
 * A vocabulary block as the build writes it: the buttons to cover a column, hidden until the client module runs, and
 * the table. The middle column is there only when an entry has an example, a note or a false friend.
 */
export function renderVocabulary(context: VocabularyContext, block: BlockOf<"vocabulary">): string {
  const { lang } = context;
  const { source, target } = block.languages;
  const middle = block.entries.some(hasHint);
  const columns = middle ? 3 : 2;
  const names = { target: languageName(target, lang), source: languageName(source, lang) };
  const cover = (side: "target" | "source") =>
    `<button type="button" class="explainer-vocabulary-cover" data-side="${side}" aria-pressed="false">${escape(message(lang, "vocabularyCover", { language: names[side] }))}</button>`;
  const rows = block.entries.map((entry, index) => {
    const forms = entry.inflection === undefined ? "" : ` explainer-vocabulary-has-forms`;
    const row = [
      `<tr class="explainer-vocabulary-entry${forms}">`,
      `<th scope="row" data-side="target" data-row="${index + 1}">${term(entry, target)}</th>`,
      middle ? `<td class="explainer-vocabulary-hint">${hint(context, entry, block.languages)}</td>` : "",
      `<td data-side="source" data-row="${index + 1}" lang="${escape(source)}"><span>${escape(entry.source)}</span></td>`,
      `</tr>`,
    ].join("");
    return entry.inflection === undefined
      ? row
      : `${row}<tr class="explainer-vocabulary-forms-row"><td colspan="${columns}">${formsOf(context, entry, target)}</td></tr>`;
  });
  return [
    `<div class="explainer-vocabulary" data-language-target="${escape(names.target)}" data-language-source="${escape(names.source)}">`,
    `<p class="explainer-vocabulary-tools" role="group" aria-label="${escape(message(lang, "vocabularyTools"))}" hidden>${cover("target")} ${cover("source")}</p>`,
    `<div class="explainer-vocabulary-scroll"><table>`,
    `<caption>${context.text(block.caption)}</caption>`,
    `<thead><tr><th scope="col">${escape(names.target)}</th>`,
    middle ? `<th scope="col">${escape(message(lang, "vocabularyHint"))}</th>` : "",
    `<th scope="col">${escape(names.source)}</th></tr></thead>`,
    `<tbody>${rows.join("")}</tbody>`,
    `</table></div>`,
    `</div>`,
  ].join("");
}

/**
 * The block as a KI tutor reads it in the page's content (tutor.ts): its caption with the two languages, then one line
 * per word, "le pain (m) – das Brot", with its example, note and false friend, and its tables of forms as lines below
 * it. `one` turns a text into a line of Markdown; `words` names the parts in the page's language.
 */
export function vocabularyLines(
  block: BlockOf<"vocabulary">,
  lang: string,
  one: (text: Text) => string,
  words: { vocabulary: string; example: string; note: string; falseFriend: string },
): string[] {
  const { source, target } = block.languages;
  const lines = [
    `${words.vocabulary} (${languageName(target, lang)} – ${languageName(source, lang)}): ${one(block.caption)}`,
  ];
  for (const entry of block.entries) {
    const forms = entry.forms === undefined ? "" : `, ${entry.forms.join(", ")}`;
    const gender = entry.gender === undefined ? "" : ` ${genderLabel(entry.gender)}`;
    const more = [
      ...(entry.example === undefined ? [] : [`${words.example}: ${entry.example.target} – ${entry.example.source}`]),
      ...(entry.note === undefined ? [] : [`${words.note}: ${one(entry.note)}`]),
      ...(entry.falseFriend === undefined ? [] : [`${words.falseFriend}: ${one(entry.falseFriend)}`]),
    ];
    lines.push(
      `- ${entry.target}${forms}${gender} – ${entry.source}${more.length === 0 ? "" : `. ${more.join(". ")}`}`,
    );
    for (const table of entry.inflection ?? []) {
      const header = table.header === undefined ? [] : [table.header.map(one).join(" | ")];
      const rows = table.rows.map((row) => row.join(" | "));
      lines.push(`  - ${one(table.caption)}: ${[...header, ...rows].join("; ")}`);
    }
  }
  return lines;
}

/** Covers the cells of `side` in the block, or uncovers all when `side` is undefined. */
function cover(block: HTMLElement, side: string | undefined): void {
  const lang = block.ownerDocument.documentElement.lang || "de";
  for (const button of block.querySelectorAll<HTMLButtonElement>(".explainer-vocabulary-cover"))
    button.setAttribute("aria-pressed", String(button.dataset["side"] === side));
  for (const cell of block.querySelectorAll<HTMLElement>("[data-side][data-row]")) {
    cell.querySelector(":scope > .explainer-vocabulary-reveal")?.remove();
    const covered = cell.dataset["side"] === side;
    cell.classList.toggle("explainer-vocabulary-covered", covered);
    if (!covered) continue;
    const language =
      (cell.dataset["side"] === "target" ? block.dataset["languageTarget"] : block.dataset["languageSource"]) ?? "";
    const reveal = block.ownerDocument.createElement("button");
    reveal.type = "button";
    reveal.className = "explainer-vocabulary-reveal";
    reveal.textContent = message(lang, "vocabularyReveal");
    reveal.setAttribute(
      "aria-label",
      message(lang, "vocabularyRevealLabel", { language, n: cell.dataset["row"] ?? "" }),
    );
    reveal.addEventListener("click", () => {
      cell.classList.remove("explainer-vocabulary-covered");
      reveal.remove();
      cell.tabIndex = -1;
      cell.focus();
    });
    cell.prepend(reveal);
  }
  // the forms show the words of the target language: they close while it is covered
  if (side === "target")
    for (const details of block.querySelectorAll<HTMLDetailsElement>("details.explainer-vocabulary-forms"))
      details.open = false;
}

/**
 * Starts every vocabulary block of the page: the buttons to cover a column show. A button covers the cells of its
 * language and is pressed; pressed again it uncovers them; the other button switches to the other language.
 */
export function startVocabulary(root: Document): void {
  for (const block of root.querySelectorAll<HTMLElement>(".explainer-vocabulary")) {
    const tools = block.querySelector<HTMLElement>(".explainer-vocabulary-tools");
    if (!tools) continue;
    for (const button of tools.querySelectorAll<HTMLButtonElement>(".explainer-vocabulary-cover"))
      button.addEventListener("click", () =>
        cover(block, button.getAttribute("aria-pressed") === "true" ? undefined : button.dataset["side"]),
      );
    tools.hidden = false;
  }
}
