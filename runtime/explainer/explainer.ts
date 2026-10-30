// The client module of an explainer (@lernapps/app-templates/explainer), loaded by every page from the app's
// src/main.ts. Every page is complete without JavaScript; this module only adds: it marks the page as running with
// JavaScript (class explainer-js on <html>) and makes its exercises live. Every exercise is answered before its
// solution shows: a wrong answer gets its reason and may be tried again, and the solution shows after the right
// answer or "Lösung zeigen" (startQuestion of the shared questions with retry). A question of one of the question types gets
// the question's controls, "Prüfen" and its feedback; its "Lösung" for readers without JavaScript goes, as the question
// shows the same after the answer. A generated exercise gets a live task: from the seed in the address when the
// address names its task number (?<exercise>=<n>), else from a random one; its seed from the exercise's table
// of distinct tasks (tasks.ts), "Aufgabe Nr. <n>" above it; the question's controls, checker and feedback through its
// comparator, the message of a typical mistake, and "Neue Aufgabe", which moves to the next task number; the address
// always holds the task number of every exercise of the page. Its worked tasks, with their solutions, stay hidden with
// JavaScript. The page keeps in memory how far the learner got with each task (result.ts): a page a tutor opened
// (via=tutor in the address, beside any seed) gets "Zurück zum Tutor", which copies a result line with the address of
// the page's tutor page for the running chat; the tab stays open, and its button says where to paste. The learner
// switches a way to the tutor on once, on the start page or beside the title of a page: an assistant of the app, or copying the text; it is kept on the device.
// Two ways lead to the tutor, both naming the page's tutor page with where the learner is in its query (position.ts),
// the one source of what the tutor gets (tutorpage.ts). A: while a way is on, a bar beside the title of a content
// page, "Mit <name> lernen", opens the assistant with the start prompt (prompt.ts). B: the help button in the row of
// "Prüfen" and "Lösung" of every exercise, there only while a way is on, "Hilfe" and after a wrong answer "Warum?",
// gives the lines of that task (stuck.ts: the task, the input, the app's message word for word, the tutor page):
// without a chat (B1) it opens the way switched on with them; on a page a tutor opened (B2) it copies the lines and
// says where to paste them, and once the task is done it is "Zurück", which copies the result line. Copying instead
// of an assistant adds the tutor page's Markdown. Input and message leave the page only with the click. A video gets its
// button, which loads its player, and the choice "Videos immer direkt laden" (video.ts), kept on the device too. A
// self-assessment runs on its own page, offered on the start page or its chapter's page (assessment-client.ts); its
// way to the tutor is the one switched on, or one chosen there.
import { moveFocus } from "@lernapps/tooling/a11y";
import { createSettings, createStorage, type SettingScope } from "@lernapps/tooling/storage";
import { startQuestion } from "../shared/questions/engine.ts";
import { renderQuestion } from "../shared/questions/render.ts";
import { questionId } from "../shared/questions/question.ts";
import type { ExerciseData } from "./exercises.ts";
import { diagnose, questionFor } from "./generated/question.ts";
import { hintOf, stepsOf, taskText } from "./generated/texts.ts";
import { generate } from "./generated/values.ts";
import { message } from "./messages.ts";
import { answerShown, Progress, resultLine, sessionLines } from "./result.ts";
import { stuckLines, stuckPrompt } from "./stuck.ts";
import { currentExercise, pageQuery, taskQuery, type PagePosition } from "./position.ts";
import {
  isNeedsChoice,
  NEEDS_KEY,
  OTHER_LANGUAGE,
  withLanguage,
  withNeeds,
  type Need,
  type NeedsChoice,
} from "./needs.ts";
import {
  addressOf,
  NEW_TASK_ICON,
  nextTaskNumber,
  numberFromAddress,
  randomTaskNumber,
  SHOWN_EVENT,
  taskNumber,
} from "./tasks.ts";
import { escape } from "../shared/html.ts";
import { startVideos } from "./video.ts";
import { startAssessment } from "./assessment-client.ts";

/** Makes a generated exercise live: a task from a seed, checked by the shared questions, and "Neue Aufgabe". */
function startGenerated(
  element: HTMLElement,
  data: Extract<ExerciseData, { kind: "generated" }>,
  progress: Progress,
): void {
  const live = element.querySelector<HTMLElement>(".explainer-live");
  if (!live) return;
  const { spec, templates, lang, texts } = data;
  // the worked tasks with their solutions: hidden with JavaScript (the learner gets new tasks)
  for (const part of element.querySelectorAll<HTMLElement>(".explainer-worked-intro, .explainer-worked")) {
    part.hidden = true;
  }
  const { seeds } = data;
  const count = Math.max(seeds.length, 1);
  const from = numberFromAddress(location.href, spec.id);
  let number = from === undefined ? randomTaskNumber(count) : taskNumber(from, count);
  // the address always names the task shown: it is the link to share
  history.replaceState(history.state, "", addressOf(location.href, spec.id, number));

  const show = (focus: boolean) => {
    const task = generate(spec, seeds[number - 1] ?? number, data.data);
    const question = questionFor(spec, task, lang, templates);
    const hint = hintOf(spec, task, lang, templates);
    const steps = stepsOf(spec, task, lang, templates);
    live.innerHTML = [
      `<p class="explainer-practice">${escape(texts.practice)}</p>`,
      `<p class="explainer-task-number">${escape(texts.taskNumber.replace("{n}", String(number)))} <button type="button" class="explainer-new-task" aria-label="${escape(texts.newTask)}" title="${escape(texts.newTask)}">${NEW_TASK_ICON}</button></p>`,
      renderQuestion(question, {
        lang,
        textHtml: taskText(spec, task, lang, templates),
        ...(steps.length === 0
          ? {}
          : {
              explanationHtml: `<ol class="explainer-steps">${steps.map((step) => `<li>${step}</li>`).join("")}</ol>`,
            }),
      }),
      hint === undefined
        ? ""
        : `<details class="explainer-hint"><summary>${escape(texts.hint)}</summary><p>${hint}</p></details>`,
    ].join("\n");
    live.hidden = false;
    const item = live.querySelector<HTMLElement>(`#${questionId(question)}`);
    if (item) {
      const shown = number;
      startQuestion(item, question, {
        lang,
        retry: true,
        diagnose: (answer) => diagnose(spec, task, question, answer, lang, templates),
        onAnswer: (answer, right, said) =>
          progress.answered(spec.id, shown, right, answerShown(question, answer, lang), said),
        onReveal: () => progress.revealed(spec.id, shown),
      });
      const opened = live.querySelector<HTMLDetailsElement>("details.explainer-hint");
      opened?.addEventListener("toggle", () => {
        if (opened.open) progress.hinted(spec.id, shown);
      });
      const legend = item.querySelector<HTMLElement>("legend");
      if (focus && legend) moveFocus(legend);
    }
    element.dispatchEvent(new CustomEvent(SHOWN_EVENT, { bubbles: true }));
    live.querySelector(".explainer-new-task")?.addEventListener("click", () => {
      // the tasks of the numbers are distinct: the next number is a new task
      number = nextTaskNumber(number, count);
      history.replaceState(history.state, "", addressOf(location.href, spec.id, number));
      show(true);
    });
  };
  show(false);
}

/** Whether a tutor opened the page: via=tutor in its address, exactly so. */
export const fromTutor = (href: string): boolean => new URL(href).searchParams.get("via") === "tutor";

/** The event an island sends for an exercise component's answer (islands.ts), with { correct, answer?, message? }. */
export const ANSWERED_EVENT = "explainer-answered";

/** How long the button says "kopiert" after a copy. */
const DONE_MS = 8000;

/** What the tutor section of a page gives the client module (render.ts, prompt.ts). */
interface TutorData {
  /** The start prompt a provider link carries, with `query` on a content page. */
  start: string;
  base: string;
  query: string;
  /** The root of the language tree, relative to this page. */
  root: string;
  storage: string;
  /** The content page, for the learner's position and the result line. */
  page?: PagePosition & { title: string };
  /** The page's tutor page, from the root of the language tree. */
  tutor?: string;
  /** The Markdown of the page's tutor page, from the root of the language tree, for copying. */
  markdown?: string;
  ways: { name: string; url: string; paste?: boolean }[];
  /** The short message a way that needs pasting gets in its address. */
  placeholder: string;
  go: string;
  /** The button after a copy: "kopiert", with `{name}`. */
  done: string;
  copy: string;
  copied: string;
  failed: string;
}

/** The data of the page's tutor section, if it has one. */
function tutorData(root: Document): TutorData | undefined {
  const script = root.querySelector(".explainer-tutor script.explainer-tutor-prompt");
  return script ? (JSON.parse(script.textContent ?? "{}") as TutorData) : undefined;
}

/** Whether `text` is now on the clipboard. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** The absolute address of the page's tutor page with `query`, from the page at `href`. */
const tutorAddress = (href: string, data: TutorData, query: string): string =>
  new URL(`${data.tutor ?? ""}${query}`, new URL(data.root, href)).href;

/**
 * `prompt` with the Markdown of the page's tutor page after it, for an assistant that fetches nothing: the app's own
 * static file; the prompt alone when it is not reachable, as it names the tutor page.
 */
async function withMarkdown(prompt: string, data: TutorData, href: string): Promise<string> {
  if (data.markdown === undefined) return prompt;
  try {
    const response = await fetch(new URL(data.markdown, new URL(data.root, href)).href);
    if (response.ok) return `${prompt}\n\n${(await response.text()).trimEnd()}\n`;
  } catch {
    // not reachable: the prompt names the tutor page
  }
  return prompt;
}

/**
 * The result line of the page at `href` (result.ts): of the exercise `id`, else of the one the learner answered last,
 * else the one the anchor names, else the page's first; with the absolute address of the page's tutor page with the
 * position.
 */
function resultOf(href: string, lang: string, data: TutorData, progress: Progress, id?: string): string | undefined {
  const { page, tutor } = data;
  const exercise =
    page === undefined
      ? undefined
      : (page.exercises.find((candidate) => candidate.id === id) ??
        currentExercise(href, page, progress.last) ??
        page.exercises[0]);
  if (page === undefined || exercise === undefined || tutor === undefined) return undefined;
  const n = exercise.numbered ? numberFromAddress(href, exercise.id) : undefined;
  return resultLine(
    {
      page: page.title,
      exercise: exercise.id,
      ...(n === undefined ? {} : { number: n }),
      state: progress.state(exercise.id, n),
      session: progress.session(),
      tutor: tutorAddress(href, data, taskQuery(href, page, exercise.id)),
    },
    lang,
  );
}

/** The texts of copying for a running chat: the status once copied, and when copying fails. */
interface CopyTexts {
  copied: string;
  failed: string;
}

/**
 * Copies `text` for the running chat with the tutor ("Zurück zum Tutor", "Hilfe" and "Zurück" on a page a tutor
 * opened, via=tutor): the tab stays open, as closing it let the browser show some other tab; `button` says "✓ Kopiert"
 * for a while, as the tutor bar does after copying, and `status`, on a line below it, where to paste it. When
 * copying fails, the text is selected in `field` to copy by hand. The text goes to the clipboard only, never over the
 * network.
 */
function copyForChat(
  root: Document,
  text: string,
  button: HTMLButtonElement,
  status: HTMLElement,
  field: HTMLTextAreaElement,
  texts: CopyTexts,
): void {
  const lang = root.documentElement.lang;
  status.textContent = "";
  void copyText(text).then((copied) => {
    if (!copied) {
      field.value = text;
      field.hidden = false;
      field.focus();
      field.select();
      status.textContent = texts.failed;
      return;
    }
    field.hidden = true;
    status.textContent = texts.copied;
    const before = [...button.childNodes];
    button.dataset["done"] = "";
    button.textContent = message(lang, "backToTutorDone");
    setTimeout(() => {
      if (button.dataset["done"] === undefined) return;
      delete button.dataset["done"];
      button.replaceChildren(...before);
    }, DONE_MS);
  });
}

/** A status line and the field for copying by hand, hidden until copying fails. */
function statusAndField(root: Document, label: string): { status: HTMLElement; field: HTMLTextAreaElement } {
  const status = root.createElement("span");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const field = root.createElement("textarea");
  field.className = "explainer-back-line";
  field.readOnly = true;
  field.rows = 3;
  field.hidden = true;
  field.setAttribute("aria-label", label);
  return { status, field };
}

/**
 * What "Zurück zum Tutor" copies on the page at `href`: the page's tutor page with the page's task numbers, and each
 * task the learner did in this session with how it went (result.ts, sessionLines).
 */
function sessionOf(href: string, lang: string, data: TutorData, progress: Progress): string | undefined {
  const { page, tutor } = data;
  if (page === undefined || tutor === undefined) return undefined;
  return sessionLines(tutorAddress(href, data, pageQuery(href, page)), progress.tasks(), progress.session(), lang);
}

/**
 * "Zurück zum Tutor" at the top and at the end of a page a tutor opened (via=tutor): it copies the page's tutor page
 * and how each task of the session went, for the running chat (copyForChat).
 */
function startBackToTutor(root: Document, main: HTMLElement, data: TutorData | undefined, progress: Progress): void {
  const lang = root.documentElement.lang;
  for (const at of ["top", "end"] as const) {
    const box = root.createElement("p");
    box.className = `explainer-back explainer-back-${at}`;
    const button = root.createElement("button");
    button.type = "button";
    button.textContent = message(lang, "backToTutor");
    const { status, field } = statusAndField(root, message(lang, "resultLabel"));
    button.addEventListener("click", () => {
      const lines = data === undefined ? undefined : sessionOf(root.location.href, lang, data, progress);
      const name = chatName(data, lang);
      if (lines === undefined) {
        status.textContent = message(lang, "backToTutorOpen", { name });
        return;
      }
      copyForChat(root, lines, button, status, field, {
        copied: message(lang, "backToTutorCopied", { name }),
        failed: message(lang, "backToTutorFailed", { name }),
      });
    });
    box.append(button, " ", status, field);
    if (at === "top") main.prepend(box);
    else main.append(box);
  }
}

/** The prompts of a way to the tutor: the one a provider link carries, and the one to copy. */
interface Prompts {
  start: () => string;
  copy: () => string | Promise<string>;
  /** What a way that needs pasting gets in its address. */
  placeholder: string;
}

/**
 * Opens the assistant `provider` with the start prompt, when its address takes one; else copies the prompt to copy and
 * opens the assistant (none for copying the text), and `say` tells whether copying worked. A way that needs pasting
 * copies only the start prompt, at once, and its address gets only the placeholder message. The window opens at the click, which a browser
 * allows; the address follows once the prompt is copied.
 */
function openAssistant(
  root: Document,
  provider: { url?: string; paste?: boolean } | undefined,
  prompts: Prompts,
  say: (copied: boolean | undefined) => void,
): void {
  const template = provider?.url;
  const paste = provider?.paste === true;
  if (template !== undefined && template.includes("{prompt}") && !paste) {
    say(undefined);
    root.defaultView?.open(template.split("{prompt}").join(encodeURIComponent(prompts.start())), "_blank", "noopener");
    return;
  }
  // a way that needs pasting copies the start prompt, which is there at once: the copy starts in the click, while the
  // page has the focus, before the new window takes it (Edge refused a copy that came after the fetch of the Markdown)
  const copied = paste ? copyText(prompts.start()) : undefined;
  const opened = template === undefined ? null : root.defaultView?.open("", "_blank");
  if (opened) opened.opener = null;
  void Promise.resolve(copied ?? prompts.copy()).then(async (full) => {
    say(typeof full === "boolean" ? full : await copyText(full));
    if (template === undefined) return;
    const address = paste ? template.split("{prompt}").join(encodeURIComponent(prompts.placeholder)) : template;
    if (opened) opened.location.href = address;
    else root.defaultView?.open(address, "_blank", "noopener");
  });
}

/** The key the switched-on way to the tutor is kept under on the device: an assistant's name, or COPY; none when off. */
const WAY_KEY = "tutor-way";
const COPY = "copy";
const isText = (value: unknown): value is string => typeof value === "string";

/** A way to the tutor: an assistant of the app, or copying the prompt (no address). */
interface Way {
  name: string;
  url?: string;
  /** The address takes only a placeholder message: the prompt is copied, and the learner pastes it. */
  paste?: boolean;
}

/**
 * The way to the tutor the learner switched on, kept on the device (@lernapps/tooling/storage), one per app: on the
 * start page or under the title of a page. Whoever shows something of it listens, so that switching it on or off shows
 * at once on the whole page.
 */
class WayChoice {
  readonly #storage: ReturnType<typeof createStorage>;
  readonly #ways: readonly Way[];
  readonly #listeners: (() => void)[] = [];
  constructor(storage: string, ways: readonly Way[]) {
    this.#storage = createStorage(storage);
    this.#ways = ways;
  }
  /** The way switched on, if any: an assistant the app still offers, or copying. */
  get(): Way | undefined {
    const name = this.#storage.load(WAY_KEY, isText);
    if (name === COPY) return { name: COPY };
    return this.#ways.find((way) => way.name === name);
  }
  /** Switches the way `name` on (an assistant's name, or COPY), or the tutor off. */
  set(name: string | undefined): void {
    if (name === undefined) this.#storage.remove(WAY_KEY);
    else this.#storage.save(WAY_KEY, name);
    for (const listener of this.#listeners) listener();
  }
  listen(listener: () => void): void {
    this.#listeners.push(listener);
  }
}

/** The archetype whose settings the needs are: they hold for every explainer, or for one app (dec-tutor-needs). */
const ARCHETYPE = "explainer";

/** The needs the learner chose for the tutor (needs.ts), for this app or for every explainer, if any. */
const chosenNeeds = (storage: string): NeedsChoice | undefined =>
  createSettings(storage, ARCHETYPE).load(NEEDS_KEY, isNeedsChoice)?.value;

/**
 * The name of the running chat's assistant, as "zurück zu …" says it: the one the learner switched on, else "deinem
 * KI-Tutor".
 */
function chatName(data: { storage: string; ways: readonly Way[] } | undefined, lang: string): string {
  const way = data === undefined ? undefined : new WayChoice(data.storage, data.ways).get();
  return way?.url === undefined ? message(lang, "tutorSomeoneTo") : way.name;
}

/** The name of a way as the page says it: the assistant's, or "deinen KI-Tutor" for copying. */
const nameOf = (way: Way | undefined, lang: string): string =>
  way?.url === undefined ? message(lang, "tutorSomeone") : way.name;

/** The symbol of a way: the first letter of the assistant's name in a circle, "?" for copying. */
function iconOf(root: Document, way: Way | undefined): HTMLElement {
  const icon = root.createElement("span");
  icon.className = "explainer-ki-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = way?.url === undefined ? "?" : (way.name.trim()[0] ?? "?").toUpperCase();
  return icon;
}

/**
 * The tutor's help button in every exercise of the page, way B, there only while a way to the tutor is switched on or
 * on a page a tutor opened (via=tutor). It sits in the row of "Prüfen" and "Lösung" (or below an exercise component,
 * outside its island),
 * with the assistant's symbol, and says what helps now: "Hilfe" before an answer and after the right one; "Warum?",
 * standing out, after a wrong one, with a sentence that says what the click gives the assistant; on a page a tutor
 * opened, "Zurück" once the task is right or its solution shown. "Hilfe" and "Warum?" give the lines of the task as the
 * learner has it now (stuck.ts): the task, the input with the tries, the app's message word for word, the hint or
 * solution opened, the page's tutor page with the task (taskQuery). B1, without a chat: they open the way switched
 * on, the tutor page and the task in one sentence first. B2, on a page a tutor opened: they copy the lines, and the
 * button says where to paste them (copyForChat), so the running chat goes on; "Zurück" copies the result line of the
 * task the same way.
 */
function startHelp(root: Document, data: TutorData, progress: Progress, choice: WayChoice): void {
  const { page, tutor } = data;
  if (page === undefined || tutor === undefined) return;
  const lang = root.documentElement.lang;
  const running = fromTutor(root.location.href);
  const updates = new Map<string, () => void>();
  for (const exercise of page.exercises) {
    const element = root.getElementById(exercise.id);
    if (!element) continue;
    const button = root.createElement("button");
    button.type = "button";
    button.className = "explainer-help";
    const label = root.createElement("span");
    // below an exercise without the row of the shared questions (a component)
    const own = root.createElement("p");
    own.className = "explainer-help-row";
    const note = root.createElement("p");
    note.className = "explainer-help-note";
    const text = root.createElement("small");
    const { status, field } = statusAndField(root, message(lang, "stuckLabel"));
    note.append(text, " ", status, field);
    const place = () => {
      // the row of the shared questions, or the one with "Prüfen" under an exercise component; never one in a
      // component's island, whose DOM Vue owns: a button there makes the hydration mismatch, and each new render drops
      // it (#83)
      const row = element.classList.contains("explainer-component")
        ? element.querySelector<HTMLElement>(":scope > form.explainer-component-form > .question-actions")
        : element.querySelector<HTMLElement>(".question-actions");
      if (row) {
        row.append(" ", button);
        own.remove();
      } else {
        own.append(button);
        element.append(own);
      }
      element.append(note);
    };
    const n = () => (exercise.numbered ? numberFromAddress(root.location.href, exercise.id) : undefined);
    let mode: "help" | "why" | "back" = "help";
    const update = () => {
      const way = choice.get();
      const shown = running || way !== undefined;
      button.hidden = !shown;
      own.hidden = !shown;
      const state = progress.state(exercise.id, n());
      const done = state.rightAt !== undefined || state.revealed;
      mode = running && done ? "back" : state.attempts > 0 && !done ? "why" : "help";
      const name = running ? message(lang, "tutorSomeone") : nameOf(way, lang);
      label.textContent = message(lang, mode === "back" ? "helpBack" : mode === "why" ? "helpWhy" : "help");
      button.setAttribute(
        "aria-label",
        message(lang, mode === "back" ? "helpBackLabel" : mode === "why" ? "helpWhyLabel" : "helpLabel", { name }),
      );
      button.replaceChildren(iconOf(root, way), label);
      button.classList.toggle("explainer-help-why", mode === "why");
      button.classList.toggle("explainer-help-back", mode === "back");
      text.textContent =
        mode !== "why" ? "" : running ? message(lang, "stuckPrivacyCopy") : message(lang, "stuckPrivacy", { name });
      note.hidden = !shown || (mode !== "why" && field.hidden && status.textContent === "");
    };
    const stuck = () => {
      const href = root.location.href;
      const number = n();
      return {
        exercise: exercise.id,
        ...(number === undefined ? {} : { number }),
        state: progress.state(exercise.id, number),
        // a new chat gets the learner's needs; a running one has them (dec-tutor-needs)
        tutor: tutorAddress(
          href,
          data,
          running
            ? taskQuery(href, page, exercise.id)
            : withNeeds(taskQuery(href, page, exercise.id), chosenNeeds(data.storage)),
        ),
      };
    };
    button.addEventListener("click", () => {
      note.hidden = false;
      if (mode === "back") {
        const name = chatName(data, lang);
        const line = resultOf(root.location.href, lang, data, progress, exercise.id);
        if (line === undefined) status.textContent = message(lang, "backToTutorOpen", { name });
        else {
          copyForChat(root, line, button, status, field, {
            copied: message(lang, "backToTutorCopied", { name }),
            failed: message(lang, "backToTutorFailed", { name }),
          });
        }
        return;
      }
      if (running) {
        const name = chatName(data, lang);
        copyForChat(root, stuckLines(stuck(), lang), button, status, field, {
          copied: message(lang, "stuckCopied", { name }),
          failed: message(lang, "stuckFailed", { name }),
        });
        return;
      }
      const way = choice.get();
      const prompt = () => withLanguage(stuckPrompt(stuck(), lang), chosenNeeds(data.storage), lang);
      const copy = () => withMarkdown(prompt(), data, root.location.href);
      openAssistant(root, way, { start: prompt, copy, placeholder: data.placeholder }, (copied) => {
        status.textContent = copied === undefined ? "" : copied ? data.copied : data.failed;
      });
    });
    place();
    update();
    // a generated exercise and a component show a new task in place: the button goes back into its row
    element.addEventListener(SHOWN_EVENT, () => {
      place();
      update();
    });
    updates.set(exercise.id, update);
  }
  progress.listen((id) => updates.get(id)?.());
  choice.listen(() => {
    for (const update of updates.values()) update();
  });
}

/** Shows in `hint` how the chosen option works when it says so (data-hint, a way that needs pasting); else hides it. */
function showHint(select: HTMLSelectElement, hint: HTMLElement | null): void {
  if (!hint) return;
  const text = select.selectedOptions[0]?.dataset["hint"] ?? "";
  hint.textContent = text;
  hint.hidden = text === "";
}

/**
 * The choice of the learner's assistant on the start page: "Keiner", the app's assistants and copying the text, shown
 * once the client module runs; a choice is kept on the device at once (WayChoice), "Keiner" switches the tutor off.
 */
function startChoice(root: Document): void {
  const select = root.querySelector<HTMLSelectElement>("select.explainer-tutor-choose");
  const box = select?.closest<HTMLElement>(".explainer-tutor-choice");
  if (!select || !box) return;
  const storage = createStorage(select.dataset["storage"] ?? "explainer");
  const stored = storage.load(WAY_KEY, isText);
  const names = [...select.options].map((option) => option.value);
  select.value = stored !== undefined && names.includes(stored) ? stored : "";
  const hint = box.nextElementSibling instanceof HTMLElement ? box.nextElementSibling : null;
  const explain = () => showHint(select, hint);
  select.addEventListener("change", () => {
    if (select.value === "") storage.remove(WAY_KEY);
    else storage.save(WAY_KEY, select.value);
    explain();
  });
  explain();
  box.hidden = false;
}

/**
 * The choice of the learner's needs on the start page (dec-tutor-needs): a box per need, the first language once
 * `andere-muttersprache` is ticked, and whether the choice holds for every explainer or for this app only; shown once
 * the client module runs, and kept on the device at once as a setting (createSettings), where the learner said.
 */
function startNeeds(root: Document): void {
  const box = root.querySelector<HTMLFieldSetElement>("fieldset.explainer-tutor-needs");
  if (!box) return;
  const settings = createSettings(box.dataset["storage"] ?? "explainer", ARCHETYPE);
  const boxes = [...box.querySelectorAll<HTMLInputElement>("input.explainer-tutor-need")];
  const scopes = [...box.querySelectorAll<HTMLInputElement>("input.explainer-tutor-needs-scope")];
  const language = box.querySelector<HTMLSelectElement>("select.explainer-tutor-language");
  const languageBox = language?.closest<HTMLElement>(".explainer-tutor-language-choice");
  const stored = settings.load(NEEDS_KEY, isNeedsChoice);
  for (const input of boxes) input.checked = stored?.value.needs.includes(input.value as Need) === true;
  const where: SettingScope = stored?.scope === "app" ? "app" : "archetype";
  for (const input of scopes) input.checked = input.value === where;
  if (language) {
    const tags = [...language.options].map((option) => option.value);
    const tag = stored?.value.language;
    language.value = tag !== undefined && tags.includes(tag) ? tag : "";
  }
  const showLanguage = () => {
    if (languageBox) languageBox.hidden = !boxes.some((input) => input.checked && input.value === OTHER_LANGUAGE);
  };
  const save = () => {
    const needs = boxes.filter((input) => input.checked).map((input) => input.value as Need);
    const tag = language?.value ?? "";
    const choice: NeedsChoice = { needs, ...(tag !== "" && needs.includes(OTHER_LANGUAGE) ? { language: tag } : {}) };
    const scope: SettingScope = scopes.find((input) => input.checked)?.value === "app" ? "app" : "archetype";
    settings.save(NEEDS_KEY, choice, scope);
    showLanguage();
  };
  box.addEventListener("change", save);
  showLanguage();
  box.hidden = false;
}

/**
 * "Mit einem KI-Tutor lernen", way A, beside the title of a content page. While no way is switched on, it stays
 * folded; unfolded, a select of the app's assistants and copying the text, and "Einschalten", which keeps the way on
 * the device (WayChoice). Once a way is on, a bar takes its place: "Mit <name> lernen", with the assistant's symbol;
 * the start page changes the way or switches it off. The bar's button does the way: it opens the assistant with the
 * start prompt in its address, the page's tutor page with the page's task numbers (prompt.ts, pageQuery), for a
 * tutor who leads through the page before it comes to a task; or it copies the prompt with the tutor page's Markdown, and opens
 * an assistant whose address takes no prompt. On a page a tutor opened (via=tutor) the chat runs already: the section
 * stays hidden. Nothing goes over the network but the click's own page, the tutor page's Markdown (the app's own
 * static file, for copying) and the assistant that opens.
 */
function startTutor(root: Document, data: TutorData, choice: WayChoice): void {
  const section = root.querySelector<HTMLElement>(".explainer-tutor");
  if (!section) return;
  if (fromTutor(root.location.href)) {
    section.hidden = true;
    return;
  }
  const off = section.querySelector<HTMLDetailsElement>("details.explainer-tutor-off");
  const bar = section.querySelector<HTMLElement>(".explainer-tutor-bar");
  const way = section.querySelector<HTMLElement>(".explainer-tutor-way");
  const select = section.querySelector<HTMLSelectElement>(".explainer-tutor-select");
  const on = section.querySelector<HTMLButtonElement>(".explainer-tutor-on");
  const go = section.querySelector<HTMLButtonElement>(".explainer-tutor-go");
  const status = section.querySelector<HTMLElement>(".explainer-tutor-status");
  if (!off || !bar || !way || !select || !on || !go) return;
  let reset: ReturnType<typeof setTimeout> | undefined;
  // the button's second text, in the button only while it says "kopiert"
  const done = root.createElement("span");
  done.className = "explainer-tutor-go-done";
  const say = (text: string, state?: "ok" | "failed") => {
    clearTimeout(reset);
    bar.toggleAttribute("data-done", state === "ok");
    if (state === "ok") go.append(done);
    else done.remove();
    if (!status) return;
    status.textContent = text;
    if (state === undefined) delete status.dataset["state"];
    else status.dataset["state"] = state;
    // the button says "kopiert" for a while: then it is the plain one again
    if (state === "ok") reset = setTimeout(() => say(""), DONE_MS);
  };
  way.hidden = false;
  const hint = section.querySelector<HTMLElement>(".explainer-tutor-hint");
  select.addEventListener("change", () => showHint(select, hint));
  showHint(select, hint);
  const plain = section.querySelector<HTMLElement>(".explainer-tutor-plain");
  if (plain) plain.hidden = true;
  const show = () => {
    const chosen = choice.get();
    off.hidden = chosen !== undefined;
    bar.hidden = chosen === undefined;
    if (chosen === undefined) return;
    const text = root.createElement("span");
    text.className = "explainer-tutor-go-text";
    text.textContent = chosen.url === undefined ? data.copy : data.go.replace("{name}", chosen.name);
    done.textContent = data.done.replace("{name}", nameOf(chosen, root.documentElement.lang));
    go.replaceChildren(iconOf(root, chosen), text);
  };
  show();
  choice.listen(show);
  on.addEventListener("click", () => {
    off.open = false;
    choice.set(select.value);
    say("");
    go.focus();
  });

  // the prompt's address starts at the root of the language tree, whichever page the section is on
  const tree = new URL(data.root, root.location.href).href;
  /** The start prompt: the page's tutor page with the page's task numbers and the learner's needs. */
  const start = (): string => {
    const text = data.start.split(data.base).join(tree);
    const { page } = data;
    const needs = chosenNeeds(data.storage);
    const query = withNeeds(page === undefined ? "" : pageQuery(root.location.href, page), needs);
    return withLanguage(text.split(data.query).join(query), needs, root.documentElement.lang);
  };
  const whole = () => withMarkdown(start(), data, root.location.href);
  go.addEventListener("click", () => {
    const chosen = choice.get();
    openAssistant(root, chosen, { start, copy: whole, placeholder: data.placeholder }, (copied) => {
      say(
        copied === undefined ? "" : copied ? data.copied : data.failed,
        copied === undefined ? undefined : copied ? "ok" : "failed",
      );
    });
  });
}

/** Starts the explainer on the page. */
export function startExplainer(root: Document = document): void {
  root.documentElement.classList.add("explainer-js");
  const main = root.querySelector<HTMLElement>("main");
  const tutor = tutorData(root);
  const progress = new Progress();
  // a self-assessment a tutor opened has its own "Zurück zum Tutor", with its result (assessment-client.ts)
  const assessment = root.querySelector(".explainer-assessment-nojs") !== null;
  if (main && fromTutor(root.location.href) && !assessment) startBackToTutor(root, main, tutor, progress);
  startChoice(root);
  startNeeds(root);
  if (tutor !== undefined) {
    const choice = new WayChoice(tutor.storage, tutor.ways);
    startTutor(root, tutor, choice);
    startHelp(root, tutor, progress, choice);
  }
  // an exercise component's answers, from its island
  root.addEventListener(ANSWERED_EVENT, (event) => {
    const element = event.target;
    const detail = (event as CustomEvent<{ correct?: unknown; answer?: unknown; message?: unknown } | null>).detail;
    if (!(element instanceof HTMLElement) || element.id === "" || detail === null) return;
    const text = (value: unknown) => (typeof value === "string" ? value : undefined);
    progress.answered(
      element.id,
      numberFromAddress(root.location.href, element.id),
      detail.correct === true,
      text(detail.answer),
      text(detail.message),
    );
  });
  startVideos(root);
  startAssessment(root, {
    chosen: (storage, ways) => new WayChoice(storage, ways).get(),
    needs: chosenNeeds,
    open: (way, prompts, say) => openAssistant(root, way, prompts, say),
    hint: showHint,
    running: fromTutor(root.location.href),
    back: (text, button, place, storage, ways) => {
      const lang = root.documentElement.lang;
      const { status, field } = statusAndField(root, message(lang, "resultLabel"));
      place.querySelector(":scope > .explainer-assessment-back-status")?.remove();
      const line = root.createElement("p");
      line.className = "explainer-assessment-back-status";
      line.append(status, field);
      place.append(line);
      const name = chatName({ storage, ways }, lang);
      copyForChat(root, text, button, status, field, {
        copied: message(lang, "backToTutorCopied", { name }),
        failed: message(lang, "backToTutorFailed", { name }),
      });
    },
  });
  for (const script of root.querySelectorAll<HTMLScriptElement>("script.explainer-exercise-data")) {
    const element = script.parentElement;
    if (!element) continue;
    const data = JSON.parse(script.textContent ?? "{}") as ExerciseData;
    if (data.kind === "question") {
      const item = element.querySelector<HTMLElement>(".question");
      if (!item) continue;
      // the question shows the same as its "Lösung" once it is answered
      const solution = element.querySelector<HTMLElement>(":scope > details.explainer-solution");
      if (solution) solution.hidden = true;
      const { rendered, question, lang } = data;
      const id = element.id;
      startQuestion(item, question, {
        lang,
        retry: true,
        format: (text) => rendered[text] ?? escape(text),
        onAnswer: (answer, right, said) =>
          progress.answered(id, undefined, right, answerShown(question, answer, lang), said),
        onReveal: () => progress.revealed(id, undefined),
      });
    } else startGenerated(element, data, progress);
  }
}
