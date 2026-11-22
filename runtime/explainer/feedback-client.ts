// The feedback mode in the page (feedback.ts has what it keeps and writes). Without JavaScript there is no mode: the
// ways in stay hidden. With it, the way in shows at the end of a content page and in its section on the start page;
// "Feedback zu „<App>“ geben" or ?feedback in the address switches the mode on, and it stays on for this app (on the
// device) until "Beenden". While it is on, every block of a content page (the build's wrapper, block-id.ts) has a
// button "Notiz", the bar beside the page (below it on a narrow screen) has the form of a note, with the text marked in
// the block as its quote, and the app's notes: each with where it is, "Zur Stelle" and "Löschen"; "Kopieren" puts the
// export on the clipboard, "Issue auf GitHub öffnen" copies it too and opens a new issue in the app's repository with
// its title and a comment in its body that says to paste it, and
// "Alle löschen …" asks first. The first time, the bar opens on its help. A note on a block the page no longer has
// (its id changed with its content) is marked as changed. Nothing leaves the page but what the person copies; the mode
// stores nothing until it is switched on.
import { createStorage, type DeviceStorage } from "@lernapps/tooling/storage";
import { moveFocus } from "@lernapps/tooling/a11y";
import {
  EXCERPT_LENGTH,
  exportMarkdown,
  FEEDBACK_KEY,
  FEEDBACK_PARAM,
  isFeedbackState,
  isNotes,
  issueAddress,
  NOTES_KEY,
  placeLabel,
  SELECTION_LENGTH,
  shorten,
  sortNotes,
  switchesOn,
  type FeedbackState,
  type Note,
} from "./feedback.ts";
import { message } from "./messages.ts";

/** What the build gives the mode on each page (render.ts, feedbackData). */
interface FeedbackData {
  storage: string;
  app: string;
  /** The start page, from this page. */
  root: string;
  repository?: string;
  revision?: string;
  /** The content page: its title and its place among the app's content pages. */
  page?: { title: string; order: number };
}

/** The fragment of a link to a block: #feedback-<position>. */
const TARGET = "feedback-";

/** The address of the page without query and fragment: where a note is. */
const pageAddress = (href: string): string => {
  const url = new URL(href);
  return `${url.origin}${url.pathname}`;
};

/** A new id for a note. */
const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** The text of a block as a reader sees it, without the mode's own button. */
function blockText(block: HTMLElement): string {
  const copy = block.cloneNode(true) as HTMLElement;
  for (const own of copy.querySelectorAll(".explainer-feedback-add, script, template, [hidden]")) own.remove();
  return copy.textContent ?? "";
}

/** The title of the section a block is in, if any: the heading the section starts with. */
function sectionOf(block: HTMLElement): string | undefined {
  const section = block.closest("section.explainer-section");
  const heading = section?.querySelector(":scope > h2, :scope > h3, :scope > h4");
  const text = heading?.textContent?.replace(/\s+/g, " ").trim();
  return text === undefined || text === "" ? undefined : text;
}

/** The innermost block a range is in, if both its ends are in one. */
function blockOfRange(range: Range): HTMLElement | undefined {
  const node = range.commonAncestorContainer;
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest<HTMLElement>(".explainer-block") ?? undefined;
}

class Feedback {
  readonly #root: Document;
  readonly #data: FeedbackData;
  readonly #storage: DeviceStorage;
  readonly #panel: HTMLElement;
  readonly #lang: string;
  readonly #url: string;
  #state: FeedbackState | undefined;
  /** The block the form is for, and the text marked last within a block. */
  #block: HTMLElement | undefined;
  #marked: { block: HTMLElement; text: string } | undefined;
  #say: ReturnType<typeof setTimeout> | undefined;

  constructor(root: Document, panel: HTMLElement, data: FeedbackData) {
    this.#root = root;
    this.#panel = panel;
    this.#data = data;
    this.#storage = createStorage(data.storage);
    this.#lang = root.documentElement.lang || "de";
    this.#url = pageAddress(root.location.href);
    this.#state = this.#storage.load(FEEDBACK_KEY, isFeedbackState);
  }

  #part<T extends HTMLElement>(selector: string): T | null {
    return this.#panel.querySelector<T>(selector);
  }

  #t(key: Parameters<typeof message>[1], params?: Readonly<Record<string, string>>): string {
    return message(this.#lang, key, params);
  }

  get on(): boolean {
    return this.#state?.on === true;
  }

  notes(): Note[] {
    return this.#storage.load(NOTES_KEY, isNotes) ?? [];
  }

  #saveNotes(notes: readonly Note[]): boolean {
    if (notes.length === 0) {
      this.#storage.remove(NOTES_KEY);
      return true;
    }
    return this.#storage.save(NOTES_KEY, notes);
  }

  start(): void {
    for (const way of this.#root.querySelectorAll<HTMLElement>(".explainer-feedback-invite")) way.hidden = false;
    for (const button of this.#root.querySelectorAll<HTMLButtonElement>("button.explainer-feedback-switch")) {
      button.addEventListener("click", () => {
        this.switchOn();
        const heading = this.#part<HTMLElement>("h2");
        if (heading) moveFocus(heading);
      });
    }
    this.#wirePanel();
    this.#root.addEventListener("selectionchange", () => this.#remember());
    if (switchesOn(this.#root.location.href)) {
      // the address switched it on: the parameter's work is done, the address stays as the page's
      const url = new URL(this.#root.location.href);
      url.searchParams.delete(FEEDBACK_PARAM);
      this.#root.defaultView?.history.replaceState(this.#root.defaultView.history.state, "", url.href);
      this.switchOn();
    } else if (this.on) this.#show();
  }

  switchOn(): void {
    if (!this.on) {
      this.#state = { on: true, ...(this.#state?.seen === true ? { seen: true } : {}) };
      this.#storage.save(FEEDBACK_KEY, this.#state);
    }
    this.#show();
  }

  /** Ends the mode; that its help was seen stays, so that it does not open on the help again. */
  switchOff(): void {
    if (this.#state?.seen === true) {
      this.#state = { on: false, seen: true };
      this.#storage.save(FEEDBACK_KEY, this.#state);
    } else {
      this.#storage.remove(FEEDBACK_KEY);
      this.#state = undefined;
    }
    this.#root.documentElement.classList.remove("explainer-feedback-on");
    this.#panel.hidden = true;
    for (const button of this.#root.querySelectorAll(".explainer-feedback-add")) button.remove();
    this.#closeForm();
  }

  /** The mode on the page: the bar, the buttons of the blocks, the notes; the help the first time. */
  #show(): void {
    this.#root.documentElement.classList.add("explainer-feedback-on");
    this.#panel.hidden = false;
    this.#markChanged();
    this.#addButtons();
    this.#render();
    if (this.#state?.seen !== true) this.#help(true);
    this.#goToTarget();
  }

  /** Marks this page's notes whose block the page no longer has, and unmarks those it has again. */
  #markChanged(): void {
    const notes = this.notes();
    let differs = false;
    const ids = new Set(
      [...this.#root.querySelectorAll<HTMLElement>(".explainer-block")].map((block) => block.dataset["blockId"]),
    );
    const marked = notes.map((note) => {
      if (note.url !== this.#url) return note;
      const changed = !ids.has(note.blockId);
      if ((note.changed === true) === changed) return note;
      differs = true;
      const { changed: _, ...rest } = note;
      return changed ? { ...rest, changed: true } : rest;
    });
    if (differs) this.#saveNotes(marked);
  }

  #addButtons(): void {
    const counts = new Map<string, number>();
    for (const note of this.notes()) {
      if (note.url !== this.#url) continue;
      const key = `${note.position} ${note.blockId}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const block of this.#root.querySelectorAll<HTMLElement>("main .explainer-block")) {
      let button = block.querySelector<HTMLButtonElement>(":scope > .explainer-feedback-add");
      if (!button) {
        button = this.#root.createElement("button");
        button.type = "button";
        button.className = "explainer-feedback-add";
        button.addEventListener("click", () => this.#openForm(block));
        block.prepend(button);
      }
      const position = block.dataset["block"] ?? "";
      const count = counts.get(`${position} ${block.dataset["blockId"] ?? ""}`) ?? 0;
      const label = this.#t("feedbackAddLabel", { place: position });
      button.setAttribute(
        "aria-label",
        count === 0 ? label : `${label}, ${this.#t("feedbackNotesOnBlock", { count: `${count}` })}`,
      );
      button.replaceChildren(this.#t("feedbackAdd"));
      if (count > 0) {
        const badge = this.#root.createElement("span");
        badge.className = "explainer-feedback-badge";
        badge.textContent = `${count}`;
        button.append(" ", badge);
      }
      block.toggleAttribute("data-noted", count > 0);
    }
  }

  /** Keeps the text marked last within a block, for the note begun next on that block. */
  #remember(): void {
    const selection = this.#root.getSelection();
    if (!this.on || !selection || selection.isCollapsed || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const block = blockOfRange(range);
    if (!block || this.#panel.contains(block)) return;
    const text = selection.toString().replace(/\s+/g, " ").trim();
    if (text !== "") this.#marked = { block, text };
  }

  #openForm(block: HTMLElement): void {
    const form = this.#part<HTMLFormElement>("form.explainer-feedback-form");
    const where = this.#part<HTMLElement>(".explainer-feedback-where");
    const quote = this.#part<HTMLElement>(".explainer-feedback-quote");
    const text = this.#part<HTMLTextAreaElement>("textarea.explainer-feedback-text");
    if (!form || !where || !quote || !text) return;
    this.#expand(true);
    this.#block = block;
    const marked = this.#marked !== undefined && block.contains(this.#marked.block) ? this.#marked.text : undefined;
    this.#marked = undefined;
    where.textContent = placeLabel(this.#draft(block, "", marked), this.#lang);
    quote.hidden = marked === undefined;
    quote.textContent = marked === undefined ? "" : `„${shorten(marked, SELECTION_LENGTH)}“`;
    form.dataset["selection"] = marked ?? "";
    for (const other of this.#root.querySelectorAll(".explainer-block[data-noting]"))
      other.removeAttribute("data-noting");
    block.setAttribute("data-noting", "");
    form.hidden = false;
    // on a narrow screen the bar is a sheet over the lower part of the page: the block goes above it
    if (this.#root.defaultView?.matchMedia("(max-width: 63.9375rem)").matches === true) {
      block.scrollIntoView({ block: "start" });
    }
    text.focus({ preventScroll: true });
  }

  #closeForm(): void {
    const form = this.#part<HTMLFormElement>("form.explainer-feedback-form");
    if (form) {
      form.reset();
      form.hidden = true;
    }
    this.#block?.removeAttribute("data-noting");
    this.#block = undefined;
  }

  /** A note on `block` with `text`. */
  #draft(block: HTMLElement, text: string, selection: string | undefined): Note {
    const section = sectionOf(block);
    return {
      id: newId(),
      created: new Date().toISOString(),
      lang: this.#lang,
      url: this.#url,
      page: this.#data.page?.title ?? this.#root.title,
      pageOrder: this.#data.page?.order ?? -1,
      ...(section === undefined ? {} : { section }),
      position: block.dataset["block"] ?? "",
      blockId: block.dataset["blockId"] ?? "",
      blockType: block.dataset["blockType"] ?? "",
      blockOrder: Number(block.dataset["blockOrder"] ?? "0"),
      excerpt: shorten(blockText(block), EXCERPT_LENGTH),
      ...(selection === undefined || selection === "" ? {} : { selection: shorten(selection, SELECTION_LENGTH) }),
      text,
    };
  }

  #save(): void {
    const form = this.#part<HTMLFormElement>("form.explainer-feedback-form");
    const text = this.#part<HTMLTextAreaElement>("textarea.explainer-feedback-text");
    const block = this.#block;
    if (!form || !text || !block) return;
    const value = text.value.trim();
    if (value === "") {
      text.focus();
      return;
    }
    const note = this.#draft(block, value, form.dataset["selection"]);
    if (!this.#saveNotes([...this.notes(), note])) {
      this.#status(this.#t("feedbackFull"));
      return;
    }
    this.#closeForm();
    this.#addButtons();
    this.#render();
    this.#status(this.#t("feedbackSaved"));
    const button = block.querySelector<HTMLElement>(":scope > .explainer-feedback-add");
    if (button) moveFocus(button);
  }

  #delete(id: string): void {
    this.#saveNotes(this.notes().filter((note) => note.id !== id));
    this.#addButtons();
    this.#render();
    this.#status(this.#t("feedbackDeleted"));
  }

  #deleteAll(): void {
    const count = this.notes().length;
    if (count === 0) return;
    const ask = this.#root.defaultView?.confirm(this.#t("feedbackDeleteAllConfirm", { count: `${count}` }));
    if (ask !== true) return;
    this.#saveNotes([]);
    this.#addButtons();
    this.#render();
    this.#status(this.#t("feedbackDeletedAll"));
  }

  #export(): string {
    const lang = this.#lang;
    return exportMarkdown(this.notes(), {
      lang,
      app: this.#data.app,
      address: new URL(this.#data.root, this.#root.location.href).href,
      date: new Date().toLocaleDateString(lang),
      ...(this.#data.revision === undefined ? {} : { revision: this.#data.revision }),
    });
  }

  /** Puts the export on the clipboard; `copied` is what the status says then. Without the clipboard, the text to copy by hand. */
  async #copy(copied: "feedbackCopied" | "feedbackCopiedForIssue" = "feedbackCopied"): Promise<void> {
    const text = this.#export();
    const field = this.#part<HTMLTextAreaElement>("textarea.explainer-feedback-export");
    let done = false;
    try {
      await navigator.clipboard.writeText(text);
      done = true;
    } catch {
      done = false;
    }
    if (field) {
      field.value = text;
      field.hidden = done;
      if (!done) field.select();
    }
    this.#status(
      done
        ? this.#t(this.#data.repository === undefined ? "feedbackCopiedNoIssue" : copied)
        : this.#t("feedbackCopyFailed"),
    );
  }

  #status(text: string): void {
    const status = this.#part<HTMLElement>(".explainer-feedback-status");
    if (!status) return;
    clearTimeout(this.#say);
    status.textContent = text;
    this.#say = setTimeout(() => (status.textContent = ""), 10_000);
  }

  /** The app's notes, by page in the app's order. */
  #render(): void {
    const list = this.#part<HTMLElement>(".explainer-feedback-list");
    const count = this.#part<HTMLElement>(".explainer-feedback-count");
    const copy = this.#part<HTMLButtonElement>("button.explainer-feedback-copy");
    const issue = this.#part<HTMLAnchorElement>("a.explainer-feedback-issue");
    const all = this.#part<HTMLButtonElement>("button.explainer-feedback-delete-all");
    if (!list || !count) return;
    const notes = sortNotes(this.notes());
    count.textContent = this.#t("feedbackAll", { count: `${notes.length}` });
    if (copy) copy.disabled = notes.length === 0;
    if (all) all.disabled = notes.length === 0;
    if (issue && this.#data.repository !== undefined) {
      issue.href = issueAddress(this.#data.repository, this.#data.app, this.#lang);
      issue.hidden = notes.length === 0;
    }
    const items: HTMLElement[] = [];
    let group: HTMLElement | undefined;
    let url: string | undefined;
    for (const note of notes) {
      if (note.url !== url || !group) {
        url = note.url;
        const section = this.#root.createElement("section");
        section.className = "explainer-feedback-page";
        const heading = this.#root.createElement("h4");
        const link = this.#root.createElement("a");
        link.href = note.url;
        link.textContent = note.page;
        heading.append(link);
        group = this.#root.createElement("ul");
        section.append(heading, group);
        items.push(section);
      }
      group.append(this.#item(note));
    }
    if (items.length === 0) {
      const none = this.#root.createElement("p");
      none.className = "explainer-feedback-none";
      none.textContent = this.#t("feedbackNone");
      items.push(none);
    }
    list.replaceChildren(...items);
    const expand = this.#part<HTMLElement>(".explainer-feedback-expand span");
    if (expand) expand.textContent = `${this.#t("feedbackExpand")} (${notes.length})`;
  }

  #item(note: Note): HTMLElement {
    const item = this.#root.createElement("li");
    item.className = "explainer-feedback-note";
    const where = this.#root.createElement("p");
    where.className = "explainer-feedback-note-where";
    where.textContent = placeLabel(note, this.#lang);
    if (note.changed === true) {
      const changed = this.#root.createElement("span");
      changed.className = "explainer-feedback-changed";
      changed.textContent = this.#t("feedbackChanged");
      where.append(" ", changed);
      item.setAttribute("data-changed", "");
    }
    item.append(where);
    if (note.selection !== undefined) {
      const quote = this.#root.createElement("blockquote");
      quote.textContent = `„${shorten(note.selection, 80)}“`;
      item.append(quote);
    }
    const text = this.#root.createElement("p");
    text.className = "explainer-feedback-note-text";
    text.textContent = note.text;
    const actions = this.#root.createElement("p");
    actions.className = "explainer-feedback-note-actions";
    const go = this.#root.createElement("a");
    go.href = `${note.url}#${TARGET}${note.position}`;
    go.textContent = this.#t("feedbackGoTo");
    const remove = this.#root.createElement("button");
    remove.type = "button";
    remove.className = "explainer-feedback-delete";
    remove.textContent = this.#t("feedbackDelete");
    remove.addEventListener("click", () => this.#delete(note.id));
    actions.append(go, " ", remove);
    item.append(text, actions);
    return item;
  }

  /** On a link "Zur Stelle" (#feedback-<position>): the block, scrolled to and marked. */
  #goToTarget(): void {
    const hash = decodeURIComponent(this.#root.location.hash.slice(1));
    if (!hash.startsWith(TARGET)) return;
    const position = hash.slice(TARGET.length);
    const block = [...this.#root.querySelectorAll<HTMLElement>("main .explainer-block")].find(
      (candidate) => candidate.dataset["block"] === position,
    );
    if (!block) return;
    block.scrollIntoView({ block: "center" });
    const button = block.querySelector<HTMLElement>(":scope > .explainer-feedback-add");
    if (button) moveFocus(button);
  }

  #help(open: boolean): void {
    const help = this.#part<HTMLElement>(".explainer-feedback-help");
    const toggle = this.#part<HTMLButtonElement>("button.explainer-feedback-help-open");
    if (!help) return;
    help.hidden = !open;
    toggle?.setAttribute("aria-expanded", `${open}`);
    if (open) this.#expand(true);
  }

  #expand(open: boolean): void {
    const body = this.#part<HTMLElement>(".explainer-feedback-body");
    const foot = this.#part<HTMLElement>(".explainer-feedback-foot");
    const collapse = this.#part<HTMLButtonElement>("button.explainer-feedback-collapse");
    const expand = this.#part<HTMLButtonElement>("button.explainer-feedback-expand");
    if (body) body.hidden = !open;
    if (foot) foot.hidden = !open;
    if (expand) expand.hidden = open;
    collapse?.setAttribute("aria-expanded", `${open}`);
    this.#panel.toggleAttribute("data-collapsed", !open);
    this.#root.documentElement.classList.toggle("explainer-feedback-collapsed", !open);
  }

  #wirePanel(): void {
    this.#part<HTMLFormElement>("form.explainer-feedback-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.#save();
    });
    this.#part<HTMLButtonElement>("button.explainer-feedback-cancel")?.addEventListener("click", () => {
      const block = this.#block;
      this.#closeForm();
      const button = block?.querySelector<HTMLElement>(":scope > .explainer-feedback-add");
      if (button) moveFocus(button);
    });
    this.#part<HTMLButtonElement>("button.explainer-feedback-help-open")?.addEventListener("click", () => {
      const help = this.#part<HTMLElement>(".explainer-feedback-help");
      this.#help(help?.hidden === true);
    });
    this.#part<HTMLButtonElement>("button.explainer-feedback-help-done")?.addEventListener("click", () => {
      this.#state = { on: true, seen: true };
      this.#storage.save(FEEDBACK_KEY, this.#state);
      this.#help(false);
      const toggle = this.#part<HTMLElement>("button.explainer-feedback-help-open");
      if (toggle) moveFocus(toggle);
    });
    this.#part<HTMLButtonElement>("button.explainer-feedback-collapse")?.addEventListener("click", () => {
      this.#expand(false);
      const expand = this.#part<HTMLElement>("button.explainer-feedback-expand");
      if (expand) moveFocus(expand);
    });
    this.#part<HTMLButtonElement>("button.explainer-feedback-expand")?.addEventListener("click", () => {
      this.#expand(true);
      const collapse = this.#part<HTMLElement>("button.explainer-feedback-collapse");
      if (collapse) moveFocus(collapse);
    });
    this.#part<HTMLButtonElement>("button.explainer-feedback-copy")?.addEventListener("click", () => void this.#copy());
    // opening the issue copies the notes at once, within the click: the new issue's body says to paste them
    this.#part<HTMLAnchorElement>("a.explainer-feedback-issue")?.addEventListener(
      "click",
      () => void this.#copy("feedbackCopiedForIssue"),
    );
    this.#part<HTMLButtonElement>("button.explainer-feedback-delete-all")?.addEventListener("click", () =>
      this.#deleteAll(),
    );
    this.#part<HTMLButtonElement>("button.explainer-feedback-off")?.addEventListener("click", () => {
      this.switchOff();
      const way = this.#root.querySelector<HTMLElement>("button.explainer-feedback-switch");
      if (way) moveFocus(way);
    });
  }
}

/** Puts the content of the page's <template> `selector` into the page in its place; its first element. */
function fromTemplate(root: Document, selector: string): HTMLElement | undefined {
  const template = root.querySelector<HTMLTemplateElement>(`template${selector}`);
  if (!template) return undefined;
  const content = root.importNode(template.content, true);
  const first = content.firstElementChild;
  template.replaceWith(content);
  return first instanceof HTMLElement ? first : undefined;
}

/**
 * Starts the feedback mode's ways in, and the mode itself when it is on for this app or the address switches it on.
 * The bar and the start page's section come from their <template>s: without JavaScript there is no mode.
 */
export function startFeedback(root: Document): void {
  fromTemplate(root, ".explainer-feedback-about-template");
  const panel = fromTemplate(root, ".explainer-feedback-template");
  const script = panel?.querySelector("script.explainer-feedback-data");
  if (!panel || !script) return;
  let data: FeedbackData;
  try {
    data = JSON.parse(script.textContent ?? "{}") as FeedbackData;
  } catch {
    return;
  }
  new Feedback(root, panel, data).start();
}
