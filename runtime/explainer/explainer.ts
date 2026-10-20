// The client module of an explainer (@lernapps/app-templates/explainer), loaded by every page from the app's
// src/main.ts. Every page is complete without JavaScript; this module only adds: it marks the page as running with
// JavaScript (class explainer-js on <html>) and makes its exercises live. Every exercise is answered before its
// solution shows: a wrong answer gets its reason and may be tried again, and the solution shows after the right
// answer or "Lösung zeigen" (startQuestion of the quiz runtime with retry). A question of one of the quiz's types gets
// the quiz's controls, "Prüfen" and its feedback; its "Lösung" for readers without JavaScript goes, as the question
// shows the same after the answer. A generated exercise gets a live task: from the seed in the address when the
// address names its task number (?<exercise>=<n>), else from a random one; its seed from the exercise's table
// of distinct tasks (tasks.ts), "Aufgabe Nr. <n>" above it; the quiz's controls, checker and feedback through its
// comparator, the message of a typical mistake, and "Neue Aufgabe", which moves to the next task number; the address
// always holds the task number of every exercise of the page. Its worked tasks, with their solutions, stay hidden with
// JavaScript, unless the exercise asks for them (workedTasks: always): then they show below the live task once the
// learner has solved it or asked for its solution. A page a tutor opened (von=tutor in the address, beside any seed) gets "Zurück zum Tutor",
// which closes the tab; the start page's "Mit einem KI-Tutor lernen" copies the tutor prompt or opens an assistant
// with it on a click (a page's button also gives it the tasks of the page's address); the learner's chosen way to the
// tutor is the only thing kept on the device.
import { moveFocus } from "@lernapps/tooling/a11y";
import { createStorage } from "@lernapps/tooling/storage";
import { startQuestion } from "../shared/questions/engine.ts";
import { renderQuestion } from "../shared/questions/render.ts";
import { questionId } from "../shared/questions/question.ts";
import type { ExerciseData } from "./exercises.ts";
import { diagnose, figureOf, generate, hintOf, questionFor, stepsOf, taskText } from "./generated.ts";
import { message } from "./messages.ts";
import { pageTutorText } from "./tutorpage.ts";
import { addressOf, nextTaskNumber, numberFromAddress, randomTaskNumber, taskNumber } from "./tasks.ts";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Makes a generated exercise live: a task from a seed, checked by the quiz runtime, and "Neue Aufgabe". */
function startGenerated(element: HTMLElement, data: Extract<ExerciseData, { kind: "generated" }>): void {
  const live = element.querySelector<HTMLElement>(".explainer-live");
  if (!live) return;
  const { spec, templates, lang, texts } = data;
  // the worked tasks with their solutions: hidden with JavaScript (the learner gets new tasks), unless the exercise
  // asks for them (workedTasks: always), then once the learner has solved a live task or asked for its solution
  const worked = [...element.querySelectorAll<HTMLElement>(".explainer-worked-intro, .explainer-worked")];
  for (const part of worked) part.hidden = true;
  const showWorked = () => {
    if (data.showWorked) for (const part of worked) part.hidden = false;
  };
  const { seeds } = data;
  const count = Math.max(seeds.length, 1);
  const from = numberFromAddress(location.href, spec.id);
  let number = from === undefined ? randomTaskNumber(count) : taskNumber(from, count);
  // the address always names the task shown: it is the link to share
  history.replaceState(history.state, "", addressOf(location.href, spec.id, number));

  const show = (focus: boolean) => {
    const task = generate(spec, seeds[number - 1] ?? number, data.data);
    const question = questionFor(spec, task, lang, templates);
    const figure = figureOf(spec, task, lang, templates);
    const hint = hintOf(spec, task, lang, templates);
    const steps = stepsOf(spec, task, lang, templates);
    live.innerHTML = [
      `<p class="explainer-practice">${escape(texts.practice)}</p>`,
      `<p class="explainer-task-number">${escape(texts.taskNumber.replace("{n}", String(number)))}</p>`,
      figure === undefined ? "" : `<div class="explainer-task-figure">${figure}</div>`,
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
      `<p class="explainer-new"><button type="button" class="explainer-new-task">${escape(texts.newTask)}</button></p>`,
    ].join("\n");
    live.hidden = false;
    const item = live.querySelector<HTMLElement>(`#${questionId(question)}`);
    if (item) {
      startQuestion(item, question, {
        lang,
        retry: true,
        diagnose: (answer) => diagnose(spec, task, question, answer, lang, templates),
        onReveal: showWorked,
      });
      const legend = item.querySelector<HTMLElement>("legend");
      if (focus && legend) moveFocus(legend);
    }
    live.querySelector(".explainer-new-task")?.addEventListener("click", () => {
      // the tasks of the numbers are distinct: the next number is a new task
      number = nextTaskNumber(number, count);
      history.replaceState(history.state, "", addressOf(location.href, spec.id, number));
      show(true);
    });
  };
  show(false);
}

/** Whether a tutor opened the page: von=tutor in its address, exactly so. */
export const fromTutor = (href: string): boolean => new URL(href).searchParams.get("von") === "tutor";

/** How long the page waits after window.close() before it tells the learner to close the tab. */
const CLOSE_WAIT_MS = 300;

/**
 * "Zurück zum Tutor" at the top of a page a tutor opened (von=tutor): it closes the tab, which the tutor's chat
 * opened; where the browser keeps it open (a tab the learner opened), a line says to close it. Nothing is sent.
 */
function startBackToTutor(root: Document, main: HTMLElement): void {
  const lang = root.documentElement.lang;
  const box = root.createElement("p");
  box.className = "explainer-back";
  const button = root.createElement("button");
  button.type = "button";
  button.textContent = message(lang, "backToTutor");
  const status = root.createElement("span");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  button.addEventListener("click", () => {
    status.textContent = "";
    const view = root.defaultView;
    view?.close();
    setTimeout(() => {
      if (!view?.closed) status.textContent = message(lang, "backToTutorOpen");
    }, CLOSE_WAIT_MS);
  });
  box.append(button, " ", status);
  main.prepend(box);
}

/** What the tutor section of a page gives the client module (render.ts, prompt.ts). */
interface TutorData {
  prompt: string;
  short: string;
  base: string;
  /** The root of the language tree, relative to this page. */
  root: string;
  max: number;
  storage: string;
  /** The page's tutor file, relative to the page; none on the start page. */
  file?: string;
  ways: { name: string; url: string }[];
  go: string;
  copy: string;
  copied: string;
  copiedShort: string;
  failed: string;
  pageHeading: string;
  pageNow: string;
  pageFile: string;
  shortNote: string;
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

/** The key the chosen way to the tutor is kept under on the device: an assistant's name, or COPY. */
const WAY_KEY = "tutor-way";
const COPY = "copy";
const isText = (value: unknown): value is string => typeof value === "string";

/**
 * "Mit einem KI-Tutor lernen": one button with a select beside it. The select holds the assistants of the app and
 * "Prompt kopieren"; the first assistant is the default, and a way the learner picks is kept on the device
 * (@lernapps/tooling/storage) and is the default from then on. The button does the chosen way: it opens the assistant
 * with the prompt in its address, or, when that address would be too long, with a short prompt that points to the tutor
 * files, and the whole prompt is copied as well; or it only copies the prompt. On a page the prompt gets the page
 * and the tasks its address names (tutorpage.ts). Nothing goes over the network but the click's own page, the page's
 * tutor file (the app's own static file) and the assistant that opens.
 */
function startTutor(root: Document): void {
  const section = root.querySelector<HTMLElement>(".explainer-tutor");
  const script = section?.querySelector("script.explainer-tutor-prompt");
  if (!section || !script) return;
  const data = JSON.parse(script.textContent ?? "{}") as TutorData;
  const status = section.querySelector<HTMLElement>(".explainer-tutor-status");
  const say = (text: string) => {
    if (status) status.textContent = text;
  };
  const way = section.querySelector<HTMLElement>(".explainer-tutor-way");
  const go = section.querySelector<HTMLButtonElement>(".explainer-tutor-go");
  const select = section.querySelector<HTMLSelectElement>(".explainer-tutor-select");
  if (!way || !go || !select) return;
  const storage = createStorage(data.storage);
  const stored = storage.load(WAY_KEY, isText);
  const names = [...data.ways.map((provider) => provider.name), COPY];
  select.selectedIndex = stored !== undefined && names.includes(stored) ? names.indexOf(stored) : 0;
  const chosen = () => data.ways[select.selectedIndex];
  const label = () => {
    const provider = chosen();
    go.textContent = provider === undefined ? data.copy : data.go.replace("{name}", provider.name);
  };
  label();
  select.addEventListener("change", () => {
    storage.save(WAY_KEY, names[select.selectedIndex] ?? COPY);
    label();
  });
  way.hidden = false;
  const plain = section.querySelector<HTMLElement>(".explainer-tutor-plain");
  if (plain) plain.hidden = true;

  // the prompt's links start at the root of the language tree, whichever page the section is on
  const tree = new URL(data.root, root.location.href).href;
  const resolve = (text: string) => text.split(data.base).join(tree);
  /** The whole prompt and the short one, with the page and its tasks when the section is on a page. */
  const build = async (): Promise<{ full: string; short: string }> => {
    const full = resolve(data.prompt);
    const short = resolve(data.short);
    if (data.file === undefined) return { full, short: `${short}\n\n${data.shortNote}` };
    const href = root.location.href;
    const file = new URL(data.file, href).href;
    let text: string | undefined;
    try {
      const response = await fetch(file);
      if (response.ok) text = await response.text();
    } catch {
      // the page's tutor file is not reachable: the prompt names it instead
    }
    const now = `${data.pageNow} ${href}`;
    const page = [
      "",
      `## ${data.pageHeading}`,
      "",
      now,
      "",
      text === undefined ? `${data.pageFile} ${file}` : pageTutorText(text, href),
    ];
    return {
      full: `${full}${page.join("\n")}\n`,
      short: `${short}\n\n${[now, `${data.pageFile} ${file}`, data.shortNote].join("\n")}`,
    };
  };
  go.addEventListener("click", () => {
    const provider = chosen();
    const template = provider?.url;
    // the window opens at the click, which a browser allows; the address follows once the prompt is built
    const opened = template === undefined ? null : root.defaultView?.open("", "_blank");
    if (opened) opened.opener = null;
    void build().then(async ({ full, short }) => {
      const done = (copied: boolean, text: string) => say(copied ? text : data.failed);
      const withPrompt = (prompt: string) => (template ?? "").split("{prompt}").join(encodeURIComponent(prompt));
      if (template === undefined || !template.includes("{prompt}")) {
        done(await copyText(full), data.copied);
        if (template !== undefined) {
          if (opened) opened.location.href = template;
          else root.defaultView?.open(template, "_blank", "noopener");
        }
        return;
      }
      let address = withPrompt(full);
      if (address.length > data.max) {
        // the assistant gets the short prompt; the whole one is on the clipboard for the learner to paste
        address = withPrompt(short);
        // an app with very many pages: the list of every tutor file goes, the first line and the page's files stay
        if (address.length > data.max) address = withPrompt(short.replace(/\n\n[\s\S]*?(?=\n\n|$)/, ""));
        done(await copyText(full), data.copiedShort);
      } else say("");
      if (opened) opened.location.href = address;
      else root.defaultView?.open(address, "_blank", "noopener");
    });
  });
}

/** Starts the explainer on the page. */
export function startExplainer(root: Document = document): void {
  root.documentElement.classList.add("explainer-js");
  const main = root.querySelector<HTMLElement>("main");
  if (main && fromTutor(root.location.href)) startBackToTutor(root, main);
  startTutor(root);
  for (const script of root.querySelectorAll<HTMLScriptElement>("script.explainer-exercise-data")) {
    const element = script.parentElement;
    if (!element) continue;
    const data = JSON.parse(script.textContent ?? "{}") as ExerciseData;
    if (data.kind === "question") {
      const item = element.querySelector<HTMLElement>(".quiz-question");
      if (!item) continue;
      // the question shows the same as its "Lösung" once it is answered
      const solution = element.querySelector<HTMLElement>(":scope > details.explainer-solution");
      if (solution) solution.hidden = true;
      const { rendered } = data;
      startQuestion(item, data.question, {
        lang: data.lang,
        retry: true,
        format: (text) => rendered[text] ?? escape(text),
      });
    } else startGenerated(element, data);
  }
}
