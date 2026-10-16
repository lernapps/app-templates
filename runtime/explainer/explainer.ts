// The client module of an explainer (@lernapps/app-templates/explainer), loaded by every page from the app's
// src/main.ts. Every page is complete without JavaScript; this module only adds: it marks the page as running with
// JavaScript (class explainer-js on <html>) and makes its exercises live. Every exercise is answered before its
// solution shows: a wrong answer gets its reason and may be tried again, and the solution shows after the right
// answer or "Lösung zeigen" (startQuestion of the quiz runtime with retry). A question of one of the quiz's types gets
// the quiz's controls, "Prüfen" and its feedback; its "Lösung" for readers without JavaScript goes, as the question
// shows the same after the answer. A generated exercise gets a live task: from the seed in the address when the
// address names it (?seed=<n>#<exercise>), else from a task number of 1 to TASK_NUMBERS (tasks.ts); "Aufgabe Nr. <n>"
// above it; the quiz's controls, checker and feedback through its comparator, the message of a typical mistake, and
// "Neue Aufgabe", which moves to the next task number and writes it into the address. Its worked tasks, with their
// solutions, show below the live task once the learner has solved it or asked for its solution. Nothing is stored.
import { moveFocus } from "@lernapps/tooling/a11y";
import { startQuestion } from "../quiz/engine.ts";
import { renderQuestion } from "../quiz/render.ts";
import { questionId } from "../quiz/quiz.ts";
import type { ExerciseData } from "./exercises.ts";
import { diagnose, figureOf, generate, hintOf, questionFor, stepsOf, taskKey, taskText } from "./generated.ts";
import { addressOf, nextTaskNumber, randomTaskNumber, seedFromAddress, TASK_NUMBERS } from "./tasks.ts";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Makes a generated exercise live: a task from a seed, checked by the quiz runtime, and "Neue Aufgabe". */
function startGenerated(element: HTMLElement, data: Extract<ExerciseData, { kind: "generated" }>): void {
  const live = element.querySelector<HTMLElement>(".explainer-live");
  if (!live) return;
  const { spec, templates, lang, texts } = data;
  // the worked tasks with their solutions, once the learner has solved a live task or asked for its solution
  const worked = [...element.querySelectorAll<HTMLElement>(".explainer-worked-intro, .explainer-worked")];
  for (const part of worked) part.hidden = true;
  const showWorked = () => {
    for (const part of worked) part.hidden = false;
  };
  let seed = seedFromAddress(location.href, spec.id) ?? randomTaskNumber();

  const show = (focus: boolean) => {
    const task = generate(spec, seed, data.data);
    const question = questionFor(spec, task, lang, templates);
    const figure = figureOf(spec, task, lang, templates);
    const hint = hintOf(spec, task, lang, templates);
    const steps = stepsOf(spec, task, lang, templates);
    live.innerHTML = [
      `<p class="explainer-practice">${escape(texts.practice)}</p>`,
      `<p class="explainer-task-number">${escape(texts.taskNumber.replace("{n}", String(seed)))}</p>`,
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
      const before = taskKey(spec, task, lang, templates);
      for (let tries = 0; tries < TASK_NUMBERS; tries++) {
        seed = nextTaskNumber(seed);
        if (taskKey(spec, generate(spec, seed, data.data), lang, templates) !== before) break;
      }
      history.replaceState(history.state, "", addressOf(location.href, spec.id, seed));
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
      if (!item) continue;
      // the question shows the same as its "Lösung" once it is answered
      const solution = element.querySelector<HTMLElement>(":scope > details.explainer-solution");
      if (solution) solution.hidden = true;
      startQuestion(item, data.question, { lang: data.lang, retry: true });
    } else startGenerated(element, data);
  }
}
