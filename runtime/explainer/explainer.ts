// The client module of an explainer (@lernapps/app-templates/explainer), loaded by every page from the app's
// src/main.ts. Every page is complete without JavaScript; this module only adds: it marks the page as running with
// JavaScript (class explainer-js on <html>) and makes its exercises live. A question of one of the quiz's types gets
// the quiz's controls, "Prüfen" and its feedback (startQuestion of the quiz runtime). A generated exercise gets a live
// task under its worked tasks: from the seed in the address when the address names it (?seed=<n>#<exercise>), else
// from a new one; the quiz's controls, checker and feedback through its comparator, the message of a typical mistake,
// and "Neue Aufgabe", which draws the next task and writes its seed into the address. Nothing is stored.
import { moveFocus } from "@lernapps/tooling/a11y";
import { startQuestion } from "../quiz/engine.ts";
import { renderQuestion } from "../quiz/render.ts";
import { questionId } from "../quiz/quiz.ts";
import type { ExerciseData } from "./exercises.ts";
import {
  diagnose,
  figureOf,
  generate,
  hintOf,
  nextSeed,
  questionFor,
  stepsOf,
  taskKey,
  taskText,
} from "./generated.ts";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The seed the address gives the exercise `id` (?seed=<n>#<id>), if it names it. */
function seedFromAddress(id: string): number | undefined {
  const url = new URL(location.href);
  const seed = Number(url.searchParams.get("seed"));
  return decodeURIComponent(url.hash.slice(1)) === id && Number.isInteger(seed) && seed > 0 ? seed : undefined;
}

/** Makes a generated exercise live: a task from a seed, checked by the quiz runtime, and "Neue Aufgabe". */
function startGenerated(element: HTMLElement, data: Extract<ExerciseData, { kind: "generated" }>): void {
  const live = element.querySelector<HTMLElement>(".explainer-live");
  if (!live) return;
  const { spec, templates, lang, texts } = data;
  let seed = seedFromAddress(spec.id) ?? 1 + Math.floor(Math.random() * 999_983);

  const show = (focus: boolean) => {
    const task = generate(spec, seed, data.data);
    const question = questionFor(spec, task, lang, templates);
    const figure = figureOf(spec, task, lang, templates);
    const hint = hintOf(spec, task, lang, templates);
    const steps = stepsOf(spec, task, lang, templates);
    live.innerHTML = [
      `<p class="explainer-practice">${escape(texts.practice)}</p>`,
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
        diagnose: (answer) => diagnose(spec, task, question, answer, lang, templates),
      });
      const legend = item.querySelector<HTMLElement>("legend");
      if (focus && legend) moveFocus(legend);
    }
    live.querySelector(".explainer-new-task")?.addEventListener("click", () => {
      const before = taskKey(spec, task, lang, templates);
      for (let tries = 0; tries < 20; tries++) {
        seed = nextSeed(seed);
        if (taskKey(spec, generate(spec, seed, data.data), lang, templates) !== before) break;
      }
      const url = new URL(location.href);
      url.searchParams.set("seed", String(seed));
      url.hash = spec.id;
      history.replaceState(history.state, "", url);
      show(true);
    });
  };
  show(false);
}

/** Starts the explainer on the page. */
export function startExplainer(root: Document = document): void {
  root.documentElement.classList.add("explainer-js");
  for (const script of root.querySelectorAll<HTMLScriptElement>("script.explainer-exercise-data")) {
    const element = script.parentElement;
    if (!element) continue;
    const data = JSON.parse(script.textContent ?? "{}") as ExerciseData;
    if (data.kind === "question") {
      const item = element.querySelector<HTMLElement>(".quiz-question");
      if (item) startQuestion(item, data.question, { lang: data.lang });
    } else startGenerated(element, data);
  }
}
